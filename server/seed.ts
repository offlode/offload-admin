import { db } from "./storage";
import {
  users, customers, drivers, vendors, orders, orderStatusHistory,
  reviews, disputes, promoCodes, transactions, platformSettings, communicationLog,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

function hashPasswordSync(pw: string): string {
  // Use scrypt for new passwords — synchronous version for seeding
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(pw, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function randomDate(daysBack: number, daysBackMax?: number): string {
  const now = Date.now();
  const min = daysBackMax ? now - daysBackMax * 86400000 : now - daysBack * 86400000;
  const max = daysBackMax ? now - daysBack * 86400000 : now;
  return new Date(min + Math.random() * (max - min)).toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "William",
  "Mia", "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Alexander",
  "Abigail", "Daniel", "Emily", "Matthew", "Elizabeth", "Jackson", "Sofia", "Sebastian", "Avery", "David",
  "Ella", "Joseph", "Madison", "Samuel", "Scarlett", "John", "Victoria", "Owen", "Aria", "Ryan",
  "Grace", "Nathan", "Chloe", "Caleb", "Penelope", "Christian", "Riley", "Dylan", "Layla", "Isaac"];

const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const streets = ["Oak St", "Maple Ave", "Cedar Ln", "Pine Dr", "Elm Rd", "Birch Ct", "Walnut Way", "Cherry Blvd",
  "Spruce St", "Ash Ave", "Willow Dr", "Poplar Ln", "Hickory Rd", "Magnolia Ct", "Cypress Way"];

const cities = ["San Francisco", "Oakland", "Berkeley", "Palo Alto", "San Jose", "Fremont", "Hayward", "Richmond"];
const zipCodes = ["94102", "94103", "94107", "94110", "94112", "94114", "94116", "94117", "94118", "94121", "94122", "94127", "94131", "94132", "94133", "94134"];

function genAddress(): string {
  return `${Math.floor(Math.random() * 9000) + 100} ${pick(streets)}, ${pick(cities)}, CA ${pick(zipCodes)}`;
}

const orderStatuses = ["pending", "pickup_scheduled", "picked_up", "at_vendor", "processing", "ready", "out_for_delivery", "delivered", "cancelled"];
const serviceTypes = ["standard", "express", "premium"];
const tiers = ["standard", "silver", "gold", "platinum"];
const vehicleTypes = ["sedan", "suv", "van", "truck"];
const disputeTypes = ["damaged", "missing", "late", "wrong_items", "overcharged", "other"];

export function seedDatabase() {
  // Check if already seeded
  const existing = db.select().from(users).all();
  if (existing.length > 0) {
    // Migrate any plain-text or legacy SHA-256 passwords to scrypt
    // scrypt format is "salt:hash" (contains colon), legacy formats don't
    for (const user of existing) {
      if (!user.password.includes(":")) {
        // Can't re-hash from SHA-256 (one-way), but can flag for reset
        // For now, leave legacy passwords — they'll be migrated on next successful login
      }
    }
    return;
  }

  // ── Admin Users ──
  db.insert(users).values([
    { username: "chaimfischer2@gmail.com", password: hashPasswordSync("Offload@Admin2026!"), role: "admin", name: "Chaim Fischer", email: "chaimfischer2@gmail.com" },
    { username: "info@offloadusa.com", password: hashPasswordSync("Offload@Admin2026!"), role: "admin", name: "Offload Admin", email: "info@offloadusa.com" },
    { username: "manager", password: hashPasswordSync("manager123"), role: "manager", name: "Michael Torres", email: "manager@offloadusa.com" },
  ]).run();

  // ── Customers (55) ──
  const customerData = [];
  for (let i = 0; i < 55; i++) {
    const tier = pick(tiers);
    const orderCount = tier === "platinum" ? Math.floor(Math.random() * 30) + 20 :
      tier === "gold" ? Math.floor(Math.random() * 20) + 10 :
      tier === "silver" ? Math.floor(Math.random() * 10) + 5 :
      Math.floor(Math.random() * 5) + 1;
    const avgOrder = rand(25, 80);
    const totalSpend = Math.round(orderCount * avgOrder * 100) / 100;
    const churnRisk = tier === "platinum" ? rand(0.01, 0.15) :
      tier === "gold" ? rand(0.05, 0.25) :
      tier === "silver" ? rand(0.1, 0.4) : rand(0.2, 0.6);

    customerData.push({
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      email: `customer${i + 1}@example.com`,
      phone: `(415) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      address: genAddress(),
      zipCode: pick(zipCodes),
      tier,
      loyaltyPoints: Math.floor(totalSpend * (tier === "platinum" ? 3 : tier === "gold" ? 2 : 1)),
      subscriptionType: Math.random() > 0.6 ? pick(["weekly", "biweekly", "monthly"]) : null,
      churnRisk,
      totalSpend,
      orderCount,
      notes: Math.random() > 0.7 ? pick(["VIP customer - handle with care", "Prefers evening pickups", "Has specific detergent preferences", "Allergic to certain chemicals", "Frequent complainant", null]) : null,
      createdAt: randomDate(30, 365),
      lastOrderAt: randomDate(0, 30),
      status: Math.random() > 0.1 ? "active" : pick(["inactive", "churned"]),
    });
  }
  db.insert(customers).values(customerData).run();

  // ── Drivers (12) ──
  const driverData = [];
  const driverStatuses = ["available", "available", "available", "busy", "busy", "busy", "busy", "offline", "offline", "available", "busy", "available"];
  for (let i = 0; i < 12; i++) {
    driverData.push({
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      email: `driver${i + 1}@offload.com`,
      phone: `(415) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      status: driverStatuses[i],
      rating: rand(3.8, 5.0),
      totalTrips: Math.floor(Math.random() * 500) + 50,
      totalEarnings: rand(3000, 25000),
      payoutRate: rand(4.5, 8.0),
      vehicleType: pick(vehicleTypes),
      licensePlate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9000) + 1000}`,
      joinedAt: randomDate(60, 365),
      completionRate: rand(0.85, 0.99),
      onTimeRate: rand(0.80, 0.98),
    });
  }
  db.insert(drivers).values(driverData).run();

  // ── Vendors (7) ──
  const vendorNames = ["SparkleWash Laundry", "FreshFold Express", "CleanStar Laundromat", "BrightSpin Cleaning", "PurePress Laundry", "SudsMaster Pro", "EcoClean Hub"];
  const vendorData = vendorNames.map((name, i) => ({
    name,
    address: genAddress(),
    phone: `(415) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    email: `${name.toLowerCase().replace(/\s/g, '')}@vendor.com`,
    status: i < 6 ? "active" as const : "pending" as const,
    healthScore: rand(65, 98),
    capacity: pick([30, 40, 50, 60, 80]),
    currentLoad: Math.floor(Math.random() * 30),
    totalOrders: Math.floor(Math.random() * 300) + 50,
    totalPayout: rand(15000, 80000),
    avgProcessingTime: rand(12, 36),
    qualityScore: rand(3.5, 5.0),
    operatingHours: pick(["6AM-10PM", "7AM-9PM", "8AM-11PM", "24 Hours"]),
    joinedAt: randomDate(90, 400),
  }));
  db.insert(vendors).values(vendorData).run();

  // ── Orders (220) ──
  const orderData = [];
  for (let i = 0; i < 220; i++) {
    const customerId = Math.floor(Math.random() * 55) + 1;
    const driverId = Math.random() > 0.1 ? Math.floor(Math.random() * 12) + 1 : null;
    const vendorId = Math.random() > 0.15 ? Math.floor(Math.random() * 7) + 1 : null;
    const serviceType = pick(serviceTypes);
    const subtotal = serviceType === "premium" ? rand(40, 120) : serviceType === "express" ? rand(30, 80) : rand(15, 60);
    const deliveryFee = serviceType === "express" ? 9.99 : serviceType === "premium" ? 14.99 : 5.99;
    const platformFee = Math.round(subtotal * 0.08 * 100) / 100;
    const tax = Math.round(subtotal * 0.085 * 100) / 100;
    const discount = Math.random() > 0.8 ? rand(2, 15) : 0;
    const total = Math.round((subtotal + deliveryFee + platformFee + tax - discount) * 100) / 100;

    const daysBack = Math.floor(Math.random() * 90);
    const createdAt = randomDate(daysBack, daysBack + 1);

    // More orders should be delivered for realistic data
    let status: string;
    if (daysBack > 7) {
      status = Math.random() > 0.05 ? "delivered" : "cancelled";
    } else if (daysBack > 2) {
      status = pick(["delivered", "delivered", "delivered", "out_for_delivery", "ready", "cancelled"]);
    } else {
      status = pick(orderStatuses);
    }

    const scheduledPickup = new Date(new Date(createdAt).getTime() + 3600000).toISOString();
    const estimatedDelivery = new Date(new Date(createdAt).getTime() + (serviceType === "express" ? 14400000 : 86400000)).toISOString();

    orderData.push({
      orderNumber: `OFF-${String(10000 + i).padStart(5, '0')}`,
      customerId,
      driverId,
      vendorId,
      status,
      pickupAddress: genAddress(),
      deliveryAddress: genAddress(),
      zipCode: pick(zipCodes),
      itemCount: Math.floor(Math.random() * 8) + 1,
      weight: rand(3, 25),
      serviceType,
      subtotal,
      deliveryFee,
      platformFee,
      tax,
      discount,
      total,
      promoCode: discount > 0 ? pick(["WELCOME20", "SUMMER10", "VIP15", "FIRST5"]) : null,
      notes: Math.random() > 0.8 ? pick(["Handle with care", "Ring doorbell", "Leave at door", "Call upon arrival"]) : null,
      scheduledPickup,
      actualPickup: status !== "pending" && status !== "pickup_scheduled" ? new Date(new Date(scheduledPickup).getTime() + rand(-600000, 1800000)).toISOString() : null,
      estimatedDelivery,
      actualDelivery: status === "delivered" ? new Date(new Date(estimatedDelivery).getTime() + rand(-3600000, 7200000)).toISOString() : null,
      createdAt,
      updatedAt: createdAt,
    });
  }
  db.insert(orders).values(orderData).run();

  // ── Order Status History ──
  const statusFlow = ["pending", "pickup_scheduled", "picked_up", "at_vendor", "processing", "ready", "out_for_delivery", "delivered"];
  const historyData: any[] = [];
  for (let i = 0; i < 220; i++) {
    const order = orderData[i];
    const statusIdx = statusFlow.indexOf(order.status);
    if (statusIdx >= 0) {
      for (let j = 0; j <= statusIdx; j++) {
        historyData.push({
          orderId: i + 1,
          status: statusFlow[j],
          note: j === 0 ? "Order created" : null,
          changedBy: j < 2 ? "system" : pick(["system", "driver", "vendor"]),
          changedAt: new Date(new Date(order.createdAt).getTime() + j * 3600000).toISOString(),
        });
      }
    }
  }
  if (historyData.length > 0) {
    // Insert in chunks
    for (let i = 0; i < historyData.length; i += 100) {
      db.insert(orderStatusHistory).values(historyData.slice(i, i + 100)).run();
    }
  }

  // ── Reviews (35) ──
  const reviewData = [];
  for (let i = 0; i < 35; i++) {
    reviewData.push({
      orderId: Math.floor(Math.random() * 150) + 1,
      customerId: Math.floor(Math.random() * 55) + 1,
      vendorId: Math.random() > 0.3 ? Math.floor(Math.random() * 7) + 1 : null,
      driverId: Math.random() > 0.3 ? Math.floor(Math.random() * 12) + 1 : null,
      rating: pick([3, 4, 4, 4, 5, 5, 5, 5, 5, 2]),
      comment: pick([
        "Excellent service! Clothes came back perfectly clean.",
        "Good delivery but items took longer than expected.",
        "Very happy with the stain removal on my dress shirt.",
        "Driver was friendly and professional.",
        "Decent quality, but could be faster.",
        "Outstanding service as always. Best laundry service in the city!",
        "Missing a sock from my order. Otherwise fine.",
        "Clothes had a slight chemical smell.",
        "Perfect fold and press. Will use again!",
        "Average experience, nothing special.",
        null,
      ]),
      createdAt: randomDate(0, 60),
    });
  }
  db.insert(reviews).values(reviewData).run();

  // ── Disputes (12) ──
  const aiSuggestions = [
    "Based on order history and customer tier, recommend partial refund of 50%. Customer has 15+ orders with high lifetime value.",
    "Photos show clear damage. Full refund recommended per SLA policy. Flag vendor for quality review.",
    "Delivery was 2 hours late due to driver delay. Suggest $10 credit and priority on next order.",
    "Items listed as missing were marked as delivered. Recommend investigation with driver GPS data.",
    "Overcharge appears to be a weight calculation error. Recommend adjustment and system audit.",
    "Customer has disputed 3 orders in 30 days. Pattern suggests possible abuse. Recommend investigation.",
  ];

  const disputeData = [];
  for (let i = 0; i < 12; i++) {
    const type = pick(disputeTypes);
    const status = i < 4 ? "open" : i < 7 ? "investigating" : i < 10 ? "resolved" : "escalated";
    disputeData.push({
      orderId: Math.floor(Math.random() * 100) + 1,
      customerId: Math.floor(Math.random() * 55) + 1,
      type,
      status,
      priority: pick(["low", "medium", "medium", "high", "critical"]),
      description: pick([
        "My clothes came back with bleach stains that weren't there before.",
        "Two shirts are missing from my order.",
        "Order was supposed to be delivered by 3pm but didn't arrive until 7pm.",
        "Received someone else's clothes mixed in with mine.",
        "Charged for premium service but received standard.",
        "Button on my favorite jacket was broken during cleaning.",
      ]),
      aiSuggestion: pick(aiSuggestions),
      aiConfidence: rand(0.65, 0.95),
      resolution: status === "resolved" ? pick(["credit", "refund", "partial_refund", "deny"]) : null,
      resolutionAmount: status === "resolved" ? rand(5, 50) : null,
      resolutionNote: status === "resolved" ? "Resolved per standard policy." : null,
      createdAt: randomDate(0, 30),
      resolvedAt: status === "resolved" ? randomDate(0, 7) : null,
    });
  }
  db.insert(disputes).values(disputeData).run();

  // ── Promo Codes ──
  const promoData = [
    { code: "WELCOME20", description: "20% off first order", discountType: "percentage", discountValue: 20, minOrderAmount: 15, maxUses: 1000, currentUses: 342, status: "active", expiresAt: "2025-12-31T23:59:59Z", createdAt: randomDate(60, 120) },
    { code: "SUMMER10", description: "10% off summer special", discountType: "percentage", discountValue: 10, minOrderAmount: 20, maxUses: 500, currentUses: 187, status: "active", expiresAt: "2025-09-30T23:59:59Z", createdAt: randomDate(30, 60) },
    { code: "VIP15", description: "15% off for VIP customers", discountType: "percentage", discountValue: 15, minOrderAmount: 30, maxUses: null, currentUses: 89, status: "active", expiresAt: null, createdAt: randomDate(90, 180) },
    { code: "FIRST5", description: "$5 off first order", discountType: "fixed", discountValue: 5, minOrderAmount: 10, maxUses: 2000, currentUses: 1456, status: "active", expiresAt: "2025-12-31T23:59:59Z", createdAt: randomDate(120, 200) },
    { code: "REFER10", description: "$10 referral bonus", discountType: "fixed", discountValue: 10, minOrderAmount: 25, maxUses: null, currentUses: 234, status: "active", expiresAt: null, createdAt: randomDate(90, 180) },
    { code: "SPRING15", description: "Spring cleaning 15% off", discountType: "percentage", discountValue: 15, minOrderAmount: 20, maxUses: 300, currentUses: 300, status: "expired", expiresAt: "2025-04-30T23:59:59Z", createdAt: randomDate(100, 150) },
    { code: "FLASH30", description: "Flash sale 30% off", discountType: "percentage", discountValue: 30, minOrderAmount: 40, maxUses: 100, currentUses: 100, status: "inactive", expiresAt: "2025-03-15T23:59:59Z", createdAt: randomDate(60, 90) },
    { code: "FREESHIP", description: "Free delivery", discountType: "fixed", discountValue: 5.99, minOrderAmount: 30, maxUses: 500, currentUses: 211, status: "active", expiresAt: "2025-08-31T23:59:59Z", createdAt: randomDate(20, 40) },
  ];
  db.insert(promoCodes).values(promoData).run();

  // ── Transactions ──
  const txData: any[] = [];
  for (let i = 0; i < 220; i++) {
    const order = orderData[i];
    if (order.status === "delivered" || order.status === "cancelled") {
      txData.push({
        orderId: i + 1,
        type: "payment",
        amount: order.total,
        status: "completed",
        recipientType: "platform",
        recipientId: null,
        description: `Payment for order ${order.orderNumber}`,
        createdAt: order.createdAt,
      });

      if (order.status === "delivered" && order.vendorId) {
        txData.push({
          orderId: i + 1,
          type: "payout_vendor",
          amount: Math.round(order.subtotal * 0.7 * 100) / 100,
          status: pick(["completed", "completed", "completed", "pending"]),
          recipientType: "vendor",
          recipientId: order.vendorId,
          description: `Vendor payout for ${order.orderNumber}`,
          createdAt: new Date(new Date(order.createdAt).getTime() + 86400000 * 3).toISOString(),
        });
      }
      if (order.status === "delivered" && order.driverId) {
        txData.push({
          orderId: i + 1,
          type: "payout_driver",
          amount: order.deliveryFee * 0.8,
          status: "completed",
          recipientType: "driver",
          recipientId: order.driverId,
          description: `Driver payout for ${order.orderNumber}`,
          createdAt: new Date(new Date(order.createdAt).getTime() + 86400000 * 2).toISOString(),
        });
      }
    }
  }
  // Insert in chunks
  for (let i = 0; i < txData.length; i += 100) {
    db.insert(transactions).values(txData.slice(i, i + 100)).run();
  }

  // ── Platform Settings ──
  db.insert(platformSettings).values([
    { key: "standard_delivery_fee", value: "5.99", category: "pricing" },
    { key: "express_delivery_fee", value: "9.99", category: "pricing" },
    { key: "premium_delivery_fee", value: "14.99", category: "pricing" },
    { key: "platform_fee_rate", value: "0.08", category: "pricing" },
    { key: "tax_rate", value: "0.085", category: "pricing" },
    { key: "overage_rate_per_lb", value: "1.50", category: "pricing" },
    { key: "standard_sla_hours", value: "24", category: "operations" },
    { key: "express_sla_hours", value: "6", category: "operations" },
    { key: "premium_sla_hours", value: "4", category: "operations" },
    { key: "loyalty_points_per_dollar", value: "1", category: "loyalty" },
    { key: "silver_tier_threshold", value: "500", category: "loyalty" },
    { key: "gold_tier_threshold", value: "1500", category: "loyalty" },
    { key: "platinum_tier_threshold", value: "3000", category: "loyalty" },
  ]).run();

  // ── Communication Log ──
  const commTypes = ["email", "sms", "call", "in_app"];
  const commData: any[] = [];
  for (let i = 0; i < 40; i++) {
    commData.push({
      customerId: Math.floor(Math.random() * 55) + 1,
      type: pick(commTypes),
      subject: pick(["Order update", "Delivery confirmation", "Promo offer", "Survey request", "Account issue", "Feedback follow-up"]),
      content: pick([
        "Your order has been picked up and is being processed.",
        "Your laundry has been delivered. Thank you!",
        "Special offer: 20% off your next order!",
        "We'd love to hear about your recent experience.",
        "Your account subscription has been renewed.",
        "Thank you for your feedback. We're addressing your concerns.",
      ]),
      sentBy: pick(["system", "admin", "support"]),
      sentAt: randomDate(0, 60),
    });
  }
  db.insert(communicationLog).values(commData).run();

  console.log("Database seeded successfully!");
}

/**
 * Ensures the super admin (chaimfischer2@gmail.com) exists in the database.
 * Runs on every startup — creates the user if missing, or updates if the
 * old "admin" account still exists from a previous seed.
 */
export function ensureSuperAdmin() {
  const superAdminUsername = "chaimfischer2@gmail.com";

  // Check if super admin already exists
  const existing = db.select().from(users).where(eq(users.username, superAdminUsername)).all();
  if (existing.length > 0) return;

  // Check if old "admin" user exists and upgrade it
  const oldAdmin = db.select().from(users).where(eq(users.username, "admin")).all();
  if (oldAdmin.length > 0) {
    const randomPw = crypto.randomBytes(32).toString("hex");
    db.update(users)
      .set({
        username: superAdminUsername,
        name: "Chaim Fischer",
        role: "admin",
        password: hashPasswordSync(randomPw),
      })
      .where(eq(users.username, "admin"))
      .run();
    console.log("Upgraded old admin account to super admin: chaimfischer2@gmail.com");
    return;
  }

  // Neither exists — create fresh
  const randomPw = crypto.randomBytes(32).toString("hex");
  db.insert(users).values({
    username: superAdminUsername,
    password: hashPasswordSync(randomPw),
    role: "admin",
    name: "Chaim Fischer",
  }).run();
  console.log("Created super admin: chaimfischer2@gmail.com");
}
