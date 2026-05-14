import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Package } from "lucide-react";
import { StatusPill, TabPills, SkeletonList, EmptyState, SectionHeader } from "@/features/shared/components";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Types ───
interface QueueBag {
  size: string;
  weight_lbs: number | null;
}

interface QueueOrder {
  id: number;
  order_number: string;
  customer_name: string;
  bags: QueueBag[];
  status: string;
  display_status: string;
  created_at: string;
}

// ─── Filter tabs ───
const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "at_facility", label: "Arrived" },
  { key: "weighed", label: "Weighed" },
  { key: "separated", label: "Separated" },
  { key: "washing", label: "Washing" },
];


export default function OperatorQueue() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const statusParam = activeFilter !== "all" ? `?status=${activeFilter}` : "";
  const { data: queue, isLoading } = useQuery<QueueOrder[]>({
    queryKey: ["/api/wash-queue", activeFilter],
    queryFn: async () => {
      const { apiRequest } = await import("@/lib/queryClient");
      const res = await apiRequest("GET", `/api/wash-queue${statusParam}`);
      return res.json();
    },
  });

  const orders = queue ?? [];

  // Filter + search
  const filtered = useMemo(() => {
    let result = orders;
    if (activeFilter !== "all") {
      result = result.filter((o) => o.status === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, activeFilter, search]);

  // Compute tab counts
  const tabsWithCounts = FILTER_TABS.map((tab) => ({
    ...tab,
    count:
      tab.key === "all"
        ? orders.length
        : orders.filter((o) => o.status === tab.key).length,
  }));

  return (
    <div className="min-h-screen bg-background p-4 pb-20 max-w-2xl mx-auto">
      <SectionHeader title="Wash Queue" />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by order # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter pills */}
      <div className="mb-4">
        <TabPills
          tabs={tabsWithCounts}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* Queue list */}
      {isLoading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            search
              ? "Try a different search term."
              : "No orders match this filter."
          }
          icon={<Package className="w-10 h-10" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">
                      {order.order_number}
                    </span>
                    <StatusPill status={order.status} label={order.display_status} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.bags.length} bag{order.bags.length !== 1 ? "s" : ""}{" "}
                    &middot;{" "}
                    {order.bags.map((b) => b.size).join(", ")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/operator/orders/${order.id}`)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
