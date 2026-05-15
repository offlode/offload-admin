import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { ArrowLeft, Package, User, Send, ChevronRight, Truck, AlertTriangle, FlaskConical } from "lucide-react";
import { StatusPill, OrderTimeline } from "@/features/shared/components";
import { ORDER_PROGRESS_STATES } from "@/features/shared/types";

interface OrderDetail {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  pickup_address: string;
  bags: string;
  service_type: string;
  created_at: string;
  laundromat_name: string | null;
}

interface ChatMessage {
  id: number;
  sender_role: string;
  content: string;
  timestamp: string;
}

// Canonical 13-state FSM staff-relevant transitions only.
// Staff handles orders from at_facility through ready_for_delivery.
// Pre-staff states (order_placed, confirmed, driver_assigned, picked_up) are driver/system states.
// Post-staff states (out_for_delivery, delivered, completed) are driver states.
const STAFF_TRANSITIONS: Record<string, string> = {
  at_facility: "washing",
  washing: "folded_packaged",
  folded_packaged: "final_weight_verified",
  final_weight_verified: "ready_for_delivery",
};

const TRANSITION_LABELS: Record<string, string> = {
  washing: "Start Washing",
  folded_packaged: "Mark Folded & Packaged",
  final_weight_verified: "Verify Final Weight",
  ready_for_delivery: "Mark Ready for Delivery",
};

// States where staff is waiting for driver action
const PRE_STAFF_STATES = ["order_placed", "confirmed", "driver_assigned", "pickup_in_progress", "picked_up"];

// Informational messages for pre-staff states
const PRE_STAFF_MESSAGES: Record<string, string> = {
  order_placed: "Order has been placed. Waiting for confirmation and driver assignment.",
  confirmed: "Order confirmed. Waiting for driver to be assigned and pick up the order.",
  driver_assigned: "Driver has been assigned. Waiting for driver to pick up and deliver to facility.",
  pickup_in_progress: "Driver is picking up the order. It will arrive at the facility shortly.",
  picked_up: "Driver has picked up the order. It should arrive at the facility soon.",
};

// Post-staff states where the order has left the facility
const POST_STAFF_STATES = ["out_for_delivery", "delivered", "completed"];

const POST_STAFF_MESSAGES: Record<string, string> = {
  ready_for_delivery: "Order is ready for delivery. Waiting for driver pickup.",
  out_for_delivery: "Order is out for delivery to the customer.",
  delivered: "Order has been delivered to the customer.",
  completed: "Order is complete.",
};

// Dev-mode transitions to simulate driver actions for testing
const DEV_TRANSITIONS: Record<string, { next: string; label: string }[]> = {
  confirmed: [
    { next: "driver_assigned", label: "Simulate: Assign Driver" },
  ],
  driver_assigned: [
    { next: "picked_up", label: "Simulate: Driver Picked Up" },
  ],
  picked_up: [
    { next: "at_facility", label: "Simulate: Arrived at Facility" },
  ],
};

export default function StaffOrderDetail() {
  const [, params] = useRoute("/staff/order/:id");
  const orderId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [devMode, setDevMode] = useState(false);

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders/${orderId}`);
      return res.json();
    },
    enabled: !!orderId,
  });

  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/orders", orderId, "messages"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/orders/${orderId}/messages`);
        return res.json();
      } catch {
        return [];
      }
    },
    enabled: !!orderId,
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/messages`, {
        content: chatInput,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "messages"] });
      setChatInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Error sending message", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !order) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const nextStatus = STAFF_TRANSITIONS[order.status];
  const isPreStaff = PRE_STAFF_STATES.includes(order.status);
  const isPostStaff = POST_STAFF_STATES.includes(order.status);
  const devTransitions = devMode ? DEV_TRANSITIONS[order.status] : undefined;

  let bags: Array<{ size: string; weight_lbs?: number }> = [];
  try { bags = JSON.parse(order.bags || "[]"); } catch { /* empty */ }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <a href="#/staff/queue">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </a>
        <div>
          <h1 className="text-xl font-bold">{order.order_number || `Order #${order.id}`}</h1>
          <StatusPill status={order.status} />
        </div>
      </div>

      {/* Order details */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{bags.length} bag{bags.length !== 1 ? "s" : ""} - {order.service_type?.replace(/_/g, " ") || "Wash & Fold"}</span>
        </div>
      </div>

      {/* Pre-staff informational message */}
      {isPreStaff && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <Truck className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-500">Awaiting Driver</p>
            <p className="text-sm text-muted-foreground mt-1">
              {PRE_STAFF_MESSAGES[order.status] || "This order is not yet ready for staff processing."}
            </p>
          </div>
        </div>
      )}

      {/* Post-staff informational message */}
      {isPostStaff && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
          <Truck className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-500">
              {order.status === "completed" ? "Completed" : "Out for Delivery"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {POST_STAFF_MESSAGES[order.status] || "This order has left the facility."}
            </p>
          </div>
        </div>
      )}

      {/* FSM Status Step Button — only for staff-actionable states */}
      {nextStatus && (
        <Button
          onClick={() => statusMutation.mutate(nextStatus)}
          disabled={statusMutation.isPending}
          className="w-full h-12 text-base"
          style={{ backgroundColor: "#5B4BC4" }}
        >
          <ChevronRight className="h-5 w-5 mr-2" />
          {TRANSITION_LABELS[nextStatus] || `Move to ${nextStatus.replace(/_/g, " ")}`}
        </Button>
      )}

      {/* ready_for_delivery — no next staff step, just info */}
      {order.status === "ready_for_delivery" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
          <Package className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-500">Ready for Delivery</p>
            <p className="text-sm text-muted-foreground mt-1">
              {POST_STAFF_MESSAGES.ready_for_delivery}
            </p>
          </div>
        </div>
      )}

      {/* Dev/Test Mode — gated behind super_admin / admin role */}
      {isSuperAdmin && isPreStaff && (
        <div className="border border-dashed border-amber-500/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="font-medium">Test Mode (no real driver)</span>
            </div>
            <button
              onClick={() => setDevMode(!devMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                devMode ? "bg-amber-500" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  devMode ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {devMode && devTransitions && (
            <div className="space-y-1.5">
              {devTransitions.map((t) => (
                <Button
                  key={t.next}
                  variant="outline"
                  size="sm"
                  onClick={() => statusMutation.mutate(t.next)}
                  disabled={statusMutation.isPending}
                  className="w-full text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                  {t.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Progress</h3>
        <OrderTimeline currentStatus={order.status} />
      </div>

      {/* Chat */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Chat with Customer</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {(messages ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
          ) : (
            (messages ?? []).map((msg) => (
              <div
                key={msg.id}
                className={`text-sm p-2 rounded-lg max-w-[80%] ${
                  msg.sender_role === "customer"
                    ? "bg-muted mr-auto"
                    : "bg-[#5B4BC4]/10 ml-auto text-right"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-0.5">
                  {msg.sender_role === "customer" ? "Customer" : "Staff"}
                </div>
                {msg.content}
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) sendMessage.mutate();
            }}
          />
          <Button
            size="sm"
            onClick={() => sendMessage.mutate()}
            disabled={!chatInput.trim() || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
