import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin, requireVendorScoped } from "./auth-utils";

export const vendorsRouter = Router();

// ── Vendors ──
vendorsRouter.get("/api/vendors", requireAdmin, requireVendorScoped, async (req, res) => {
  let allVendors = await storage.getVendors();
  const scopedVendorId = (req as any).scopedVendorId;
  if (scopedVendorId != null) {
    allVendors = allVendors.filter(v => v.id === scopedVendorId);
  }
  res.json(allVendors);
});

vendorsRouter.get("/api/vendors/:id", requireAdmin, requireVendorScoped, async (req, res) => {
  const vendor = await storage.getVendor(Number(String(req.params.id)));
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });
  const scopedVendorId = (req as any).scopedVendorId;
  if (scopedVendorId && vendor.id !== scopedVendorId) {
    return res.status(403).json({ message: "Forbidden: vendor access denied" });
  }
  res.json(vendor);
});

vendorsRouter.patch("/api/vendors/:id", requireAdmin, requireVendorScoped, async (req, res) => {
  const vendorId = Number(String(req.params.id));
  const scopedVendorId = (req as any).scopedVendorId;
  if (scopedVendorId != null && vendorId !== scopedVendorId) {
    return res.status(403).json({ message: "Forbidden: vendor access denied" });
  }
  const updated = await storage.updateVendor(vendorId, req.body);
  if (!updated) return res.status(404).json({ message: "Vendor not found" });
  res.json(updated);
});
