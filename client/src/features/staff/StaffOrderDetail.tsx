import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, User, MapPin, Send, ChevronRight } from "lucide-react";
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

// FSM transitions staff can make
const STAFF_TRANSITIONS: Record<string, string> = {
  confirmed: "at_facility",
  at_facility: "washing",
  washing: "folded_packaged",
  folded_packaged: "final_weight_verified",
  final_weight_verified: "ready_for_delivery",
};

const TRANSITION_LABELS: Record<string, string> = {
  at_facility: "Mark Arrived at Facility",
  washing: "Start Washing",
  folded_packaged: "Mark Folded & Packaged",
  final_weight_verified: "Verify Final Weight",
  ready_for_delivery: "Mark Ready for Delivery",
};

export default function StaffOrderDetail() {
  const [, params] = useRoute("/staff/order/:id");
  const orderId = params?.id;
  const { toast } = useToast();
  const [chatInput, setChatInput] = useState("");

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
    onError: (err: any) => {
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
    onError: (err: any) => {
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

      {/* FSM Status Step Button */}
      {nextStatus && (
        <Button
          onClick={() => statusMutation.mutate(nextStatus)}
          disabled={statusMutation.isPending}
          className="w-full h-12 text-base"
          style={{ backgroundColor: "#7C3AED" }}
        >
          <ChevronRight className="h-5 w-5 mr-2" />
          {TRANSITION_LABELS[nextStatus] || `Move to ${nextStatus.replace(/_/g, " ")}`}
        </Button>
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
                    : "bg-[#7C3AED]/10 ml-auto text-right"
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
