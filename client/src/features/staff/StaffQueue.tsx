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

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "at_facility", label: "At Facility" },
  { key: "washing", label: "Washing" },
  { key: "folded_packaged", label: "Folded" },
  { key: "ready_for_delivery", label: "Ready" },
];

export default function StaffQueue() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
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
    if (activeFilter !== "all") {
      result = result.filter((o) => o.status === activeFilter);
    }
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

  const tabCounts = FILTER_TABS.map((tab) => ({
    ...tab,
    count: tab.key === "all"
      ? (orders ?? []).length
      : (orders ?? []).filter((o) => o.status === tab.key).length,
  }));

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
          <p className="text-sm">No orders in queue</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            let bags: Array<{ size: string }> = [];
            try { bags = JSON.parse(order.bags || "[]"); } catch { /* empty */ }

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/staff/order/${order.id}`)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/30 transition-colors"
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
