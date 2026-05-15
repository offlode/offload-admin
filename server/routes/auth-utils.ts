import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { promisify } from "util";
import { log } from "../index";

const scryptAsync = promisify(crypto.scrypt);

// ── In-memory session store ──────────────────────────────────────────────────
export interface Session {
  userId: number;
  username: string;
  name: string;
  role: string;
  vendorId: number | null;
  createdAt: number;
}

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export const sessions = new Map<string, Session>();

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(pw, salt, 64)) as Buffer;
  // Match API format: scrypt:<salt>:<hash> (3 parts)
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
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
export const loginAttempts = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string): boolean {
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

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// ── Rate limiting (forgot-password endpoint) ──────────────────────────────
const FORGOT_PW_RATE_LIMIT_MAX = 3; // 3 requests per 15 min per IP
export const forgotPasswordAttempts = new Map<string, RateLimitEntry>();

export function checkForgotPasswordRateLimit(ip: string): boolean {
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

// Pass-through for order status patch — no transformation needed since admin
// now sends canonical status values directly.
export function normalizeOrderStatusPatch(body: Record<string, unknown>) {
  return body;
}

// ── Auth middleware ──────────────────────────────────────────────────────────
export const SESSION_COOKIE = "admin_session";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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

export function requireVendorScoped(req: Request, res: Response, next: NextFunction): void {
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
