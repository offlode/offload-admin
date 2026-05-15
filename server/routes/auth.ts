import { Router } from "express";
import { Resend } from "resend";
import crypto from "crypto";
import { storage } from "../storage";
import { log } from "../index";
import {
  sessions,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  generateSessionId,
  hashPassword,
  comparePasswords,
  checkRateLimit,
  resetRateLimit,
  requireAdmin,
  type Session,
} from "./auth-utils";

export const authRouter = Router();

// ── Auth endpoints (no requireAdmin) ─────────────────────────────────────
authRouter.post("/api/auth/login", async (req, res) => {
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
    if (!["admin", "super_admin", "manager", "laundromat_owner", "laundromat_employee", "operator", "wash_operator", "driver"].includes(user.role)) {
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

authRouter.get("/api/auth/me", requireAdmin, (req, res) => {
  const adminUser = (req as any).adminUser as Session;
  res.json({
    id: adminUser.userId,
    username: adminUser.username,
    name: adminUser.name,
    role: adminUser.role,
  });
});

authRouter.post("/api/auth/logout", requireAdmin, (req, res) => {
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
authRouter.post("/api/auth/forgot-password", async (req, res) => {
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
authRouter.post("/api/auth/reset-password", async (req, res) => {
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
