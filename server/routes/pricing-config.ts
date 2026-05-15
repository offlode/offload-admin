import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth-utils";

export const pricingConfigRouter = Router();

function requireSuperAdmin(req: any, res: any, next: any) {
  const adminUser = req.adminUser;
  if (!adminUser || (adminUser.role !== "super_admin" && adminUser.role !== "admin")) {
    return res.status(403).json({ message: "Forbidden: super_admin access required" });
  }
  next();
}

// ── Get all pricing config ──
pricingConfigRouter.get("/api/admin/pricing-config", requireAdmin, requireSuperAdmin, async (_req, res) => {
  const configs = await storage.getAllPricingConfig();
  res.json(configs);
});

// ── Get single pricing config by key ──
pricingConfigRouter.get("/api/admin/pricing-config/:key", requireAdmin, requireSuperAdmin, async (req, res) => {
  const config = await storage.getPricingConfig(String(req.params.key));
  if (!config) return res.status(404).json({ message: "Pricing config not found" });
  res.json(config);
});

// ── Upsert pricing config by key ──
pricingConfigRouter.put("/api/admin/pricing-config/:key", requireAdmin, requireSuperAdmin, async (req, res) => {
  const key = String(req.params.key);
  const { value, category, description } = req.body;
  if (value === undefined) return res.status(400).json({ message: "value is required" });

  const adminUser = (req as any).adminUser;
  const config = await storage.setPricingConfig(key, {
    value: typeof value === "string" ? value : JSON.stringify(value),
    category: category || "general",
    description: description || null,
    updatedBy: adminUser.userId,
  });
  res.json(config);
});

// ── Pricing audit log ──
pricingConfigRouter.get("/api/admin/pricing-audit-log", requireAdmin, requireSuperAdmin, async (_req, res) => {
  const logs = await storage.getPricingAuditLog();
  res.json(logs);
});

// ── Certified rules (stored as pricing config keys) ──
pricingConfigRouter.get("/api/admin/certified-rules", requireAdmin, requireSuperAdmin, async (_req, res) => {
  const config = await storage.getPricingConfig("certified_rules");
  if (!config) {
    return res.json({
      minHappyReviews: 10,
      maxUnhappyReviews: 2,
      windowDays: 90,
      minTotalReviews: 15,
      happyThreshold: 4,
      unhappyThreshold: 2,
    });
  }
  try {
    res.json(JSON.parse(config.value));
  } catch {
    res.json(config);
  }
});

pricingConfigRouter.put("/api/admin/certified-rules", requireAdmin, requireSuperAdmin, async (req, res) => {
  const adminUser = (req as any).adminUser;
  const config = await storage.setPricingConfig("certified_rules", {
    value: JSON.stringify(req.body),
    category: "general",
    description: "Certified laundromat rules",
    updatedBy: adminUser.userId,
  });
  res.json(config);
});
