import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusPill, SkeletonList } from "@/features/shared/components";

interface OrderItem {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  created_at: string;
  bags: string;
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "washing", label: "Washing" },
  { key: "ready_for_delivery", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

export default function OwnerOrders() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery<OrderItem[]>({
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

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Your laundromat's orders</p>
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
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? "bg-[#5B4BC4] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/owner/orders/${order.id}`)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{order.order_number || `#${order.id}`}</span>
                  <span className="text-xs text-muted-foreground ml-2">{order.customer_name}</span>
                </div>
                <StatusPill status={order.status} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
