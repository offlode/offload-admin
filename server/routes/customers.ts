import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin, requireVendorScoped } from "./auth-utils";

export const customersRouter = Router();

// ── Customers ──
customersRouter.get("/api/customers", requireAdmin, async (_req, res) => {
  res.json(await storage.getCustomers());
});

customersRouter.get("/api/customers/:id", requireAdmin, requireVendorScoped, async (req, res) => {
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

customersRouter.patch("/api/customers/:id", requireAdmin, async (req, res) => {
  const updated = await storage.updateCustomer(Number(String(req.params.id)), req.body);
  if (!updated) return res.status(404).json({ message: "Customer not found" });
  res.json(updated);
});

customersRouter.get("/api/customers/:id/orders", requireAdmin, async (req, res) => {
  const allOrders = await storage.getOrders();
  const customerOrders = allOrders.filter(o => o.customerId === Number(String(req.params.id)));
  res.json(customerOrders);
});

customersRouter.get("/api/customers/:id/communications", requireAdmin, async (req, res) => {
  res.json(await storage.getCommunicationLog(Number(String(req.params.id))));
});
