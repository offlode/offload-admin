import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth-utils";

export const adminRouter = Router();

// ── KPIs / Dashboard ──
adminRouter.get("/api/dashboard/kpis", requireAdmin, async (_req, res) => {
  res.json(await storage.getKPIs());
});

adminRouter.get("/api/dashboard/revenue", requireAdmin, async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  res.json(await storage.getRevenueByDay(days));
});

adminRouter.get("/api/dashboard/orders-by-status", requireAdmin, async (_req, res) => {
  res.json(await storage.getOrdersByStatus());
});

adminRouter.get("/api/dashboard/recent-orders", requireAdmin, async (_req, res) => {
  const recentOrders = await storage.getRecentOrders(10);
  // Enrich with customer names
  const enriched = await Promise.all(recentOrders.map(async o => {
    const customer = await storage.getCustomer(o.customerId);
    const driver = o.driverId ? await storage.getDriver(o.driverId) : null;
    return { ...o, customerName: customer?.name || "Unknown", driverName: driver?.name || "Unassigned" };
  }));
  res.json(enriched);
});

// ── Reviews ──
adminRouter.get("/api/reviews", requireAdmin, async (_req, res) => {
  res.json(await storage.getReviews());
});

// ── Disputes ──
adminRouter.get("/api/disputes", requireAdmin, async (_req, res) => {
  const allDisputes = await storage.getDisputes();
  const enriched = await Promise.all(allDisputes.map(async d => {
    const customer = await storage.getCustomer(d.customerId);
    const order = await storage.getOrder(d.orderId);
    return { ...d, customerName: customer?.name || "Unknown", orderNumber: order?.orderNumber || "N/A" };
  }));
  res.json(enriched);
});

adminRouter.get("/api/disputes/:id", requireAdmin, async (req, res) => {
  const dispute = await storage.getDispute(Number(String(req.params.id)));
  if (!dispute) return res.status(404).json({ message: "Dispute not found" });
  const customer = await storage.getCustomer(dispute.customerId);
  const order = await storage.getOrder(dispute.orderId);
  res.json({
    ...dispute,
    customerName: customer?.name || "Unknown",
    orderNumber: order?.orderNumber || "N/A",
    orderDetails: order,
  });
});

adminRouter.patch("/api/disputes/:id", requireAdmin, async (req, res) => {
  const updated = await storage.updateDispute(Number(String(req.params.id)), req.body);
  if (!updated) return res.status(404).json({ message: "Dispute not found" });
  res.json(updated);
});

// ── Promo Codes ──
adminRouter.get("/api/promo-codes", requireAdmin, async (_req, res) => {
  res.json(await storage.getPromoCodes());
});

adminRouter.post("/api/promo-codes", requireAdmin, async (req, res) => {
  try {
    const promo = await storage.createPromoCode(req.body);
    res.json(promo);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

adminRouter.patch("/api/promo-codes/:id", requireAdmin, async (req, res) => {
  const updated = await storage.updatePromoCode(Number(String(req.params.id)), req.body);
  if (!updated) return res.status(404).json({ message: "Promo code not found" });
  res.json(updated);
});

// ── Transactions ──
adminRouter.get("/api/transactions", requireAdmin, async (_req, res) => {
  res.json(await storage.getTransactions());
});

// ── Settings ──
adminRouter.get("/api/settings", requireAdmin, async (_req, res) => {
  res.json(await storage.getSettings());
});

adminRouter.patch("/api/settings/:key", requireAdmin, async (req, res) => {
  await storage.updateSetting(String(req.params.key), req.body.value);
  res.json({ success: true });
});

// ── Analytics ──
adminRouter.get("/api/analytics/overview", requireAdmin, async (_req, res) => {
  const allOrders = await storage.getOrders();
  const allCustomers = await storage.getCustomers();
  const allDrivers = await storage.getDrivers();
  const allVendors = await storage.getVendors();

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
      .reduce((sum, o) => sum + (o.total || 0), 0);
    weeklyRevenue.push({
      week: weekStart.toISOString().split('T')[0],
      revenue: Math.round(revenue * 100) / 100,
    });
  }

  // Top zip codes
  const zipMap: Record<string, number> = {};
  allOrders.forEach(o => {
    const zip = (o as any).zipCode || (o as any).pickupZip || "unknown";
    zipMap[zip] = (zipMap[zip] || 0) + 1;
  });
  const topZips = Object.entries(zipMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([zip, count]) => ({ zip, count }));

  // Customer tier breakdown
  const tierBreakdown: Record<string, number> = {};
  allCustomers.forEach(c => {
    const tier = (c as any).tier || (c as any).loyaltyTier || "standard";
    tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
  });

  // Driver utilization
  const driverUtilization = allDrivers.map(d => ({
    name: d.name,
    trips: (d as any).totalTrips ?? d.completedTrips ?? d.todayTrips ?? 0,
    rating: d.rating,
    completionRate: (d as any).completionRate ?? d.onTimePickupRate ?? 0,
    utilization: d.status === "offline" ? 0 : d.status === "busy" ? 0.85 : 0.4,
  }));

  // Vendor performance
  const vendorPerformance = allVendors.map(v => ({
    name: v.name,
    healthScore: (v as any).healthScore ?? v.aiHealthScore ?? 0,
    qualityScore: v.qualityScore,
    totalOrders: (v as any).totalOrders ?? 0,
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
    const spent = c.totalSpent ?? 0;
    if (spent < 100) clvBuckets[0].count++;
    else if (spent < 500) clvBuckets[1].count++;
    else if (spent < 1500) clvBuckets[2].count++;
    else if (spent < 3000) clvBuckets[3].count++;
    else clvBuckets[4].count++;
  });

  // Acquisition funnel: only the stages we can derive from real data.
  // We don't track website visits in this DB, so omit that stage rather than
  // making up a number.
  const totalUsers = allCustomers.length;
  const usersWithFirstOrder = allCustomers.filter(c => (c.totalOrders || 0) >= 1).length;
  const repeatCustomers = allCustomers.filter(c => (c.totalOrders || 0) >= 2).length;
  const subscribers = allCustomers.filter(c => !!c.subscriptionTier).length;
  const funnel = [
    { stage: "Sign Ups", count: totalUsers },
    { stage: "First Order", count: usersWithFirstOrder },
    { stage: "Repeat Customer", count: repeatCustomers },
    { stage: "Subscriber", count: subscribers },
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
