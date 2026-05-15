import type { Express } from "express";
import { type Server } from "http";

import { authRouter } from "./routes/auth";
import { ordersRouter } from "./routes/orders";
import { vendorsRouter } from "./routes/vendors";
import { driversRouter } from "./routes/drivers";
import { adminRouter } from "./routes/admin";
import { customersRouter } from "./routes/customers";
import { laundromatRouter } from "./routes/laundromats";
import { partnerApplicationsRouter } from "./routes/partner-applications";
import { pricingConfigRouter } from "./routes/pricing-config";
import { notificationRulesRouter } from "./routes/notification-rules";
import { stripeReconciliationRouter } from "./routes/stripe-reconciliation";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "offload-admin",
      timestamp: new Date().toISOString(),
    });
  });

  // ── Security headers ─────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // ── Cookie parser (simple, no external dep) ──────────────────────────────
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((pair) => {
      const [k, ...vs] = pair.trim().split("=");
      if (k) cookies[k.trim()] = decodeURIComponent(vs.join("=").trim());
    });
    (req as any).cookies = cookies;
    next();
  });

  // ── Seed database disabled in production admin ───────────────────────────

  // ── Register sub-routers ─────────────────────────────────────────────────
  app.use(authRouter);
  app.use(ordersRouter);
  app.use(vendorsRouter);
  app.use(driversRouter);
  app.use(adminRouter);
  app.use(customersRouter);
  app.use(laundromatRouter);
  app.use(partnerApplicationsRouter);
  app.use(pricingConfigRouter);
  app.use(notificationRulesRouter);
  app.use(stripeReconciliationRouter);

  return httpServer;
}
