import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Package } from "lucide-react";
import { StatusPill, SkeletonList } from "@/features/shared/components";
import { Input } from "@/components/ui/input";
import { ORDER_PROGRESS_STATES } from "@/features/shared/types";

interface QueueOrder {
  id: number;
  order_number: string;
  customer_name: string;
  bags: string;
  status: string;
  created_at: string;
}

// Staff-actionable statuses: orders physically at the facility that staff processes
const STAFF_ACTIVE_STATUSES = ["at_facility", "washing", "folded_packaged", "final_weight_verified"];

// Pre-staff statuses: orders not yet at the facility (driver/system domain)
const UPCOMING_STATUSES = ["order_placed", "confirmed", "driver_assigned", "pickup_in_progress", "picked_up"];

// Post-staff statuses: orders ready or out for delivery
const OUTGOING_STATUSES = ["ready_for_delivery", "out_for_delivery", "delivered", "completed"];

const FILTER_TABS = [
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ready", label: "Ready" },
  { key: "all", label: "All" },
];

function getTabForStatus(status: string): string {
  if (STAFF_ACTIVE_STATUSES.includes(status)) return "active";
  if (UPCOMING_STATUSES.includes(status)) return "upcoming";
  if (OUTGOING_STATUSES.includes(status)) return "outgoing";
  return "all";
}

export default function StaffQueue() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("active");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery<QueueOrder[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/orders");
        const data = await res.json();
        return Array.isArray(data) ? data : data.orders || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    let result = orders ?? [];
    if (activeFilter === "active") {
      result = result.filter((o) => STAFF_ACTIVE_STATUSES.includes(o.status));
    } else if (activeFilter === "upcoming") {
      result = result.filter((o) => UPCOMING_STATUSES.includes(o.status));
    } else if (activeFilter === "ready") {
      result = result.filter((o) => OUTGOING_STATUSES.includes(o.status));
    }
    // "all" shows everything
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, activeFilter, search]);

  const tabCounts = FILTER_TABS.map((tab) => {
    const allOrders = orders ?? [];
    let count: number;
    if (tab.key === "active") {
      count = allOrders.filter((o) => STAFF_ACTIVE_STATUSES.includes(o.status)).length;
    } else if (tab.key === "upcoming") {
      count = allOrders.filter((o) => UPCOMING_STATUSES.includes(o.status)).length;
    } else if (tab.key === "ready") {
      count = allOrders.filter((o) => OUTGOING_STATUSES.includes(o.status)).length;
    } else {
      count = allOrders.length;
    }
    return { ...tab, count };
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Wash Queue</h1>
        <p className="text-sm text-muted-foreground">Orders to process today</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders..."
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabCounts.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? "bg-[#7C3AED] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {activeFilter === "active"
              ? "No orders currently at the facility"
              : activeFilter === "upcoming"
                ? "No incoming orders"
                : activeFilter === "ready"
                  ? "No orders ready for delivery"
                  : "No orders in queue"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            let bags: Array<{ size: string }> = [];
            try { bags = JSON.parse(order.bags || "[]"); } catch { /* empty */ }

            const isUpcoming = UPCOMING_STATUSES.includes(order.status);

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/staff/order/${order.id}`)}
                className={`bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                  isUpcoming ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{order.order_number || `#${order.id}`}</span>
                    <span className="text-xs text-muted-foreground ml-2">{order.customer_name}</span>
                  </div>
                  <StatusPill status={order.status} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{bags.length} bag{bags.length !== 1 ? "s" : ""}</span>
                  <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                  {isUpcoming && <span className="text-amber-500">Awaiting driver</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
