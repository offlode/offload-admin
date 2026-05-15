import { Router } from "express";
import { Resend } from "resend";
import { storage } from "../storage";
import { requireAdmin } from "./auth-utils";
import { log } from "../index";

export const partnerApplicationsRouter = Router();

function requireSuperAdmin(req: any, res: any, next: any) {
  const adminUser = req.adminUser;
  if (!adminUser || (adminUser.role !== "super_admin" && adminUser.role !== "admin")) {
    return res.status(403).json({ message: "Forbidden: super_admin access required" });
  }
  next();
}

// ── Stats summary (must be before :id route) ──
partnerApplicationsRouter.get("/api/admin/partner-applications/stats/summary", requireAdmin, requireSuperAdmin, async (_req, res) => {
  const stats = await storage.getPartnerApplicationStats();
  res.json(stats);
});

// ── List applications ──
partnerApplicationsRouter.get("/api/admin/partner-applications", requireAdmin, requireSuperAdmin, async (req, res) => {
  const filters: { status?: string; applicantType?: string } = {};
  if (req.query.status) filters.status = String(req.query.status);
  if (req.query.applicantType) filters.applicantType = String(req.query.applicantType);
  const apps = await storage.getPartnerApplications(filters);
  res.json(apps);
});

// ── Get single application ──
partnerApplicationsRouter.get("/api/admin/partner-applications/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  const app = await storage.getPartnerApplication(Number(String(req.params.id)));
  if (!app) return res.status(404).json({ message: "Application not found" });
  res.json(app);
});

// ── Approve ──
partnerApplicationsRouter.post("/api/admin/partner-applications/:id/approve", requireAdmin, requireSuperAdmin, async (req, res) => {
  const app = await storage.getPartnerApplication(Number(String(req.params.id)));
  if (!app) return res.status(404).json({ message: "Application not found" });
  if (app.status === "approved") return res.status(400).json({ message: "Application already approved" });

  const adminUser = (req as any).adminUser;

  // Generate temp password
  const tempPassword = `Offload${Date.now().toString(36)}!`;
  const { hashPassword } = await import("./auth-utils");
  const hashedPassword = await hashPassword(tempPassword);

  // Create user record
  const role = app.applicantType === "driver" ? "driver" : "laundromat_owner";
  const newUser = await storage.createUser({
    username: app.email,
    password: hashedPassword,
    name: app.fullName,
    email: app.email,
    phone: app.phone,
    role,
  });

  let resultDriverId: number | null = null;
  let resultVendorId: number | null = null;

  if (app.applicantType === "driver") {
    // Create driver record
    const driver = await storage.createDriver({
      userId: newUser.id,
      name: app.fullName,
      phone: app.phone || "",
      status: "offline",
      rating: 5.0,
      vehicleType: app.vehicleType || "car",
      licensePlate: app.licensePlate || "",
      completedTrips: 0,
    });
    resultDriverId = driver.id;
  } else {
    // Create vendor record
    const vendor = await storage.createVendor({
      name: app.businessName || app.fullName,
      address: app.addressLine || "",
      city: app.city || "",
      phone: app.phone,
      email: app.email,
      status: "active",
      qualityScore: 4.5,
    });
    resultVendorId = vendor.id;
    // Link user to vendor
    await storage.updateUser(newUser.id, { vendorId: resultVendorId } as any);
  }

  // Update application
  await storage.updatePartnerApplication(app.id, {
    status: "approved",
    reviewedByUserId: adminUser.userId,
    reviewedAt: new Date().toISOString(),
    resultUserId: newUser.id,
    resultDriverId,
    resultVendorId,
  });

  // Send approval email
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: "Offload <notifications@offloadusa.com>",
        to: app.email,
        subject: "Your Offload Partner Application Has Been Approved!",
        html: `<div style="font-family:Inter,Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
          <h1 style="color:#5B4BC4;font-size:24px;text-align:center;">Offload</h1>
          <h2 style="color:#1A1A1A;font-size:18px;">Welcome aboard, ${app.fullName}!</h2>
          <p style="color:#555;font-size:14px;">Your partner application has been approved. You can now log in to the Offload portal.</p>
          <p style="color:#555;font-size:14px;"><strong>Username:</strong> ${app.email}</p>
          <p style="color:#555;font-size:14px;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p style="color:#888;font-size:12px;">Please change your password after your first login.</p>
        </div>`,
      }).then(() => log(`Approval email sent to ${app.email}`, "email"))
        .catch((err: any) => log(`Failed to send approval email: ${err?.message}`, "email"));
    } catch (e) {
      log("Resend not available for approval email", "email");
    }
  }

  res.json({
    message: "Application approved",
    userId: newUser.id,
    tempPassword,
    driverId: resultDriverId,
    vendorId: resultVendorId,
  });
});

// ── Decline ──
partnerApplicationsRouter.post("/api/admin/partner-applications/:id/decline", requireAdmin, requireSuperAdmin, async (req, res) => {
  const app = await storage.getPartnerApplication(Number(String(req.params.id)));
  if (!app) return res.status(404).json({ message: "Application not found" });
  if (app.status === "declined") return res.status(400).json({ message: "Application already declined" });

  const adminUser = (req as any).adminUser;

  await storage.updatePartnerApplication(app.id, {
    status: "declined",
    reviewedByUserId: adminUser.userId,
    reviewedAt: new Date().toISOString(),
    declineReason: req.body.reason || null,
  });

  // Send decline email
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: "Offload <notifications@offloadusa.com>",
        to: app.email,
        subject: "Update on Your Offload Partner Application",
        html: `<div style="font-family:Inter,Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
          <h1 style="color:#5B4BC4;font-size:24px;text-align:center;">Offload</h1>
          <h2 style="color:#1A1A1A;font-size:18px;">Application Update</h2>
          <p style="color:#555;font-size:14px;">Thank you for your interest in partnering with Offload. Unfortunately, we are unable to approve your application at this time.</p>
          ${req.body.reason ? `<p style="color:#555;font-size:14px;"><strong>Reason:</strong> ${req.body.reason}</p>` : ""}
          <p style="color:#888;font-size:12px;">If you have questions, please contact support@offloadusa.com.</p>
        </div>`,
      }).then(() => log(`Decline email sent to ${app.email}`, "email"))
        .catch((err: any) => log(`Failed to send decline email: ${err?.message}`, "email"));
    } catch (e) {
      log("Resend not available for decline email", "email");
    }
  }

  res.json({ message: "Application declined" });
});
