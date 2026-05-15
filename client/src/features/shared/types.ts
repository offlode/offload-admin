// Shared types for Manager, Driver, and Operator role apps

// ─── Order Progress (13-state display labels) ───
export const ORDER_PROGRESS_STATES = [
  { key: "order_placed", label: "Order Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "driver_assigned", label: "Driver Assigned" },
  { key: "picked_up", label: "Picked Up" },
  { key: "at_facility", label: "At Facility" },
  { key: "washing", label: "Washing" },
  { key: "wash_complete", label: "Wash Complete" },
  { key: "folded_packaged", label: "Folded & Packaged" },
  { key: "final_weight_verified", label: "Final Weight Verified" },
  { key: "ready_for_delivery", label: "Ready for Delivery" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
] as const;

export type OrderProgressKey = (typeof ORDER_PROGRESS_STATES)[number]["key"];

// ─── Status Pill Colors (canonical source: shared/constants.ts) ───
export { STATUS_COLORS } from "./constants";

// ─── Vendor Employee ───
export interface VendorEmployee {
  id: number;
  vendor_id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  role: "driver" | "operator" | "manager";
  permissions: number;
  active: boolean;
  joined_at: string;
  last_login_at: string | null;
}

// ─── Bank Account ───
export interface BankAccount {
  id: number;
  vendor_id: number;
  bankName: string;
  lastFour: string;
  accountType: string;
  status: string;
}

// ─── Bonus Rule ───
export interface BonusRule {
  id: number;
  name: string;
  ruleType: string;
  threshold: number;
  amountCents: number;
  isActive: boolean;
  progress?: number;
}

// ─── Bonus Payout ───
export interface BonusPayout {
  id: number;
  vendorId: number;
  ruleId: number;
  amountCents: number;
  reason: string;
  createdAt: string;
}

// ─── Wash Run ───
export interface WashRun {
  id: number;
  orderId: number;
  status: "pending" | "in_progress" | "completed";
  washType: string;
  clothingCategory: string;
  weightLbs: number | null;
  weightAfterLbs: number | null;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

// ─── Manager KPI ───
export interface ManagerKPI {
  new_orders: number;
  active_orders: number;
  completed_today: number;
  revenue_this_week: number;
}

// ─── Performance Snapshot ───
export interface PerformanceSnapshot {
  rating: number;
  on_time_pct: number;
  growth_pct: number;
}

// ─── Driver Stats ───
export interface DriverStats {
  earned_today: number;
  rating: number;
  miles_today: number;
  trips_completed: number;
}

// ─── Operator KPI ───
export interface OperatorKPI {
  processed_today: number;
  currently_washing: number;
  avg_wash_time_min: number;
  quality_pct: number;
}

// ─── Clothing Types (D9) ───
export const CLOTHING_TYPES = [
  "Shirts", "Undershirts", "Undergarments", "Bras", "Socks",
  "Towels", "Bedsheets", "Pants", "Dresses", "Baby clothes",
  "Gym clothes", "Delicates", "Dark items", "Whites",
] as const;

// ─── Wash Preferences ───
export interface WashPreferences {
  detergent: string;
  water_temp: string;
  drying: string;
  stain_treatment: boolean;
  extra_rinse: boolean;
  delicate_wash: boolean;
  separated: boolean;
  clothing_types: string[];
  special_instructions: string;
}

// ─── Employee Permissions (bitmask) ───
export const EMPLOYEE_PERMISSIONS = [
  { bit: 1, label: "View Orders" },
  { bit: 2, label: "Update Wash Status" },
  { bit: 4, label: "Weight Verification" },
  { bit: 8, label: "Photo Upload" },
  { bit: 16, label: "Wash Preferences" },
] as const;

// ─── Order for list views ───
export interface OrderListItem {
  id: number;
  order_number: string;
  customer_name: string;
  customer_id: number;
  bags: string;
  status: string;
  display_status: string;
  created_at: string;
  scheduled_pickup: string | null;
  vendor_id: number | null;
  driver_id: number | null;
}
