import {
  users, customers, drivers, vendors, orders, orderStatusHistory,
  reviews, disputes, promoCodes, transactions, platformSettings, communicationLog,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Driver, type InsertDriver, type Vendor, type InsertVendor,
  type Order, type InsertOrder, type Dispute, type InsertDispute,
  type PromoCode, type InsertPromoCode, type Transaction, type Review,
  type PlatformSetting, type CommunicationLogEntry,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, asc, like, and, gte, lte, sql, count } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  createUser(user: InsertUser): User;
  // Customers
  getCustomers(): Customer[];
  getCustomer(id: number): Customer | undefined;
  updateCustomer(id: number, data: Partial<Customer>): Customer | undefined;
  // Drivers
  getDrivers(): Driver[];
  getDriver(id: number): Driver | undefined;
  updateDriver(id: number, data: Partial<Driver>): Driver | undefined;
  // Vendors
  getVendors(): Vendor[];
  getVendor(id: number): Vendor | undefined;
  updateVendor(id: number, data: Partial<Vendor>): Vendor | undefined;
  // Orders
  getOrders(): Order[];
  getOrder(id: number): Order | undefined;
  updateOrder(id: number, data: Partial<Order>): Order | undefined;
  getOrderStatusHistory(orderId: number): any[];
  getRecentOrders(limit: number): Order[];
  // Reviews
  getReviews(): Review[];
  // Disputes
  getDisputes(): Dispute[];
  getDispute(id: number): Dispute | undefined;
  updateDispute(id: number, data: Partial<Dispute>): Dispute | undefined;
  // Promo Codes
  getPromoCodes(): PromoCode[];
  createPromoCode(data: InsertPromoCode): PromoCode;
  updatePromoCode(id: number, data: Partial<PromoCode>): PromoCode | undefined;
  // Transactions
  getTransactions(): Transaction[];
  // Settings
  getSettings(): PlatformSetting[];
  updateSetting(key: string, value: string): void;
  // Communication Log
  getCommunicationLog(customerId: number): CommunicationLogEntry[];
  // Analytics / KPIs
  getKPIs(): any;
  getRevenueByDay(days: number): any[];
  getOrdersByStatus(): any[];
}

export class DatabaseStorage implements IStorage {
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  createUser(insertUser: InsertUser): User {
    return db.insert(users).values(insertUser).returning().get();
  }

  // Customers
  getCustomers(): Customer[] {
    return db.select().from(customers).orderBy(desc(customers.id)).all();
  }
  getCustomer(id: number): Customer | undefined {
    return db.select().from(customers).where(eq(customers.id, id)).get();
  }
  updateCustomer(id: number, data: Partial<Customer>): Customer | undefined {
    return db.update(customers).set(data).where(eq(customers.id, id)).returning().get();
  }

  // Drivers
  getDrivers(): Driver[] {
    return db.select().from(drivers).orderBy(desc(drivers.id)).all();
  }
  getDriver(id: number): Driver | undefined {
    return db.select().from(drivers).where(eq(drivers.id, id)).get();
  }
  updateDriver(id: number, data: Partial<Driver>): Driver | undefined {
    return db.update(drivers).set(data).where(eq(drivers.id, id)).returning().get();
  }

  // Vendors
  getVendors(): Vendor[] {
    return db.select().from(vendors).orderBy(desc(vendors.id)).all();
  }
  getVendor(id: number): Vendor | undefined {
    return db.select().from(vendors).where(eq(vendors.id, id)).get();
  }
  updateVendor(id: number, data: Partial<Vendor>): Vendor | undefined {
    return db.update(vendors).set(data).where(eq(vendors.id, id)).returning().get();
  }

  // Orders
  getOrders(): Order[] {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).all();
  }
  getOrder(id: number): Order | undefined {
    return db.select().from(orders).where(eq(orders.id, id)).get();
  }
  updateOrder(id: number, data: Partial<Order>): Order | undefined {
    return db.update(orders).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(orders.id, id)).returning().get();
  }
  getOrderStatusHistory(orderId: number): any[] {
    return db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.changedAt)).all();
  }
  getRecentOrders(limit: number): Order[] {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).all();
  }

  // Reviews
  getReviews(): Review[] {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt)).all();
  }

  // Disputes
  getDisputes(): Dispute[] {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt)).all();
  }
  getDispute(id: number): Dispute | undefined {
    return db.select().from(disputes).where(eq(disputes.id, id)).get();
  }
  updateDispute(id: number, data: Partial<Dispute>): Dispute | undefined {
    return db.update(disputes).set(data).where(eq(disputes.id, id)).returning().get();
  }

  // Promo Codes
  getPromoCodes(): PromoCode[] {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt)).all();
  }
  createPromoCode(data: InsertPromoCode): PromoCode {
    return db.insert(promoCodes).values(data).returning().get();
  }
  updatePromoCode(id: number, data: Partial<PromoCode>): PromoCode | undefined {
    return db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning().get();
  }

  // Transactions
  getTransactions(): Transaction[] {
    return db.select().from(transactions).orderBy(desc(transactions.createdAt)).all();
  }

  // Settings
  getSettings(): PlatformSetting[] {
    return db.select().from(platformSettings).all();
  }
  updateSetting(key: string, value: string): void {
    db.update(platformSettings).set({ value }).where(eq(platformSettings.key, key)).run();
  }

  // Communication Log
  getCommunicationLog(customerId: number): CommunicationLogEntry[] {
    return db.select().from(communicationLog).where(eq(communicationLog.customerId, customerId)).orderBy(desc(communicationLog.sentAt)).all();
  }

  // KPIs
  getKPIs(): any {
    const allOrders = db.select().from(orders).all();
    const allCustomers = db.select().from(customers).all();
    const allDrivers = db.select().from(drivers).all();
    const allDisputes = db.select().from(disputes).all();

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
    const activeOrders = allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
    const activeCustomers = allCustomers.filter(c => c.status === 'active').length;
    const activeDrivers = allDrivers.filter(d => d.status !== 'offline').length;
    const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
    const platformFeeRevenue = allOrders.reduce((sum, o) => sum + o.platformFee, 0);
    const openDisputes = allDisputes.filter(d => d.status === 'open' || d.status === 'investigating').length;
    const slaViolations = allOrders.filter(o => {
      if (o.estimatedDelivery && o.actualDelivery) {
        return new Date(o.actualDelivery) > new Date(o.estimatedDelivery);
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

  getRevenueByDay(days: number): any[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const allOrders = db.select().from(orders).all();
    const map: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      map[d.toISOString().split('T')[0]] = 0;
    }

    for (const order of allOrders) {
      const day = order.createdAt.split('T')[0];
      if (day >= cutoffStr && map[day] !== undefined) {
        map[day] += order.total;
      }
    }

    return Object.entries(map).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));
  }

  getOrdersByStatus(): any[] {
    const allOrders = db.select().from(orders).all();
    const statusMap: Record<string, number> = {};
    for (const order of allOrders) {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    }
    return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  }
}

export const storage = new DatabaseStorage();
