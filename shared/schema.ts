import { pgTable, text, integer, doublePrecision, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users (admin accounts) ──
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  name: text("name").notNull().default("Admin"),
  email: text("email"),
});

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Password Reset Tokens ──
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull(),
});

// ── Customers ──
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  zipCode: text("zip_code").notNull(),
  tier: text("tier").notNull().default("standard"), // standard, silver, gold, platinum
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  subscriptionType: text("subscription_type"), // null, weekly, biweekly, monthly
  churnRisk: doublePrecision("churn_risk").notNull().default(0.1),
  totalSpend: doublePrecision("total_spend").notNull().default(0),
  orderCount: integer("order_count").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  lastOrderAt: text("last_order_at"),
  status: text("status").notNull().default("active"), // active, inactive, churned
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ── Drivers ──
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("offline"), // available, busy, offline
  rating: doublePrecision("rating").notNull().default(5.0),
  totalTrips: integer("total_trips").notNull().default(0),
  totalEarnings: doublePrecision("total_earnings").notNull().default(0),
  payoutRate: doublePrecision("payout_rate").notNull().default(5.0),
  vehicleType: text("vehicle_type").notNull().default("sedan"),
  licensePlate: text("license_plate").notNull(),
  joinedAt: text("joined_at").notNull(),
  completionRate: doublePrecision("completion_rate").notNull().default(0.95),
  onTimeRate: doublePrecision("on_time_rate").notNull().default(0.92),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

// ── Vendors (Laundromats) ──
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("active"), // active, suspended, pending
  healthScore: doublePrecision("health_score").notNull().default(85),
  capacity: integer("capacity").notNull().default(50),
  currentLoad: integer("current_load").notNull().default(0),
  totalOrders: integer("total_orders").notNull().default(0),
  totalPayout: doublePrecision("total_payout").notNull().default(0),
  avgProcessingTime: doublePrecision("avg_processing_time").notNull().default(24), // hours
  qualityScore: doublePrecision("quality_score").notNull().default(4.5),
  operatingHours: text("operating_hours").notNull().default("6AM-10PM"),
  joinedAt: text("joined_at").notNull(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// ── Orders ──
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  driverId: integer("driver_id"),
  vendorId: integer("vendor_id"),
  status: text("status").notNull().default("pending"),
  // pending, pickup_scheduled, picked_up, at_vendor, processing, ready, out_for_delivery, delivered, cancelled
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  zipCode: text("zip_code").notNull(),
  itemCount: integer("item_count").notNull().default(1),
  weight: doublePrecision("weight"), // lbs
  serviceType: text("service_type").notNull().default("standard"), // standard, express, premium
  subtotal: doublePrecision("subtotal").notNull(),
  deliveryFee: doublePrecision("delivery_fee").notNull().default(5.99),
  platformFee: doublePrecision("platform_fee").notNull().default(2.99),
  tax: doublePrecision("tax").notNull().default(0),
  discount: doublePrecision("discount").notNull().default(0),
  total: doublePrecision("total").notNull(),
  promoCode: text("promo_code"),
  notes: text("notes"),
  scheduledPickup: text("scheduled_pickup"),
  actualPickup: text("actual_pickup"),
  estimatedDelivery: text("estimated_delivery"),
  actualDelivery: text("actual_delivery"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ── Order Status History ──
export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  changedBy: text("changed_by").notNull().default("system"),
  changedAt: text("changed_at").notNull(),
});

// ── Reviews ──
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerId: integer("customer_id").notNull(),
  vendorId: integer("vendor_id"),
  driverId: integer("driver_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

export type Review = typeof reviews.$inferSelect;

// ── Disputes ──
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(), // damaged, missing, late, wrong_items, overcharged, other
  status: text("status").notNull().default("open"), // open, investigating, resolved, escalated
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  description: text("description").notNull(),
  aiSuggestion: text("ai_suggestion"),
  aiConfidence: doublePrecision("ai_confidence"),
  resolution: text("resolution"), // credit, refund, deny, partial_refund
  resolutionAmount: doublePrecision("resolution_amount"),
  resolutionNote: text("resolution_note"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// ── Promo Codes ──
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(), // percentage, fixed
  discountValue: doublePrecision("discount_value").notNull(),
  minOrderAmount: doublePrecision("min_order_amount").notNull().default(0),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").notNull().default(0),
  status: text("status").notNull().default("active"), // active, inactive, expired
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// ── Transactions ──
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  type: text("type").notNull(), // payment, refund, payout_driver, payout_vendor, platform_fee
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("completed"), // pending, completed, failed
  recipientType: text("recipient_type"), // customer, driver, vendor, platform
  recipientId: integer("recipient_id"),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Transaction = typeof transactions.$inferSelect;

// ── Platform Settings ──
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

// ── Communication Log ──
export const communicationLog = pgTable("communication_log", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(), // email, sms, call, in_app
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentBy: text("sent_by").notNull(),
  sentAt: text("sent_at").notNull(),
});

export type CommunicationLogEntry = typeof communicationLog.$inferSelect;
