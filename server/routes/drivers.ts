import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth-utils";

export const driversRouter = Router();

// ── Drivers ──
driversRouter.get("/api/drivers", requireAdmin, async (_req, res) => {
  res.json(await storage.getDrivers());
});

driversRouter.get("/api/drivers/:id", requireAdmin, async (req, res) => {
  const driver = await storage.getDriver(Number(String(req.params.id)));
  if (!driver) return res.status(404).json({ message: "Driver not found" });
  res.json(driver);
});

driversRouter.patch("/api/drivers/:id", requireAdmin, async (req, res) => {
  const updated = await storage.updateDriver(Number(String(req.params.id)), req.body);
  if (!updated) return res.status(404).json({ message: "Driver not found" });
  res.json(updated);
});
