import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, MapPin, Package, DollarSign, User, Truck, Store } from "lucide-react";
import { StatusBadge } from "./dashboard";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: order, isLoading } = useQuery<any>({ queryKey: ["/api/orders", id] });
  const { data: drivers = [] } = useQuery<any[]>({ queryKey: ["/api/drivers"] });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order updated" });
    },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!order) return <div className="p-6 text-muted-foreground">Order not found</div>;

  const statusFlow = ["pending", "pickup_scheduled", "picked_up", "at_vendor", "processing", "ready", "out_for_delivery", "delivered"];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Order details</p>
        </div>
        <div className="ml-auto"><StatusBadge status={order.status} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" /> Order Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <Badge variant="outline" className="capitalize">{order.serviceType || "—"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{order.itemCount ?? 0} items{order.weight ? ` (${Number(order.weight).toFixed(1)} lbs)` : ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <Badge variant={order.paymentStatus === "paid" || order.paymentStatus === "succeeded" ? "default" : order.paymentStatus === "failed" ? "destructive" : "secondary"} className="capitalize">{order.paymentStatus || "unpaid"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</span>
            </div>
            {order.promoCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promo Code</span>
                <Badge variant="secondary">{order.promoCode}</Badge>
              </div>
            )}
            {order.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Notes</p>
                <p>{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(order.subtotal ?? 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>{formatCurrency(Number(order.deliveryFee ?? 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee</span><span>{formatCurrency(Number(order.platformFee ?? 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(Number(order.tax ?? 0))}</span></div>
            {Number(order.discount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(Number(order.discount ?? 0))}</span></div>
            )}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Total</span><span>{formatCurrency(Number(order.total ?? 0))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Addresses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Pickup</p>
              <p>{order.pickupAddress}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Delivery</p>
              <p>{order.deliveryAddress}</p>
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Customer</p>
              <Link href={`/customers/${order.customerId}`} className="text-primary hover:underline">{order.customerName}</Link>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Truck className="h-3 w-3" /> Driver</p>
              <Select
                value={String(order.driverId || "")}
                onValueChange={(v) => updateMutation.mutate({ driverId: parseInt(v) })}
              >
                <SelectTrigger className="h-8" data-testid="select-driver">
                  <SelectValue placeholder="Assign driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Store className="h-3 w-3" /> Vendor</p>
              <Select
                value={String(order.vendorId || "")}
                onValueChange={(v) => updateMutation.mutate({ vendorId: parseInt(v) })}
              >
                <SelectTrigger className="h-8" data-testid="select-vendor">
                  <SelectValue placeholder="Assign vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Update status:</span>
            <Select
              value={order.status}
              onValueChange={(v) => updateMutation.mutate({ status: v })}
            >
              <SelectTrigger className="w-[200px] h-8" data-testid="select-order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusFlow.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {order.statusHistory?.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium capitalize">{h.status.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.changedAt).toLocaleString()} · by {h.changedBy}
                  </p>
                  {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
