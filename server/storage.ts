import {
  users, drivers, vendors, orders, orderStatusHistory,
  reviews, disputes, promoCodes, paymentTransactions, pricingConfig, adminAuditLog,
  passwordResetTokens,
  type User, type InsertUser, type Driver, type Vendor,
  type Order, type Dispute, type InsertDispute,
  type PromoCode, type InsertPromoCode, type Review,
} from "@shared/schema";

type Customer = any;
type InsertCustomer = any;
type InsertDriver = any;
type InsertVendor = any;
type InsertOrder = any;
type Transaction = any;
type PlatformSetting = any;
type CommunicationLogEntry = any;
const customers = users as any;
const transactions = paymentTransactions as any;
const platformSettings = pricingConfig as any;
const communicationLog = adminAuditLog as any;
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, asc, sql } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | undefined>;
  // Drivers
  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  updateDriver(id: number, data: Partial<Driver>): Promise<Driver | undefined>;
  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor | undefined>;
  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined>;
  getOrderStatusHistory(orderId: number): Promise<any[]>;
  getRecentOrders(limit: number): Promise<Order[]>;
  // Reviews
  getReviews(): Promise<Review[]>;
  // Disputes
  getDisputes(): Promise<Dispute[]>;
  getDispute(id: number): Promise<Dispute | undefined>;
  updateDispute(id: number, data: Partial<Dispute>): Promise<Dispute | undefined>;
  // Promo Codes
  getPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  // Transactions
  getTransactions(): Promise<Transaction[]>;
  // Settings
  getSettings(): Promise<PlatformSetting[]>;
  updateSetting(key: string, value: string): Promise<void>;
  // Communication Log
  getCommunicationLog(customerId: number): Promise<CommunicationLogEntry[]>;
  // Analytics / KPIs
  getKPIs(): Promise<any>;
  getRevenueByDay(days: number): Promise<any[]>;
  getOrdersByStatus(): Promise<any[]>;
  // Password Reset Tokens
  createPasswordResetToken(userId: number, token: string, expiresAt: string): Promise<any>;
  getPasswordResetToken(token: string): Promise<any | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  cleanExpiredResetTokens(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.email, email));
    return rows[0];
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(insertUser).returning();
    return rows[0];
  }
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0];
  }
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.id));
  }
  async getCustomer(id: number): Promise<Customer | undefined> {
    const rows = await db.select().from(customers).where(eq(customers.id, id));
    return rows[0];
  }
  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | undefined> {
    const rows = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return rows[0];
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    return db.select().from(drivers).orderBy(desc(drivers.id));
  }
  async getDriver(id: number): Promise<Driver | undefined> {
    const rows = await db.select().from(drivers).where(eq(drivers.id, id));
    return rows[0];
  }
  async updateDriver(id: number, data: Partial<Driver>): Promise<Driver | undefined> {
    const rows = await db.update(drivers).set(data).where(eq(drivers.id, id)).returning();
    return rows[0];
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return db.select().from(vendors).orderBy(desc(vendors.id));
  }
  async getVendor(id: number): Promise<Vendor | undefined> {
    const rows = await db.select().from(vendors).where(eq(vendors.id, id));
    return rows[0];
  }
  async updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor | undefined> {
    const rows = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning();
    return rows[0];
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  async getOrder(id: number): Promise<Order | undefined> {
    const rows = await db.select().from(orders).where(eq(orders.id, id));
    return rows[0];
  }
  async updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined> {
    const rows = await db.update(orders).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(orders.id, id)).returning();
    return rows[0];
  }
  async getOrderStatusHistory(orderId: number): Promise<any[]> {
    return db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.timestamp));
  }
  async getRecentOrders(limit: number): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  }

  // Reviews
  async getReviews(): Promise<Review[]> {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  // Disputes
  async getDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt));
  }
  async getDispute(id: number): Promise<Dispute | undefined> {
    const rows = await db.select().from(disputes).where(eq(disputes.id, id));
    return rows[0];
  }
  async updateDispute(id: number, data: Partial<Dispute>): Promise<Dispute | undefined> {
    const rows = await db.update(disputes).set(data).where(eq(disputes.id, id)).returning();
    return rows[0];
  }

  // Promo Codes
  async getPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }
  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const rows = await db.insert(promoCodes).values(data).returning();
    return rows[0];
  }
  async updatePromoCode(id: number, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const rows = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return rows[0];
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  // Settings
  async getSettings(): Promise<PlatformSetting[]> {
    return db.select().from(platformSettings);
  }
  async updateSetting(key: string, value: string): Promise<void> {
    await db.update(platformSettings).set({ value }).where(eq(platformSettings.key, key));
  }

  // Communication Log
  async getCommunicationLog(customerId: number): Promise<CommunicationLogEntry[]> {
    return db.select().from(communicationLog).where(eq(communicationLog.customerId, customerId)).orderBy(desc(communicationLog.sentAt));
  }

  // KPIs
  async getKPIs(): Promise<any> {
    const allOrders = await db.select().from(orders);
    const allCustomers = await db.select().from(customers);
    const allDrivers = await db.select().from(drivers);
    const allDisputes = await db.select().from(disputes);

    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const activeOrders = allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
    const activeCustomers = allCustomers.filter(c => c.status === 'active').length;
    const activeDrivers = allDrivers.filter(d => d.status !== 'offline').length;
    const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
    const platformFeeRevenue = allOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0);
    const openDisputes = allDisputes.filter(d => d.status === 'open' || d.status === 'investigating').length;
    const slaViolations = allOrders.filter(o => {
      if ((o as any).estimatedDelivery && (o as any).actualDelivery) {
        return new Date((o as any).actualDelivery) > new Date((o as any).estimatedDelivery);
      }
      return false;
    }).length;

    return {
      totalRevenue,
      activeOrders,
      activeCustomers,
      activeDrivers,
      avgOrderValue,
      platformFeeRevenue,
      totalOrders: allOrders.length,
      totalCustomers: allCustomers.length,
      totalDrivers: allDrivers.length,
      openDisputes,
      slaViolations,
      driverShortage: activeDrivers < 3,
    };
  }

  async getRevenueByDay(days: number): Promise<any[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const allOrders = await db.select().from(orders);
    const map: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      map[d.toISOString().split('T')[0]] = 0;
    }

    for (const order of allOrders) {
      const day = order.createdAt.split('T')[0];
      if (day >= cutoffStr && map[day] !== undefined) {
        map[day] += (order.total || 0);
      }
    }

    return Object.entries(map).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));
  }

  async getOrdersByStatus(): Promise<any[]> {
    const allOrders = await db.select().from(orders);
    const statusMap: Record<string, number> = {};
    for (const order of allOrders) {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    }
    return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  }

  // ── Password Reset Tokens ──
  async createPasswordResetToken(userId: number, token: string, expiresAt: string): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
  }
  async getPasswordResetToken(token: string): Promise<{ userId: number; token: string; expiresAt: string; usedAt: string | null } | undefined> {
    const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return rows[0] as any;
  }
  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(passwordResetTokens.token, token));
  }
  async cleanExpiredResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < ${new Date().toISOString()}`);
  }
}

export const storage = new DatabaseStorage();
