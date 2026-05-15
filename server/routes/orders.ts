import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin, requireVendorScoped, normalizeOrderStatusPatch } from "./auth-utils";

export const ordersRouter = Router();

// ── Orders ──
ordersRouter.get("/api/orders", requireAdmin, requireVendorScoped, async (req, res) => {
  let allOrders = await storage.getOrders();
  const scopedVendorId = (req as any).scopedVendorId;
  if (scopedVendorId != null) {
    allOrders = allOrders.filter(o => o.vendorId === scopedVendorId);
  }
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

ordersRouter.get("/api/orders/:id", requireAdmin, requireVendorScoped, async (req, res) => {
  const order = await storage.getOrder(Number(String(req.params.id)));
  if (!order) return res.status(404).json({ message: "Order not found" });
  const scopedVendorId = (req as any).scopedVendorId;
  if (scopedVendorId != null && order.vendorId !== scopedVendorId) {
    return res.status(403).json({ message: "Forbidden: order does not belong to your vendor" });
  }
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

ordersRouter.patch("/api/orders/:id", requireAdmin, requireVendorScoped, async (req, res) => {
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
