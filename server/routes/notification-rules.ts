import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth-utils";

export const notificationRulesRouter = Router();

function requireSuperAdmin(req: any, res: any, next: any) {
  const adminUser = req.adminUser;
  if (!adminUser || (adminUser.role !== "super_admin" && adminUser.role !== "admin")) {
    return res.status(403).json({ message: "Forbidden: super_admin access required" });
  }
  next();
}

// ── List all notification rules ──
notificationRulesRouter.get("/api/admin/notification-rules", requireAdmin, requireSuperAdmin, async (_req, res) => {
  const rules = await storage.getNotificationRules();
  res.json(rules);
});

// ── Create notification rule ──
notificationRulesRouter.post("/api/admin/notification-rules", requireAdmin, requireSuperAdmin, async (req, res) => {
  const { name, trigger, audience, channels, titleTemplate, bodyTemplate, isActive } = req.body;
  if (!name || !trigger || !audience || !channels || !titleTemplate || !bodyTemplate) {
    return res.status(400).json({ message: "Missing required fields: name, trigger, audience, channels, titleTemplate, bodyTemplate" });
  }
  const rule = await storage.createNotificationRule({
    name,
    trigger,
    audience,
    channels: typeof channels === "string" ? channels : JSON.stringify(channels),
    titleTemplate,
    bodyTemplate,
    isActive: isActive ?? true,
  });
  res.json(rule);
});

// ── Update notification rule ──
notificationRulesRouter.patch("/api/admin/notification-rules/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  const updated = await storage.updateNotificationRule(Number(String(req.params.id)), req.body);
  if (!updated) return res.status(404).json({ message: "Notification rule not found" });
  res.json(updated);
});

// ── Delete notification rule ──
notificationRulesRouter.delete("/api/admin/notification-rules/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  const deleted = await storage.deleteNotificationRule(Number(String(req.params.id)));
  if (!deleted) return res.status(404).json({ message: "Notification rule not found" });
  res.json({ message: "Notification rule deleted" });
});
