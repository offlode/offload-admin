import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase, ensureSuperAdmin } from "./seed";
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
  createdAt: number;
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const sessions = new Map<string, Session>();

function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(pw, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Support both new scrypt format (salt:hash) and legacy SHA-256 (64 hex chars)
  if (stored.includes(":")) {
    const [salt, hash] = stored.split(":");
    const derivedKey = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return derivedKey.toString("hex") === hash;
  } else {
    // Legacy SHA-256 fallback for migration
    const sha256 = crypto.createHash("sha256").update(supplied).digest("hex");
    return sha256 === stored;
  }
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
const resend = new Resend(process.env.RESEND_API_KEY || "re_WRb6SKUJ_GCVu86o6Ju8qJPa39usgsKfz");

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

  // Attach user info to request for downstream use
  (req as any).adminUser = session;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

  // ── Seed database ────────────────────────────────────────────────────────
  seedDatabase();
  ensureSuperAdmin();

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

    const user = storage.getUserByUsername(username);
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const passwordMatch = await comparePasswords(password, user.password);

    if (passwordMatch) {
      // Successful login — reset rate limit
      resetRateLimit(ip);

      // If legacy SHA-256 password, migrate to scrypt on successful login
      if (!user.password.includes(":")) {
        const newHash = await hashPassword(password);
        storage.updateUser(user.id, { password: newHash });
      }

      const sessionId = generateSessionId();
      sessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: Date.now(),
      });

      // Set session cookie
      res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
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
      `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
    );
    res.json({ success: true });
  });

  // ── Forgot Password ────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    if (!checkForgotPasswordRateLimit(ip)) {
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    const { identifier } = req.body; // accepts email or username
    if (!identifier) {
      // Still return 200 to not leak info
      res.json({ message: "If an account with that email/username exists, a password reset link has been sent." });
      return;
    }

    // Look up user by username (which may be an email)
    const allUsers = storage.getAllUsers();
    const user = allUsers.find(
      (u) => u.username.toLowerCase() === identifier.toLowerCase()
    );

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      storage.createPasswordResetToken(user.id, token, expiresAt);

      // Build reset link (relative, works with any deployed URL)
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const resetUrl = `${protocol}://${host}/#/reset-password?token=${token}`;

      try {
        await resend.emails.send({
          from: "Offload Admin <notifications@offloadusa.com>",
          to: [user.username], // username is the email
          subject: "Reset your Offload Admin password",
          html: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; background: #5B4BC4; border-radius: 12px; width: 48px; height: 48px; line-height: 48px; text-align: center;">
                  <span style="color: white; font-size: 24px; font-weight: bold;">O</span>
                </div>
                <h1 style="color: #1a1a1a; font-size: 22px; margin: 16px 0 0; font-weight: 600;">Offload Admin</h1>
              </div>
              <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${user.name},</p>
              <p style="color: #333; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new one:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #5B4BC4; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 500;">Reset Password</a>
              </div>
              <p style="color: #666; font-size: 13px; line-height: 1.6;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
              <p style="color: #999; font-size: 12px; text-align: center;">Offload &mdash; On-demand laundry, delivered.</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("Failed to send password reset email:", e);
      }
    }

    // Always return 200 (don't leak whether account exists)
    res.json({ message: "If an account with that email/username exists, a password reset link has been sent." });
  });

  // ── Reset Password ────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ message: "Token and password are required." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters." });
      return;
    }

    const resetToken = storage.getPasswordResetToken(token);

    if (!resetToken) {
      res.status(400).json({ message: "Invalid or expired reset link." });
      return;
    }

    if (resetToken.usedAt) {
      res.status(400).json({ message: "This reset link has already been used." });
      return;
    }

    if (new Date(resetToken.expiresAt) < new Date()) {
      res.status(400).json({ message: "This reset link has expired." });
      return;
    }

    const hashedPassword = await hashPassword(password);
    storage.updateUser(resetToken.userId, { password: hashedPassword });
    storage.markPasswordResetTokenUsed(token);

    // Invalidate all sessions for this user
    for (const [sessionId, session] of sessions.entries()) {
      if (session.userId === resetToken.userId) {
        sessions.delete(sessionId);
      }
    }

    res.json({ message: "Password has been reset successfully. You can now log in." });
  });

  // ── KPIs / Dashboard ──
  app.get("/api/dashboard/kpis", requireAdmin, (_req, res) => {
    res.json(storage.getKPIs());
  });

  app.get("/api/dashboard/revenue", requireAdmin, (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    res.json(storage.getRevenueByDay(days));
  });

  app.get("/api/dashboard/orders-by-status", requireAdmin, (_req, res) => {
    res.json(storage.getOrdersByStatus());
  });

  app.get("/api/dashboard/recent-orders", requireAdmin, (_req, res) => {
    const orders = storage.getRecentOrders(10);
    // Enrich with customer names
    const enriched = orders.map(o => {
      const customer = storage.getCustomer(o.customerId);
      const driver = o.driverId ? storage.getDriver(o.driverId) : null;
      return { ...o, customerName: customer?.name || "Unknown", driverName: driver?.name || "Unassigned" };
    });
    res.json(enriched);
  });

  // ── Customers ──
  app.get("/api/customers", requireAdmin, (_req, res) => {
    res.json(storage.getCustomers());
  });

  app.get("/api/customers/:id", requireAdmin, (req, res) => {
    const customer = storage.getCustomer(parseInt(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.patch("/api/customers/:id", requireAdmin, (req, res) => {
    const updated = storage.updateCustomer(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    res.json(updated);
  });

  app.get("/api/customers/:id/orders", requireAdmin, (req, res) => {
    const allOrders = storage.getOrders();
    const customerOrders = allOrders.filter(o => o.customerId === parseInt(req.params.id));
    res.json(customerOrders);
  });

  app.get("/api/customers/:id/communications", requireAdmin, (req, res) => {
    res.json(storage.getCommunicationLog(parseInt(req.params.id)));
  });

  // ── Drivers ──
  app.get("/api/drivers", requireAdmin, (_req, res) => {
    res.json(storage.getDrivers());
  });

  app.get("/api/drivers/:id", requireAdmin, (req, res) => {
    const driver = storage.getDriver(parseInt(req.params.id));
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.patch("/api/drivers/:id", requireAdmin, (req, res) => {
    const updated = storage.updateDriver(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Driver not found" });
    res.json(updated);
  });

  // ── Vendors ──
  app.get("/api/vendors", requireAdmin, (_req, res) => {
    res.json(storage.getVendors());
  });

  app.get("/api/vendors/:id", requireAdmin, (req, res) => {
    const vendor = storage.getVendor(parseInt(req.params.id));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  });

  app.patch("/api/vendors/:id", requireAdmin, (req, res) => {
    const updated = storage.updateVendor(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Vendor not found" });
    res.json(updated);
  });

  // ── Orders ──
  app.get("/api/orders", requireAdmin, (_req, res) => {
    const allOrders = storage.getOrders();
    const enriched = allOrders.map(o => {
      const customer = storage.getCustomer(o.customerId);
      const driver = o.driverId ? storage.getDriver(o.driverId) : null;
      const vendor = o.vendorId ? storage.getVendor(o.vendorId) : null;
      return {
        ...o,
        customerName: customer?.name || "Unknown",
        driverName: driver?.name || "Unassigned",
        vendorName: vendor?.name || "Unassigned",
      };
    });
    res.json(enriched);
  });

  app.get("/api/orders/:id", requireAdmin, (req, res) => {
    const order = storage.getOrder(parseInt(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const customer = storage.getCustomer(order.customerId);
    const driver = order.driverId ? storage.getDriver(order.driverId) : null;
    const vendor = order.vendorId ? storage.getVendor(order.vendorId) : null;
    const history = storage.getOrderStatusHistory(order.id);
    res.json({
      ...order,
      customerName: customer?.name || "Unknown",
      driverName: driver?.name || "Unassigned",
      vendorName: vendor?.name || "Unassigned",
      statusHistory: history,
    });
  });

  app.patch("/api/orders/:id", requireAdmin, (req, res) => {
    const updated = storage.updateOrder(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Order not found" });
    res.json(updated);
  });

  // ── Reviews ──
  app.get("/api/reviews", requireAdmin, (_req, res) => {
    res.json(storage.getReviews());
  });

  // ── Disputes ──
  app.get("/api/disputes", requireAdmin, (_req, res) => {
    const allDisputes = storage.getDisputes();
    const enriched = allDisputes.map(d => {
      const customer = storage.getCustomer(d.customerId);
      const order = storage.getOrder(d.orderId);
      return { ...d, customerName: customer?.name || "Unknown", orderNumber: order?.orderNumber || "N/A" };
    });
    res.json(enriched);
  });

  app.get("/api/disputes/:id", requireAdmin, (req, res) => {
    const dispute = storage.getDispute(parseInt(req.params.id));
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    const customer = storage.getCustomer(dispute.customerId);
    const order = storage.getOrder(dispute.orderId);
    res.json({
      ...dispute,
      customerName: customer?.name || "Unknown",
      orderNumber: order?.orderNumber || "N/A",
      orderDetails: order,
    });
  });

  app.patch("/api/disputes/:id", requireAdmin, (req, res) => {
    const updated = storage.updateDispute(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Dispute not found" });
    res.json(updated);
  });

  // ── Promo Codes ──
  app.get("/api/promo-codes", requireAdmin, (_req, res) => {
    res.json(storage.getPromoCodes());
  });

  app.post("/api/promo-codes", requireAdmin, (req, res) => {
    try {
      const promo = storage.createPromoCode(req.body);
      res.json(promo);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/promo-codes/:id", requireAdmin, (req, res) => {
    const updated = storage.updatePromoCode(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Promo code not found" });
    res.json(updated);
  });

  // ── Transactions ──
  app.get("/api/transactions", requireAdmin, (_req, res) => {
    res.json(storage.getTransactions());
  });

  // ── Settings ──
  app.get("/api/settings", requireAdmin, (_req, res) => {
    res.json(storage.getSettings());
  });

  app.patch("/api/settings/:key", requireAdmin, (req, res) => {
    storage.updateSetting(req.params.key, req.body.value);
    res.json({ success: true });
  });

  // ── Analytics ──
  app.get("/api/analytics/overview", requireAdmin, (_req, res) => {
    const allOrders = storage.getOrders();
    const allCustomers = storage.getCustomers();
    const allDrivers = storage.getDrivers();
    const allVendors = storage.getVendors();

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
        .reduce((sum, o) => sum + o.total, 0);
      weeklyRevenue.push({
        week: weekStart.toISOString().split('T')[0],
        revenue: Math.round(revenue * 100) / 100,
      });
    }

    // Top zip codes
    const zipMap: Record<string, number> = {};
    allOrders.forEach(o => {
      zipMap[o.zipCode] = (zipMap[o.zipCode] || 0) + 1;
    });
    const topZips = Object.entries(zipMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([zip, count]) => ({ zip, count }));

    // Customer tier breakdown
    const tierBreakdown: Record<string, number> = {};
    allCustomers.forEach(c => {
      tierBreakdown[c.tier] = (tierBreakdown[c.tier] || 0) + 1;
    });

    // Driver utilization
    const driverUtilization = allDrivers.map(d => ({
      name: d.name,
      trips: d.totalTrips,
      rating: d.rating,
      completionRate: d.completionRate,
      utilization: d.status === "offline" ? 0 : d.status === "busy" ? 0.85 : 0.4,
    }));

    // Vendor performance
    const vendorPerformance = allVendors.map(v => ({
      name: v.name,
      healthScore: v.healthScore,
      qualityScore: v.qualityScore,
      totalOrders: v.totalOrders,
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
      if (c.totalSpend < 100) clvBuckets[0].count++;
      else if (c.totalSpend < 500) clvBuckets[1].count++;
      else if (c.totalSpend < 1500) clvBuckets[2].count++;
      else if (c.totalSpend < 3000) clvBuckets[3].count++;
      else clvBuckets[4].count++;
    });

    // Acquisition funnel (simulated)
    const funnel = [
      { stage: "Website Visits", count: 12500 },
      { stage: "Sign Ups", count: 850 },
      { stage: "First Order", count: 420 },
      { stage: "Repeat Customer", count: 195 },
      { stage: "Subscriber", count: 78 },
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
