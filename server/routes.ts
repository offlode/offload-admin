import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed database on startup
  seedDatabase();

  // ── Auth ──
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = storage.getUserByUsername(username);
    if (user && user.password === password) {
      res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  // ── KPIs / Dashboard ──
  app.get("/api/dashboard/kpis", (_req, res) => {
    res.json(storage.getKPIs());
  });

  app.get("/api/dashboard/revenue", (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    res.json(storage.getRevenueByDay(days));
  });

  app.get("/api/dashboard/orders-by-status", (_req, res) => {
    res.json(storage.getOrdersByStatus());
  });

  app.get("/api/dashboard/recent-orders", (_req, res) => {
    const orders = storage.getRecentOrders(10);
    // Enrich with customer names
    const enriched = orders.map(o => {
      const customer = storage.getCustomer(o.customerId);
      const driver = o.driverId ? storage.getDriver(o.driverId) : null;
      return { ...o, customerName: customer?.name || "Unknown", driverName: driver?.name || "Unassigned" };
    });
    res.json(enriched);
  });

  // ── Customers ──
  app.get("/api/customers", (_req, res) => {
    res.json(storage.getCustomers());
  });

  app.get("/api/customers/:id", (req, res) => {
    const customer = storage.getCustomer(parseInt(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.patch("/api/customers/:id", (req, res) => {
    const updated = storage.updateCustomer(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    res.json(updated);
  });

  app.get("/api/customers/:id/orders", (req, res) => {
    const allOrders = storage.getOrders();
    const customerOrders = allOrders.filter(o => o.customerId === parseInt(req.params.id));
    res.json(customerOrders);
  });

  app.get("/api/customers/:id/communications", (req, res) => {
    res.json(storage.getCommunicationLog(parseInt(req.params.id)));
  });

  // ── Drivers ──
  app.get("/api/drivers", (_req, res) => {
    res.json(storage.getDrivers());
  });

  app.get("/api/drivers/:id", (req, res) => {
    const driver = storage.getDriver(parseInt(req.params.id));
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.patch("/api/drivers/:id", (req, res) => {
    const updated = storage.updateDriver(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Driver not found" });
    res.json(updated);
  });

  // ── Vendors ──
  app.get("/api/vendors", (_req, res) => {
    res.json(storage.getVendors());
  });

  app.get("/api/vendors/:id", (req, res) => {
    const vendor = storage.getVendor(parseInt(req.params.id));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  });

  app.patch("/api/vendors/:id", (req, res) => {
    const updated = storage.updateVendor(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Vendor not found" });
    res.json(updated);
  });

  // ── Orders ──
  app.get("/api/orders", (_req, res) => {
    const allOrders = storage.getOrders();
    const enriched = allOrders.map(o => {
      const customer = storage.getCustomer(o.customerId);
      const driver = o.driverId ? storage.getDriver(o.driverId) : null;
      const vendor = o.vendorId ? storage.getVendor(o.vendorId) : null;
      return {
        ...o,
        customerName: customer?.name || "Unknown",
        driverName: driver?.name || "Unassigned",
        vendorName: vendor?.name || "Unassigned",
      };
    });
    res.json(enriched);
  });

  app.get("/api/orders/:id", (req, res) => {
    const order = storage.getOrder(parseInt(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const customer = storage.getCustomer(order.customerId);
    const driver = order.driverId ? storage.getDriver(order.driverId) : null;
    const vendor = order.vendorId ? storage.getVendor(order.vendorId) : null;
    const history = storage.getOrderStatusHistory(order.id);
    res.json({
      ...order,
      customerName: customer?.name || "Unknown",
      driverName: driver?.name || "Unassigned",
      vendorName: vendor?.name || "Unassigned",
      statusHistory: history,
    });
  });

  app.patch("/api/orders/:id", (req, res) => {
    const updated = storage.updateOrder(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Order not found" });
    res.json(updated);
  });

  // ── Reviews ──
  app.get("/api/reviews", (_req, res) => {
    res.json(storage.getReviews());
  });

  // ── Disputes ──
  app.get("/api/disputes", (_req, res) => {
    const allDisputes = storage.getDisputes();
    const enriched = allDisputes.map(d => {
      const customer = storage.getCustomer(d.customerId);
      const order = storage.getOrder(d.orderId);
      return { ...d, customerName: customer?.name || "Unknown", orderNumber: order?.orderNumber || "N/A" };
    });
    res.json(enriched);
  });

  app.get("/api/disputes/:id", (req, res) => {
    const dispute = storage.getDispute(parseInt(req.params.id));
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    const customer = storage.getCustomer(dispute.customerId);
    const order = storage.getOrder(dispute.orderId);
    res.json({
      ...dispute,
      customerName: customer?.name || "Unknown",
      orderNumber: order?.orderNumber || "N/A",
      orderDetails: order,
    });
  });

  app.patch("/api/disputes/:id", (req, res) => {
    const updated = storage.updateDispute(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Dispute not found" });
    res.json(updated);
  });

  // ── Promo Codes ──
  app.get("/api/promo-codes", (_req, res) => {
    res.json(storage.getPromoCodes());
  });

  app.post("/api/promo-codes", (req, res) => {
    try {
      const promo = storage.createPromoCode(req.body);
      res.json(promo);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/promo-codes/:id", (req, res) => {
    const updated = storage.updatePromoCode(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Promo code not found" });
    res.json(updated);
  });

  // ── Transactions ──
  app.get("/api/transactions", (_req, res) => {
    res.json(storage.getTransactions());
  });

  // ── Settings ──
  app.get("/api/settings", (_req, res) => {
    res.json(storage.getSettings());
  });

  app.patch("/api/settings/:key", (req, res) => {
    storage.updateSetting(req.params.key, req.body.value);
    res.json({ success: true });
  });

  // ── Analytics ──
  app.get("/api/analytics/overview", (_req, res) => {
    const allOrders = storage.getOrders();
    const allCustomers = storage.getCustomers();
    const allDrivers = storage.getDrivers();
    const allVendors = storage.getVendors();

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
        .reduce((sum, o) => sum + o.total, 0);
      weeklyRevenue.push({
        week: weekStart.toISOString().split('T')[0],
        revenue: Math.round(revenue * 100) / 100,
      });
    }

    // Top zip codes
    const zipMap: Record<string, number> = {};
    allOrders.forEach(o => {
      zipMap[o.zipCode] = (zipMap[o.zipCode] || 0) + 1;
    });
    const topZips = Object.entries(zipMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([zip, count]) => ({ zip, count }));

    // Customer tier breakdown
    const tierBreakdown: Record<string, number> = {};
    allCustomers.forEach(c => {
      tierBreakdown[c.tier] = (tierBreakdown[c.tier] || 0) + 1;
    });

    // Driver utilization
    const driverUtilization = allDrivers.map(d => ({
      name: d.name,
      trips: d.totalTrips,
      rating: d.rating,
      completionRate: d.completionRate,
      utilization: d.status === "offline" ? 0 : d.status === "busy" ? 0.85 : 0.4,
    }));

    // Vendor performance
    const vendorPerformance = allVendors.map(v => ({
      name: v.name,
      healthScore: v.healthScore,
      qualityScore: v.qualityScore,
      totalOrders: v.totalOrders,
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
      if (c.totalSpend < 100) clvBuckets[0].count++;
      else if (c.totalSpend < 500) clvBuckets[1].count++;
      else if (c.totalSpend < 1500) clvBuckets[2].count++;
      else if (c.totalSpend < 3000) clvBuckets[3].count++;
      else clvBuckets[4].count++;
    });

    // Acquisition funnel (simulated)
    const funnel = [
      { stage: "Website Visits", count: 12500 },
      { stage: "Sign Ups", count: 850 },
      { stage: "First Order", count: 420 },
      { stage: "Repeat Customer", count: 195 },
      { stage: "Subscriber", count: 78 },
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

  return httpServer;
}
