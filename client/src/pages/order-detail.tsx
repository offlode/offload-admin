import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, MapPin, Package, DollarSign, User, Truck, Store, RotateCcw } from "lucide-react";
import { StatusBadge } from "./dashboard";
import { ADMIN_ORDER_STATUS_OPTIONS } from "@/lib/order-status-map";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: order, isLoading } = useQuery<any>({ queryKey: ["/api/orders", id] });
  const { data: drivers = [] } = useQuery<any[]>({ queryKey: ["/api/drivers"] });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });

  // Refund state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundAmountError, setRefundAmountError] = useState("");
  const [refundReasonError, setRefundReasonError] = useState("");

  const refundMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Refund issued", description: `$${refundAmount} refund recorded.` });
      setRefundOpen(false);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: (err: any) => {
      toast({ title: "Refund failed", description: err.message || "Try again.", variant: "destructive" });
    },
  });

  function handleRefundSubmit() {
    let valid = true;
    const amt = parseFloat(refundAmount);
    if (!refundAmount || isNaN(amt) || amt <= 0) {
      setRefundAmountError("Enter a valid refund amount greater than $0.");
      valid = false;
    } else if (amt > (order?.total ?? 0)) {
      setRefundAmountError(`Amount cannot exceed order total (${formatCurrency(order?.total ?? 0)}).`);
      valid = false;
    } else {
      setRefundAmountError("");
    }
    if (!refundReason.trim()) {
      setRefundReasonError("A refund reason is required.");
      valid = false;
    } else if (refundReason.trim().length < 5) {
      setRefundReasonError("Please provide at least 5 characters for the reason.");
      valid = false;
    } else {
      setRefundReasonError("");
    }
    if (!valid) return;
    refundMutation.mutate({
      paymentStatus: "refunded",
      refundAmount: amt,
      refundReason: refundReason.trim(),
      refundedAt: new Date().toISOString(),
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order updated" });
    },
  });

  // Statuses that require a driver to be assigned first
  const DRIVER_REQUIRED_STATUSES = ["scheduled", "picked_up", "at_facility", "processing", "ready_for_delivery", "driver_en_route_delivery", "delivered"];

  function handleStatusChange(newStatus: string) {
    if (DRIVER_REQUIRED_STATUSES.includes(newStatus) && !order?.driverId) {
      toast({
        title: "Assign a driver first",
        description: `Cannot set status to "${newStatus.replace(/_/g, " ")}" without an assigned driver.`,
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ status: newStatus });
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!order) return <div className="p-6 text-muted-foreground">Order not found</div>;

  const statusFlow = ADMIN_ORDER_STATUS_OPTIONS.filter(option => option.value !== "cancelled");

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

      {/* Refund section — shown when order is delivered/paid and not already refunded */}
      {(order.paymentStatus === "paid" || order.paymentStatus === "succeeded") && order.paymentStatus !== "refunded" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Refund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Issue a refund for this order. The refund will be recorded and the order payment status updated.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundOpen(true)}
              data-testid="button-issue-refund"
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Issue Refund
            </Button>
          </CardContent>
        </Card>
      )}
      {order.paymentStatus === "refunded" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4" /> Refund
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Badge variant="secondary">Refunded</Badge>
            {order.refundAmount && <span className="ml-2 text-muted-foreground">{formatCurrency(order.refundAmount)}</span>}
            {order.refundReason && <p className="text-xs text-muted-foreground mt-1">{order.refundReason}</p>}
          </CardContent>
        </Card>
      )}

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
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[200px] h-8" data-testid="select-order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusFlow.map(s => (
                  <SelectItem key={s.value} value={s.value} className="capitalize">
                    {s.label}
                  </SelectItem>
                ))}
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {!order.driverId && (
              <span className="text-xs text-amber-600 font-medium">No driver assigned — status advances will be blocked</span>
            )}
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
      {/* Refund Modal */}
      <Dialog open={refundOpen} onOpenChange={(o) => { setRefundOpen(o); if (!o) { setRefundAmount(""); setRefundReason(""); setRefundAmountError(""); setRefundReasonError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="refund-amount" className="text-xs">Refund Amount ($) <span className="text-red-500">*</span></Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={order?.total ?? undefined}
                value={refundAmount}
                onChange={(e) => { setRefundAmount(e.target.value); setRefundAmountError(""); }}
                placeholder={`Max ${formatCurrency(order?.total ?? 0)}`}
                className={refundAmountError ? "border-red-500 focus-visible:ring-red-500" : ""}
                data-testid="input-refund-amount"
              />
              {refundAmountError && (
                <p className="text-xs text-red-500" data-testid="error-refund-amount">{refundAmountError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refund-reason" className="text-xs">Reason <span className="text-red-500">*</span></Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => { setRefundReason(e.target.value); setRefundReasonError(""); }}
                placeholder="e.g. Items damaged during processing — customer reported upon delivery."
                rows={3}
                className={refundReasonError ? "border-red-500 focus-visible:ring-red-500" : ""}
                data-testid="textarea-refund-reason"
              />
              {refundReasonError && (
                <p className="text-xs text-red-500" data-testid="error-refund-reason">{refundReasonError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRefundSubmit}
              disabled={refundMutation.isPending}
              data-testid="button-confirm-refund"
            >
              {refundMutation.isPending ? "Issuing…" : "Issue Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
