// Admin legacy status mapping: the old admin UI compressed order progress into 9 labels.
// Canonical order writes must use the 24-state Offload FSM stored in offload/shared/schema.ts.
export const ADMIN_TO_CANONICAL_ORDER_STATUS: Record<string, string> = {
  pending: "pending",
  pickup_scheduled: "scheduled",
  picked_up: "picked_up",
  at_vendor: "at_facility",
  processing: "processing",
  ready: "ready_for_delivery",
  out_for_delivery: "driver_en_route_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

export const CANONICAL_TO_ADMIN_ORDER_STATUS: Record<string, string> = {
  pending: "pending",
  scheduled: "pickup_scheduled",
  picked_up: "picked_up",
  at_facility: "at_vendor",
  processing: "processing",
  ready_for_delivery: "ready",
  driver_en_route_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

export const ADMIN_ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Pickup Scheduled" },
  { value: "picked_up", label: "Picked Up" },
  { value: "at_facility", label: "At Vendor" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_delivery", label: "Ready" },
  { value: "driver_en_route_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function toCanonicalOrderStatus(status: string): string {
  return ADMIN_TO_CANONICAL_ORDER_STATUS[status] ?? status;
}
