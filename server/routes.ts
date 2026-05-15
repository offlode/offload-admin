import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { log } from "./index";
// Seed data disabled: admin panel now reads production API data.
import crypto from "crypto";
import { promisify } from "util";
import { Resend } from "resend";

const scryptAsync = promisify(crypto.scrypt);

// ── In-memory session store ──────────────────────────────────────────────────
interface Session {
  userId: number;
  username: string;
  name: string;
  role: string;
  vendorId: number | null;
  createdAt: number;
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Pass-through for order status patch — no transformation needed since admin
// now sends canonical status values directly.
function normalizeOrderStatusPatch(body: Record<string, unknown>) {
  return body;
}
const sessions = new Map<string, Session>();

function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(pw, salt, 64)) as Buffer;
  // Match API format: scrypt:<salt>:<hash> (3 parts)
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // New API format: scrypt:<salt>:<hash> (preferred — written by main API + bootstrap)
  if (stored.startsWith("scrypt:")) {
    const [, salt, hash] = stored.split(":");
    const derivedKey = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return derivedKey.toString("hex") === hash;
  }
  // Legacy admin format: <salt>:<hash> (2 parts) — for old admin-created users
  if (stored.includes(":")) {
    const [salt, hash] = stored.split(":");
    const derivedKey = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return derivedKey.toString("hex") === hash;
  }
  // Legacy SHA-256 fallback for migration
  const sha256 = crypto.createHash("sha256").update(supplied).digest("hex");
  return sha256 === stored;
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000); // every hour

// ── Rate limiting (login endpoint) ──────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // max 5 attempts per window

interface RateLimitEntry {
  count: number;
  windowStart: number;
}
const loginAttempts = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // blocked
  }
  entry.count++;
  return true; // allowed
}

function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
  for (const [ip, entry] of forgotPasswordAttempts.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      forgotPasswordAttempts.delete(ip);
    }
  }
}, 15 * 60 * 1000);

// ── Rate limiting (forgot-password endpoint) ──────────────────────────────
const FORGOT_PW_RATE_LIMIT_MAX = 3; // 3 requests per 15 min per IP
const forgotPasswordAttempts = new Map<string, RateLimitEntry>();

function checkForgotPasswordRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = forgotPasswordAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    forgotPasswordAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= FORGOT_PW_RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

// ── Resend email client ───────────────────────────────────────────────────
// ── Auth middleware ──────────────────────────────────────────────────────────
const SESSION_COOKIE = "admin_session";

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const sessionId =
    req.cookies?.[SESSION_COOKIE] ||
    (req.headers["x-session-id"] as string | undefined);

  if (!sessionId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    res.status(401).json({ message: "Session expired" });
    return;
  }

  // Enforce allowed roles
  const allowedRoles = ["admin", "super_admin", "manager", "laundromat_owner"];
  if (!allowedRoles.includes(session.role)) {
    res.status(403).json({ message: "Forbidden: admin access required" });
    return;
  }

  // Attach user info to request for downstream use
  (req as any).adminUser = session;
  next();
}

function requireVendorScoped(req: Request, res: Response, next: NextFunction): void {
  const adminUser = (req as any).adminUser as Session | undefined;
  if (!adminUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  // super_admin and admin bypass scoping
  if (adminUser.role === "super_admin" || adminUser.role === "admin") {
    next();
    return;
  }
  // manager and laundromat_owner are scoped to their vendorId
  const userVendorId = (adminUser as any).vendorId;
  if (!userVendorId) {
    res.status(403).json({ message: "Forbidden: no vendor association" });
    return;
  }
  (req as any).scopedVendorId = userVendorId;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "offload-admin",
      timestamp: new Date().toISOString(),
    });
  });

  // ── Security headers ─────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // ── Cookie parser (simple, no external dep) ──────────────────────────────
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((pair) => {
      const [k, ...vs] = pair.trim().split("=");
      if (k) cookies[k.trim()] = decodeURIComponent(vs.join("=").trim());
    });
    (req as any).cookies = cookies;
    next();
  });

  // ── Seed database disabled in production admin ───────────────────────────

  // ── Auth endpoints (no requireAdmin) ─────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    if (!checkRateLimit(ip)) {
      res
        .status(429)
        .json({ message: "Too many login attempts. Please try again later." });
      return;
    }

    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    // Support login by email or username
    const userByUsername = await storage.getUserByUsername(username);
    const user = userByUsername || await storage.getUserByEmail(username);
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const passwordMatch = await comparePasswords(password, user.password);

    if (passwordMatch) {
      // Successful login — reset rate limit
      resetRateLimit(ip);

      // Only admin/super_admin/manager/laundromat_owner roles can access admin panel
      if (!["admin", "super_admin", "manager", "laundromat_owner"].includes(user.role)) {
        res.status(403).json({ message: "Admin access required" });
        return;
      }

      // If legacy SHA-256 password, migrate to scrypt on successful login
      if (!user.password.includes(":")) {
        const newHash = await hashPassword(password);
        await storage.updateUser(user.id, { password: newHash });
      }

      const sessionId = generateSessionId();
      sessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        vendorId: (user as any).vendorId ?? null,
        createdAt: Date.now(),
      });

      // Set session cookie
      res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=${sessionId}; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
      );

      res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.get("/api/auth/me", requireAdmin, (req, res) => {
    const adminUser = (req as any).adminUser as Session;
    res.json({
      id: adminUser.userId,
      username: adminUser.username,
      name: adminUser.name,
      role: adminUser.role,
    });
  });

  app.post("/api/auth/logout", requireAdmin, (req, res) => {
    const sessionId =
      (req as any).cookies?.[SESSION_COOKIE] ||
      (req.headers["x-session-id"] as string | undefined);
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}; SameSite=Strict; Path=/; Max-Age=0`
    );
    res.json({ success: true });
  });

  // ── Forgot Password (public, no requireAdmin) ──
  const forgotPwLimits = new Map<string, { count: number; resetAt: number }>();
  app.post("/api/auth/forgot-password", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const limit = forgotPwLimits.get(ip);
    if (limit && now < limit.resetAt && limit.count >= 3) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    if (!limit || now >= limit.resetAt) {
      forgotPwLimits.set(ip, { count: 1, resetAt: now + 900000 });
    } else {
      limit.count++;
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const successMsg = { message: "If an account with that email exists, a password reset link has been sent." };

    // Look up by email or username
    const userByEmail = await storage.getUserByEmail(email);
    const user = userByEmail || await storage.getUserByUsername(email);
    if (!user) return res.json(successMsg);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    await storage.createPasswordResetToken(user.id, token, expiresAt);

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const resetUrl = `${req.protocol}://${req.get("host")}/#/reset-password?token=${token}`;
        resend.emails.send({
          from: "Offload Admin <notifications@offloadusa.com>",
          to: user.email || email,
          subject: "Reset your Offload Admin password",
          html: `<div style="font-family:Inter,Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
            <h1 style="color:#5B4BC4;font-size:24px;text-align:center;">Offload Admin</h1>
            <h2 style="color:#1A1A1A;font-size:18px;">Reset your password</h2>
            <p style="color:#555;font-size:14px;">Click below to reset your password:</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="background:#5B4BC4;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Reset Password</a>
            </div>
            <p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>
          </div>`,
        }).then(() => log(`Admin password reset sent to user #${user.id}`, "email"))
          .catch((err: any) => log(`Failed to send reset email: ${err?.message}`, "email"));
      } catch (e) {
        log("Resend not available", "email");
      }
    } else {
      log(`Would send admin password reset to user #${user.id} (no RESEND_API_KEY)`, "email");
    }

    res.json(successMsg);
  });

  // ── Reset Password (public) ──
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const resetRecord = await storage.getPasswordResetToken(token);
    if (!resetRecord) return res.status(400).json({ message: "Invalid or expired reset link." });
    if (resetRecord.usedAt) return res.status(400).json({ message: "This link has already been used." });
    if (new Date(resetRecord.expiresAt) < new Date()) return res.status(400).json({ message: "This link has expired." });

    const newHash = await hashPassword(password);
    await storage.updateUser(resetRecord.userId, { password: newHash });
    await storage.markPasswordResetTokenUsed(token);

    // Invalidate all sessions for this user
    for (const [sid, sess] of sessions.entries()) {
      if (sess.userId === resetRecord.userId) sessions.delete(sid);
    }

    res.json({ message: "Password has been reset. You can now log in." });

  });

  // ── KPIs / Dashboard ──
  app.get("/api/dashboard/kpis", requireAdmin, async (_req, res) => {
    res.json(await storage.getKPIs());
  });

  app.get("/api/dashboard/revenue", requireAdmin, async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await storage.getRevenueByDay(days));
  });

  app.get("/api/dashboard/orders-by-status", requireAdmin, async (_req, res) => {
    res.json(await storage.getOrdersByStatus());
  });

  app.get("/api/dashboard/recent-orders", requireAdmin, async (_req, res) => {
    const recentOrders = await storage.getRecentOrders(10);
    // Enrich with customer names
    const enriched = await Promise.all(recentOrders.map(async o => {
      const customer = await storage.getCustomer(o.customerId);
      const driver = o.driverId ? await storage.getDriver(o.driverId) : null;
      return { ...o, customerName: customer?.name || "Unknown", driverName: driver?.name || "Unassigned" };
    }));
    res.json(enriched);
  });

  // ── Customers ──
  app.get("/api/customers", requireAdmin, async (_req, res) => {
    res.json(await storage.getCustomers());
  });

  app.get("/api/customers/:id", requireAdmin, requireVendorScoped, async (req, res) => {
    const customer = await storage.getCustomer(Number(String(req.params.id)));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    // Vendor-scoped users can only view customers who have ordered from their vendor
    const scopedVendorId = (req as any).scopedVendorId;
    if (scopedVendorId) {
      const allOrders = await storage.getOrders();
      const hasOrderFromVendor = allOrders.some(
        o => o.customerId === customer.id && o.vendorId === scopedVendorId
      );
      if (!hasOrderFromVendor) {
        return res.status(403).json({ message: "Forbidden: customer not associated with your vendor" });
      }
    }
    res.json(customer);
  });

  app.patch("/api/customers/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateCustomer(Number(String(req.params.id)), req.body);
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    res.json(updated);
  });

  app.get("/api/customers/:id/orders", requireAdmin, async (req, res) => {
    const allOrders = await storage.getOrders();
    const customerOrders = allOrders.filter(o => o.customerId === Number(String(req.params.id)));
    res.json(customerOrders);
  });

  app.get("/api/customers/:id/communications", requireAdmin, async (req, res) => {
    res.json(await storage.getCommunicationLog(Number(String(req.params.id))));
  });

  // ── Drivers ──
  app.get("/api/drivers", requireAdmin, async (_req, res) => {
    res.json(await storage.getDrivers());
  });

  app.get("/api/drivers/:id", requireAdmin, async (req, res) => {
    const driver = await storage.getDriver(Number(String(req.params.id)));
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.patch("/api/drivers/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateDriver(Number(String(req.params.id)), req.body);
    if (!updated) return res.status(404).json({ message: "Driver not found" });
    res.json(updated);
  });

  // ── Vendors ──
  app.get("/api/vendors", requireAdmin, async (_req, res) => {
    res.json(await storage.getVendors());
  });

  app.get("/api/vendors/:id", requireAdmin, requireVendorScoped, async (req, res) => {
    const vendor = await storage.getVendor(Number(String(req.params.id)));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    const scopedVendorId = (req as any).scopedVendorId;
    if (scopedVendorId && vendor.id !== scopedVendorId) {
      return res.status(403).json({ message: "Forbidden: vendor access denied" });
    }
    res.json(vendor);
  });

  app.patch("/api/vendors/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateVendor(Number(String(req.params.id)), req.body);
    if (!updated) return res.status(404).json({ message: "Vendor not found" });
    res.json(updated);
  });

  // ── Orders ──
  app.get("/api/orders", requireAdmin, async (_req, res) => {
    const allOrders = await storage.getOrders();
    const enriched = await Promise.all(allOrders.map(async o => {
      const customer = await storage.getCustomer(o.customerId);
      const driver = o.driverId ? await storage.getDriver(o.driverId) : null;
      const vendor = o.vendorId ? await storage.getVendor(o.vendorId) : null;
      return {
        ...o,
        customerName: customer?.name || "Unknown",
        driverName: driver?.name || "Unassigned",
        vendorName: vendor?.name || "Unassigned",
      };
    }));
    res.json(enriched);
  });

  app.get("/api/orders/:id", requireAdmin, async (req, res) => {
    const order = await storage.getOrder(Number(String(req.params.id)));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const customer = await storage.getCustomer(order.customerId);
    const driver = order.driverId ? await storage.getDriver(order.driverId) : null;
    const vendor = order.vendorId ? await storage.getVendor(order.vendorId) : null;
    const history = await storage.getOrderStatusHistory(order.id);
    res.json({
      ...order,
      customerName: customer?.name || "Unknown",
      driverName: driver?.name || "Unassigned",
      vendorName: vendor?.name || "Unassigned",
      statusHistory: history,
    });
  });

  app.patch("/api/orders/:id", requireAdmin, requireVendorScoped, async (req, res) => {
    const order = await storage.getOrder(Number(String(req.params.id)));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const scopedVendorId = (req as any).scopedVendorId;
    if (scopedVendorId && order.vendorId !== scopedVendorId) {
      return res.status(403).json({ message: "Forbidden: order does not belong to your vendor" });
    }
    const updated = await storage.updateOrder(order.id, normalizeOrderStatusPatch(req.body));
    if (!updated) return res.status(404).json({ message: "Order not found" });
    res.json(updated);
  });

  // ── Reviews ──
  app.get("/api/reviews", requireAdmin, async (_req, res) => {
    res.json(await storage.getReviews());
  });

  // ── Disputes ──
  app.get("/api/disputes", requireAdmin, async (_req, res) => {
    const allDisputes = await storage.getDisputes();
    const enriched = await Promise.all(allDisputes.map(async d => {
      const customer = await storage.getCustomer(d.customerId);
      const order = await storage.getOrder(d.orderId);
      return { ...d, customerName: customer?.name || "Unknown", orderNumber: order?.orderNumber || "N/A" };
    }));
    res.json(enriched);
  });

  app.get("/api/disputes/:id", requireAdmin, async (req, res) => {
    const dispute = await storage.getDispute(Number(String(req.params.id)));
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    const customer = await storage.getCustomer(dispute.customerId);
    const order = await storage.getOrder(dispute.orderId);
    res.json({
      ...dispute,
      customerName: customer?.name || "Unknown",
      orderNumber: order?.orderNumber || "N/A",
      orderDetails: order,
    });
  });

  app.patch("/api/disputes/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateDispute(Number(String(req.params.id)), req.body);
    if (!updated) return res.status(404).json({ message: "Dispute not found" });
    res.json(updated);
  });

  // ── Promo Codes ──
  app.get("/api/promo-codes", requireAdmin, async (_req, res) => {
    res.json(await storage.getPromoCodes());
  });

  app.post("/api/promo-codes", requireAdmin, async (req, res) => {
    try {
      const promo = await storage.createPromoCode(req.body);
      res.json(promo);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/promo-codes/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updatePromoCode(Number(String(req.params.id)), req.body);
    if (!updated) return res.status(404).json({ message: "Promo code not found" });
    res.json(updated);
  });

  // ── Transactions ──
  app.get("/api/transactions", requireAdmin, async (_req, res) => {
    res.json(await storage.getTransactions());
  });

  // ── Settings ──
  app.get("/api/settings", requireAdmin, async (_req, res) => {
    res.json(await storage.getSettings());
  });

  app.patch("/api/settings/:key", requireAdmin, async (req, res) => {
    await storage.updateSetting(String(req.params.key), req.body.value);
    res.json({ success: true });
  });

  // ── Analytics ──
  app.get("/api/analytics/overview", requireAdmin, async (_req, res) => {
    const allOrders = await storage.getOrders();
    const allCustomers = await storage.getCustomers();
    const allDrivers = await storage.getDrivers();
    const allVendors = await storage.getVendors();

    // Revenue trends (weekly for last 12 weeks)
    const weeklyRevenue: { week: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const revenue = allOrders
        .filter(o => {
          const d = new Date(o.createdAt);
          return d >= weekStart && d < weekEnd;
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);
      weeklyRevenue.push({
        week: weekStart.toISOString().split('T')[0],
        revenue: Math.round(revenue * 100) / 100,
      });
    }

    // Top zip codes
    const zipMap: Record<string, number> = {};
    allOrders.forEach(o => {
      const zip = (o as any).zipCode || (o as any).pickupZip || "unknown";
      zipMap[zip] = (zipMap[zip] || 0) + 1;
    });
    const topZips = Object.entries(zipMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([zip, count]) => ({ zip, count }));

    // Customer tier breakdown
    const tierBreakdown: Record<string, number> = {};
    allCustomers.forEach(c => {
      const tier = (c as any).tier || (c as any).loyaltyTier || "standard";
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
    });

    // Driver utilization
    const driverUtilization = allDrivers.map(d => ({
      name: d.name,
      trips: (d as any).totalTrips ?? d.completedTrips ?? d.todayTrips ?? 0,
      rating: d.rating,
      completionRate: (d as any).completionRate ?? d.onTimePickupRate ?? 0,
      utilization: d.status === "offline" ? 0 : d.status === "busy" ? 0.85 : 0.4,
    }));

    // Vendor performance
    const vendorPerformance = allVendors.map(v => ({
      name: v.name,
      healthScore: (v as any).healthScore ?? v.aiHealthScore ?? 0,
      qualityScore: v.qualityScore,
      totalOrders: (v as any).totalOrders ?? 0,
      avgProcessingTime: v.avgProcessingTime,
    }));

    // CLV distribution
    const clvBuckets = [
      { range: "$0-100", count: 0 },
      { range: "$100-500", count: 0 },
      { range: "$500-1500", count: 0 },
      { range: "$1500-3000", count: 0 },
      { range: "$3000+", count: 0 },
    ];
    allCustomers.forEach(c => {
      const spent = c.totalSpent ?? 0;
      if (spent < 100) clvBuckets[0].count++;
      else if (spent < 500) clvBuckets[1].count++;
      else if (spent < 1500) clvBuckets[2].count++;
      else if (spent < 3000) clvBuckets[3].count++;
      else clvBuckets[4].count++;
    });

    // Acquisition funnel: only the stages we can derive from real data.
    // We don't track website visits in this DB, so omit that stage rather than
    // making up a number.
    const totalUsers = allCustomers.length;
    const usersWithFirstOrder = allCustomers.filter(c => (c.totalOrders || 0) >= 1).length;
    const repeatCustomers = allCustomers.filter(c => (c.totalOrders || 0) >= 2).length;
    const subscribers = allCustomers.filter(c => !!c.subscriptionTier).length;
    const funnel = [
      { stage: "Sign Ups", count: totalUsers },
      { stage: "First Order", count: usersWithFirstOrder },
      { stage: "Repeat Customer", count: repeatCustomers },
      { stage: "Subscriber", count: subscribers },
    ];

    res.json({
      weeklyRevenue,
      topZips,
      tierBreakdown,
      driverUtilization,
      vendorPerformance,
      clvBuckets,
      funnel,
    });
  });

  return httpServer;
}
