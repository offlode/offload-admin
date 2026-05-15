import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth-utils";

export const stripeReconciliationRouter = Router();

function requireSuperAdmin(req: any, res: any, next: any) {
  const adminUser = req.adminUser;
  if (!adminUser || (adminUser.role !== "super_admin" && adminUser.role !== "admin")) {
    return res.status(403).json({ message: "Forbidden: super_admin access required" });
  }
  next();
}

// ── List reconciliation entries ──
stripeReconciliationRouter.get("/api/admin/stripe-reconciliation", requireAdmin, requireSuperAdmin, async (req, res) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 25;
  const resolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;

  const result = await storage.getStripeReconciliationEntries({ page, limit, resolved });
  res.json(result);
});

// ── Resolve entry ──
stripeReconciliationRouter.post("/api/admin/stripe-reconciliation/:id/resolve", requireAdmin, requireSuperAdmin, async (req, res) => {
  const entry = await storage.resolveStripeReconciliationEntry(
    Number(String(req.params.id)),
    req.body.notes || null,
  );
  if (!entry) return res.status(404).json({ message: "Reconciliation entry not found" });
  res.json(entry);
});
