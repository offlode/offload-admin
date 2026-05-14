import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, ArrowUpDown, Eye, UserPlus, RefreshCw, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StatusPill, TabPills, SkeletonList, SectionHeader, EmptyState } from "@/features/shared/components";
import type { OrderListItem, VendorEmployee } from "@/features/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Tabs ───
const ORDER_TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In-Progress" },
];

// ─── Sort options ───
type SortKey = "newest" | "oldest" | "customer_az";


// ─── Helpers ───
function parseBagCount(bagsJson: string): number {
  try {
    const bags = JSON.parse(bagsJson) as { type: string; count: number }[];
    return bags.reduce((sum, b) => sum + (b.count || 0), 0);
  } catch {
    return 0;
  }
}

function parseBagSummary(bagsJson: string): string {
  try {
    const bags = JSON.parse(bagsJson) as { type: string; count: number }[];
    return bags.map((b) => `${b.count} ${b.type}`).join(", ");
  } catch {
    return "N/A";
  }
}

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "driver_assigned",
  "pickup_in_progress",
  "picked_up",
  "at_facility",
  "washing",
  "folded_packaged",
  "final_weight_verified",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
  "completed",
];

export default function ManagerOrders() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  // ─── Assign dialog state ───
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // ─── Update dialog state ───
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateOrderId, setUpdateOrderId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // ─── Data fetching ───
  const { data: orders, isLoading } = useQuery<OrderListItem[]>({
    queryKey: ["/api/orders", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({ vendor_id: "me" });
      if (activeTab === "today") params.set("today", "true");
      else if (activeTab === "pending") params.set("status", "pending");
      else if (activeTab === "in_progress") params.set("status", "in_progress");
      const res = await apiRequest("GET", `/api/orders?${params.toString()}`);
      return await res.json();
    },
  });

  const { data: drivers } = useQuery<VendorEmployee[]>({
    queryKey: ["/api/vendor-employees", "drivers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vendor-employees?role=driver");
      return await res.json();
    },
  });

  // ─── Mutations ───
  const assignMutation = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { driver_id: driverId, status: "driver_assigned" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Driver assigned successfully." });
      setAssignDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to assign driver.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status updated." });
      setUpdateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update status.", variant: "destructive" });
    },
  });

  // ─── Filter + Sort ───
  const filtered = (orders ?? [])
    .filter((o) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.customer_name.toLowerCase().includes(q) ||
        o.order_number.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.customer_name.localeCompare(b.customer_name);
    });

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader title="Orders Queue" />

      {/* ─── Tabs ─── */}
      <TabPills tabs={ORDER_TABS} active={activeTab} onChange={setActiveTab} />

      {/* ─── Search + Sort ─── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-40">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="customer_az">Customer A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Order List ─── */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="There are no orders matching your filters."
          icon={<Package className="w-10 h-10" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_number} &middot; {parseBagSummary(order.bags)} ({parseBagCount(order.bags)} bags)
                  </p>
                </div>
                <StatusPill status={order.status} label={order.display_status} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {new Date(order.created_at).toLocaleString()}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/manager/orders/${order.id}`)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAssignOrderId(order.id);
                    setSelectedDriverId("");
                    setAssignDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Assign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUpdateOrderId(order.id);
                    setSelectedStatus(order.status);
                    setUpdateDialogOpen(true);
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Update
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Assign Driver Dialog ─── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select a driver for order #{assignOrderId}
            </p>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a driver..." />
              </SelectTrigger>
              <SelectContent>
                {(drivers ?? []).filter((d: VendorEmployee) => d.active).map((d: VendorEmployee) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedDriverId || assignMutation.isPending}
              onClick={() => {
                if (assignOrderId && selectedDriverId) {
                  assignMutation.mutate({
                    orderId: assignOrderId,
                    driverId: Number(selectedDriverId),
                  });
                }
              }}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Update Status Dialog ─── */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Change status for order #{updateOrderId}
            </p>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Choose status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedStatus || updateStatusMutation.isPending}
              onClick={() => {
                if (updateOrderId && selectedStatus) {
                  updateStatusMutation.mutate({
                    orderId: updateOrderId,
                    status: selectedStatus,
                  });
                }
              }}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
