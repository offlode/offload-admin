import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft, Package, User, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, OrderTimeline } from "@/features/shared/components";

interface OrderDetail {
  id: number;
  order_number: string;
  customer_name: string;
  customer_id: number;
  status: string;
  pickup_address: string;
  delivery_address: string;
  bags: string;
  service_type: string;
  created_at: string;
  scheduled_pickup: string | null;
  laundromat_id: string | null;
  laundromat_name: string | null;
}

export default function OwnerOrderDetail() {
  const [, params] = useRoute("/owner/orders/:id");
  const orderId = params?.id;

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const { apiRequest } = await import("@/lib/queryClient");
      const res = await apiRequest("GET", `/api/orders/${orderId}`);
      return res.json();
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Order not found</p>
      </div>
    );
  }

  let bags: Array<{ size: string; weight_lbs?: number }> = [];
  try {
    bags = JSON.parse(order.bags || "[]");
  } catch { /* empty */ }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <a href="#/owner/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </a>
        <div>
          <h1 className="text-xl font-bold">{order.order_number || `Order #${order.id}`}</h1>
          <StatusPill status={order.status} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{order.pickup_address}</span>
        </div>
        {order.scheduled_pickup && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Pickup: {new Date(order.scheduled_pickup).toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{bags.length} bag{bags.length !== 1 ? "s" : ""} - {order.service_type?.replace(/_/g, " ") || "Wash & Fold"}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Order Progress</h3>
        <OrderTimeline currentStatus={order.status} />
      </div>
    </div>
  );
}
