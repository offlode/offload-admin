// ─── Consolidated Status Color Maps ───
// Previously duplicated across dashboard.tsx, drivers.tsx, disputes.tsx, and shared/types.ts

/** HSL chart colors for order status (used in recharts PieChart) */
export const STATUS_CHART_COLORS: Record<string, string> = {
  pending: "hsl(43, 74%, 49%)",
  pickup_scheduled: "hsl(220, 70%, 50%)",
  scheduled: "hsl(220, 70%, 50%)",
  picked_up: "hsl(248, 51%, 53%)",
  at_vendor: "hsl(280, 60%, 50%)",
  at_facility: "hsl(280, 60%, 50%)",
  processing: "hsl(200, 70%, 50%)",
  ready: "hsl(270, 95%, 75%)",
  ready_for_delivery: "hsl(270, 95%, 75%)",
  out_for_delivery: "hsl(30, 80%, 50%)",
  driver_en_route_delivery: "hsl(30, 80%, 50%)",
  delivered: "hsl(140, 60%, 40%)",
  cancelled: "hsl(0, 70%, 50%)",
};

/** Tailwind CSS classes for status pills (used in StatusPill component) */
export const STATUS_COLORS: Record<string, string> = {
  order_placed: "bg-blue-500/20 text-blue-400",
  pending: "bg-gray-500/20 text-gray-400",
  confirmed: "bg-purple-500/20 text-purple-400",
  driver_assigned: "bg-purple-500/20 text-purple-400",
  picked_up: "bg-blue-500/20 text-blue-400",
  at_facility: "bg-blue-500/20 text-blue-400",
  washing: "bg-purple-500/20 text-purple-400",
  wash_complete: "bg-purple-500/20 text-purple-400",
  folded_packaged: "bg-green-500/20 text-green-400",
  final_weight_verified: "bg-green-500/20 text-green-400",
  ready_for_delivery: "bg-green-500/20 text-green-400",
  out_for_delivery: "bg-orange-500/20 text-orange-400",
  delivered: "bg-green-500/20 text-green-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
  urgent: "bg-red-500/20 text-red-400",
  active: "bg-green-500/20 text-green-400",
  inactive: "bg-gray-500/20 text-gray-400",
};

/** Badge variant strings for driver status */
export const DRIVER_STATUS_COLORS: Record<string, string> = {
  available: "default",
  busy: "secondary",
  offline: "outline",
};

/** Badge variant strings for dispute status */
export const DISPUTE_STATUS_COLORS: Record<string, string> = {
  open: "destructive",
  investigating: "default",
  resolved: "secondary",
  escalated: "destructive",
};

/** Badge variant strings for dispute priority */
export const DISPUTE_PRIORITY_COLORS: Record<string, string> = {
  low: "secondary",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};
