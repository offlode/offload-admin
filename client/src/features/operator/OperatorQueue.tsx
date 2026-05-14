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

// ─── Demo data ───
const DEMO_QUEUE: QueueOrder[] = [
  {
    id: 101,
    order_number: "ORD-2024-0101",
    customer_name: "Maria Santos",
    bags: [
      { size: "Large", weight_lbs: null },
      { size: "Medium", weight_lbs: null },
    ],
    status: "at_facility",
    display_status: "At Facility",
    created_at: "2024-12-20T10:00:00Z",
  },
  {
    id: 102,
    order_number: "ORD-2024-0102",
    customer_name: "James Chen",
    bags: [{ size: "Large", weight_lbs: 12.5 }],
    status: "washing",
    display_status: "Washing",
    created_at: "2024-12-20T09:30:00Z",
  },
  {
    id: 103,
    order_number: "ORD-2024-0103",
    customer_name: "Aisha Johnson",
    bags: [
      { size: "Small", weight_lbs: 5.0 },
      { size: "Small", weight_lbs: 4.5 },
      { size: "Medium", weight_lbs: null },
    ],
    status: "at_facility",
    display_status: "At Facility",
    created_at: "2024-12-20T11:00:00Z",
  },
  {
    id: 104,
    order_number: "ORD-2024-0104",
    customer_name: "David Park",
    bags: [{ size: "Medium", weight_lbs: 8.2 }],
    status: "washing",
    display_status: "Washing",
    created_at: "2024-12-20T08:15:00Z",
  },
  {
    id: 105,
    order_number: "ORD-2024-0105",
    customer_name: "Elena Rodriguez",
    bags: [
      { size: "Large", weight_lbs: null },
      { size: "Large", weight_lbs: null },
    ],
    status: "at_facility",
    display_status: "At Facility",
    created_at: "2024-12-20T11:30:00Z",
  },
];

export default function OperatorQueue() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: queue, isLoading } = useQuery<QueueOrder[]>({
    queryKey: ["/api/wash-queue"],
    placeholderData: DEMO_QUEUE,
  });

  const orders = queue ?? DEMO_QUEUE;

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
