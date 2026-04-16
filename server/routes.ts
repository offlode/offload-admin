import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import crypto from "crypto";
import { z } from "zod";

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

// Use scrypt (Node.js built-in) instead of SHA-256 for password hashing
const SCRYPT_KEYLEN = 64;

function hashPassword(pw: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pw, useSalt, SCRYPT_KEYLEN);
  return { hash: derived.toString("hex"), salt: useSalt };
}

function verifyPassword(pw: string, storedHash: string): boolean {
  // Support legacy SHA-256 hashes (64 hex chars, no colon separator)
  if (!storedHash.includes(":")) {
    const legacySha = crypto.createHash("sha256").update(pw).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(legacySha, "hex"), Buffer.from(storedHash, "hex"));
  }
  const [salt, hash] = storedHash.split(":");
  const { hash: computed } = hashPassword(pw, salt);
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}

export function hashPasswordForStorage(pw: string): string {
  const { hash, salt } = hashPassword(pw);
  return `${salt}:${hash}`;
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  sessions.forEach((session, id) => {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  });
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
  loginAttempts.forEach((entry, ip) => {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  });
}, 15 * 60 * 1000);

// ── Audit logging ───────────────────────────────────────────────────────────
function auditLog(adminUser: Session | null, action: string, details: Record<string, unknown> = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    adminId: adminUser?.userId ?? null,
    adminUsername: adminUser?.username ?? "anonymous",
    action,
    ...details,
  };
  // In production, this would write to a persistent audit table or log service.
  // For now, structured console log that can be piped to a log aggregator.
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
}

// ── PII masking helpers ─────────────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  const visibleChars = Math.min(2, local.length);
  return `${local.slice(0, visibleChars)}***@${domain}`;
}

function maskPhone(phone: string): string {
  // Show last 4 digits only: (415) ***-1234
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-${digits.slice(-4)}`;
}

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

// Role-based access: only admin role can access sensitive operations
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminUser = (req as any).adminUser as Session | undefined;
    if (!adminUser || !allowedRoles.includes(adminUser.role)) {
      res.status(403).json({ message: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}

// ── Zod validation schemas for mutation endpoints ───────────────────────────
const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(20).optional(),
  address: z.string().min(1).max(500).optional(),
  zipCode: z.string().regex(/^\d{5}$/).optional(),
  tier: z.enum(["standard", "silver", "gold", "platinum"]).optional(),
  status: z.enum(["active", "inactive", "churned"]).optional(),
  notes: z.string().max(2000).optional(),
  subscriptionType: z.enum(["weekly", "biweekly", "monthly"]).nullable().optional(),
}).strict();

const updateDriverSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["available", "busy", "offline"]).optional(),
  payoutRate: z.number().min(0).max(100).optional(),
}).strict();

const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
  address: z.string().min(1).max(500).optional(),
  phone: z.string().min(5).max(20).optional(),
  email: z.string().email().optional(),
  operatingHours: z.string().max(50).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
}).strict();

const updateOrderSchema = z.object({
  status: z.enum(["pending", "pickup_scheduled", "picked_up", "at_vendor", "processing", "ready", "out_for_delivery", "delivered", "cancelled"]).optional(),
  driverId: z.number().int().positive().optional(),
  vendorId: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
}).strict();

const updateDisputeSchema = z.object({
  status: z.enum(["open", "investigating", "resolved", "escalated"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  resolution: z.enum(["credit", "refund", "partial_refund", "deny"]).nullable().optional(),
  resolutionAmount: z.number().min(0).max(10000).optional(),
  resolutionNote: z.string().max(2000).optional(),
  resolvedAt: z.string().optional(),
}).strict();

const createPromoCodeSchema = z.object({
  code: z.string().min(2).max(30).regex(/^[A-Z0-9_]+$/),
  description: z.string().min(1).max(500),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive().max(100),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  currentUses: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  expiresAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
}).strict();

const updatePromoCodeSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  discountValue: z.number().positive().max(100).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  expiresAt: z.string().nullable().optional(),
}).strict();

const updateSettingSchema = z.object({
  value: z.string().min(1).max(200),
}).strict();

// Helper to safely extract a route param (Express 5 types return string | string[])
function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val || "";
}

// Helper to validate request body
function validateBody<T>(schema: z.ZodSchema<T>, req: Request, res: Response): T | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`);
    res.status(400).json({ message: "Validation failed", errors });
    return null;
  }
  return result.data;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ── Security headers ─────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
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

  // ── Seed database only if no admin user exists ───────────────────────────
  seedDatabase();

  // ── Auth endpoints (no requireAdmin) ─────────────────────────────────────
  app.post("/api/auth/login", (req, res) => {
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

    if (user && verifyPassword(password, user.password)) {
      // Migrate legacy SHA-256 hash to scrypt on successful login
      if (!user.password.includes(":")) {
        const upgraded = hashPasswordForStorage(password);
        storage.updateUserPassword(user.id, upgraded);
      }

      // Successful login — reset rate limit
      resetRateLimit(ip);

      const sessionId = generateSessionId();
      sessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: Date.now(),
      });

      const isProduction = process.env.NODE_ENV === "production";
      // Set session cookie with Secure flag in production
      res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${isProduction ? "; Secure" : ""}`
      );

      auditLog({ userId: user.id, username: user.username, name: user.name, role: user.role, createdAt: Date.now() }, "login", { ip });

      res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } else {
      auditLog(null, "login_failed", { ip, username });
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
    const isProduction = process.env.NODE_ENV === "production";
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isProduction ? "; Secure" : ""}`
    );
    auditLog((req as any).adminUser, "logout");
    res.json({ success: true });
  });

  // ── KPIs / Dashboard ──
  app.get("/api/dashboard/kpis", requireAdmin, (_req, res) => {
    res.json(storage.getKPIs());
  });

  app.get("/api/dashboard/revenue", requireAdmin, (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
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

  // ── Stuck order detection ──
  app.get("/api/dashboard/stuck-orders", requireAdmin, (_req, res) => {
    const allOrders = storage.getOrders();
    const now = Date.now();
    const stuckOrders = allOrders.filter(o => {
      if (["delivered", "cancelled"].includes(o.status)) return false;
      const updatedAt = new Date(o.updatedAt).getTime();
      const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);
      // Orders stuck for > 24h in non-terminal status
      if (hoursSinceUpdate > 24) return true;
      // SLA breach: express should be delivered within 6h, premium within 4h
      if (o.estimatedDelivery) {
        const estimatedMs = new Date(o.estimatedDelivery).getTime();
        if (now > estimatedMs && !["delivered", "cancelled"].includes(o.status)) return true;
      }
      return false;
    });

    const enriched = stuckOrders.map(o => {
      const customer = storage.getCustomer(o.customerId);
      const driver = o.driverId ? storage.getDriver(o.driverId) : null;
      const vendor = o.vendorId ? storage.getVendor(o.vendorId) : null;
      const hoursSinceUpdate = (now - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60);
      const slaBreach = o.estimatedDelivery ? now > new Date(o.estimatedDelivery).getTime() : false;
      return {
        ...o,
        customerName: customer?.name || "Unknown",
        driverName: driver?.name || "Unassigned",
        vendorName: vendor?.name || "Unassigned",
        hoursSinceUpdate: Math.round(hoursSinceUpdate * 10) / 10,
        slaBreach,
      };
    });
    res.json(enriched);
  });

  // ── Customers ──
  // List endpoint: mask PII (email, phone) for list views
  app.get("/api/customers", requireAdmin, (_req, res) => {
    const all = storage.getCustomers();
    const masked = all.map(c => ({
      ...c,
      email: maskEmail(c.email),
      phone: maskPhone(c.phone),
    }));
    res.json(masked);
  });

  // Detail endpoint: full PII visible for admin operations
  app.get("/api/customers/:id", requireAdmin, (req, res) => {
    const customer = storage.getCustomer(parseInt(paramStr(req.params.id)));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.patch("/api/customers/:id", requireAdmin, (req, res) => {
    const data = validateBody(updateCustomerSchema, req, res);
    if (!data) return;
    const updated = storage.updateCustomer(parseInt(paramStr(req.params.id)), data);
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    auditLog((req as any).adminUser, "update_customer", { customerId: paramStr(req.params.id), fields: Object.keys(data) });
    res.json(updated);
  });

  app.get("/api/customers/:id/orders", requireAdmin, (req, res) => {
    const allOrders = storage.getOrders();
    const customerOrders = allOrders.filter(o => o.customerId === parseInt(paramStr(req.params.id)));
    res.json(customerOrders);
  });

  app.get("/api/customers/:id/communications", requireAdmin, (req, res) => {
    res.json(storage.getCommunicationLog(parseInt(paramStr(req.params.id))));
  });

  // ── Drivers ──
  // List endpoint: mask email/phone for list views
  app.get("/api/drivers", requireAdmin, (_req, res) => {
    const all = storage.getDrivers();
    const masked = all.map(d => ({
      ...d,
      email: maskEmail(d.email),
      phone: maskPhone(d.phone),
    }));
    res.json(masked);
  });

  app.get("/api/drivers/:id", requireAdmin, (req, res) => {
    const driver = storage.getDriver(parseInt(paramStr(req.params.id)));
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.patch("/api/drivers/:id", requireAdmin, requireRole("admin"), (req, res) => {
    const data = validateBody(updateDriverSchema, req, res);
    if (!data) return;
    const updated = storage.updateDriver(parseInt(paramStr(req.params.id)), data);
    if (!updated) return res.status(404).json({ message: "Driver not found" });
    auditLog((req as any).adminUser, "update_driver", { driverId: paramStr(req.params.id), fields: Object.keys(data) });
    res.json(updated);
  });

  // ── Driver earnings endpoint (isolated per driver by ID) ──
  app.get("/api/drivers/:id/earnings", requireAdmin, (req, res) => {
    const driverId = parseInt(paramStr(req.params.id));
    const driver = storage.getDriver(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const allTransactions = storage.getTransactions();
    const driverTransactions = allTransactions.filter(
      t => t.recipientType === "driver" && t.recipientId === driverId
    );
    const totalPaid = driverTransactions.filter(t => t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const pending = driverTransactions.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);

    res.json({
      driverId,
      driverName: driver.name,
      totalEarnings: driver.totalEarnings,
      totalPaid: Math.round(totalPaid * 100) / 100,
      pendingPayout: Math.round(pending * 100) / 100,
      transactions: driverTransactions,
    });
  });

  // ── Vendors ──
  // List endpoint: mask email/phone
  app.get("/api/vendors", requireAdmin, (_req, res) => {
    const all = storage.getVendors();
    const masked = all.map(v => ({
      ...v,
      email: maskEmail(v.email),
      phone: maskPhone(v.phone),
    }));
    res.json(masked);
  });

  app.get("/api/vendors/:id", requireAdmin, (req, res) => {
    const vendor = storage.getVendor(parseInt(paramStr(req.params.id)));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  });

  app.patch("/api/vendors/:id", requireAdmin, requireRole("admin"), (req, res) => {
    const data = validateBody(updateVendorSchema, req, res);
    if (!data) return;
    const updated = storage.updateVendor(parseInt(paramStr(req.params.id)), data);
    if (!updated) return res.status(404).json({ message: "Vendor not found" });
    auditLog((req as any).adminUser, "update_vendor", { vendorId: paramStr(req.params.id), fields: Object.keys(data) });
    res.json(updated);
  });

  // ── Vendor-scoped orders (vendor can only see their own orders) ──
  app.get("/api/vendors/:id/orders", requireAdmin, (req, res) => {
    const vendorId = parseInt(paramStr(req.params.id));
    const vendor = storage.getVendor(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const allOrders = storage.getOrders();
    const vendorOrders = allOrders.filter(o => o.vendorId === vendorId);
    const enriched = vendorOrders.map(o => {
      const customer = storage.getCustomer(o.customerId);
      return {
        ...o,
        customerName: customer?.name || "Unknown",
        // Don't expose full customer contact info to vendor context
      };
    });
    res.json(enriched);
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
    const order = storage.getOrder(parseInt(paramStr(req.params.id)));
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
    const data = validateBody(updateOrderSchema, req, res);
    if (!data) return;
    const updated = storage.updateOrder(parseInt(paramStr(req.params.id)), data);
    if (!updated) return res.status(404).json({ message: "Order not found" });
    auditLog((req as any).adminUser, "update_order", { orderId: paramStr(req.params.id), fields: Object.keys(data) });
    res.json(updated);
  });

  // ── Refund endpoint ──
  app.post("/api/orders/:id/refund", requireAdmin, requireRole("admin"), (req, res) => {
    const orderId = parseInt(paramStr(req.params.id));
    const order = storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const refundSchema = z.object({
      amount: z.number().positive().max(order.total),
      reason: z.string().min(1).max(500),
    }).strict();

    const data = validateBody(refundSchema, req, res);
    if (!data) return;

    // Create refund transaction
    const refundTx = storage.createTransaction({
      orderId,
      type: "refund",
      amount: data.amount,
      status: "completed",
      recipientType: "customer",
      recipientId: order.customerId,
      description: `Refund for order ${order.orderNumber}: ${data.reason}`,
      createdAt: new Date().toISOString(),
    });

    auditLog((req as any).adminUser, "refund_order", { orderId, amount: data.amount, reason: data.reason });
    res.json({ success: true, transaction: refundTx });
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
    const dispute = storage.getDispute(parseInt(paramStr(req.params.id)));
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
    const data = validateBody(updateDisputeSchema, req, res);
    if (!data) return;

    // If resolving with refund, create the refund transaction automatically
    if (data.status === "resolved" && data.resolution && data.resolution !== "deny" && data.resolutionAmount && data.resolutionAmount > 0) {
      const dispute = storage.getDispute(parseInt(paramStr(req.params.id)));
      if (dispute) {
        const order = storage.getOrder(dispute.orderId);
        storage.createTransaction({
          orderId: dispute.orderId,
          type: "refund",
          amount: data.resolutionAmount,
          status: "completed",
          recipientType: "customer",
          recipientId: dispute.customerId,
          description: `Dispute #${dispute.id} resolution (${data.resolution}) for order ${order?.orderNumber || "N/A"}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const updated = storage.updateDispute(parseInt(paramStr(req.params.id)), data);
    if (!updated) return res.status(404).json({ message: "Dispute not found" });
    auditLog((req as any).adminUser, "update_dispute", { disputeId: paramStr(req.params.id), fields: Object.keys(data) });
    res.json(updated);
  });

  // ── Promo Codes ──
  app.get("/api/promo-codes", requireAdmin, (_req, res) => {
    res.json(storage.getPromoCodes());
  });

  app.post("/api/promo-codes", requireAdmin, requireRole("admin"), (req, res) => {
    const data = validateBody(createPromoCodeSchema, req, res);
    if (!data) return;
    try {
      const promo = storage.createPromoCode({ ...data, createdAt: data.createdAt || new Date().toISOString() });
      auditLog((req as any).adminUser, "create_promo_code", { code: data.code });
      res.json(promo);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/promo-codes/:id", requireAdmin, requireRole("admin"), (req, res) => {
    const data = validateBody(updatePromoCodeSchema, req, res);
    if (!data) return;
    const updated = storage.updatePromoCode(parseInt(paramStr(req.params.id)), data);
    if (!updated) return res.status(404).json({ message: "Promo code not found" });
    auditLog((req as any).adminUser, "update_promo_code", { promoId: paramStr(req.params.id), fields: Object.keys(data) });
    res.json(updated);
  });

  // ── Transactions ──
  app.get("/api/transactions", requireAdmin, (_req, res) => {
    res.json(storage.getTransactions());
  });

  // ── Settings (admin-only for writes) ──
  app.get("/api/settings", requireAdmin, (_req, res) => {
    res.json(storage.getSettings());
  });

  app.patch("/api/settings/:key", requireAdmin, requireRole("admin"), (req, res) => {
    const data = validateBody(updateSettingSchema, req, res);
    if (!data) return;
    storage.updateSetting(paramStr(req.params.key), data.value);
    auditLog((req as any).adminUser, "update_setting", { key: paramStr(req.params.key) });
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
