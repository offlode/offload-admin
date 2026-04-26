import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Activity, Clock, Package, DollarSign, Percent } from "lucide-react";
import { useState } from "react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: vendor, isLoading } = useQuery<any>({ queryKey: ["/api/vendors", id] });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });

  const [commissionPct, setCommissionPct] = useState<number | "">("");

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Vendor updated" });
    },
  });

  const commissionMutation = useMutation({
    mutationFn: (payoutRate: number) => apiRequest("PATCH", `/api/vendors/${id}`, { payoutRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Commission rate saved" });
    },
    onError: () => {
      toast({ title: "Failed to save commission", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!vendor) return <div className="p-6 text-muted-foreground">Vendor not found</div>;

  const currentPayoutRate = vendor.payoutRate ?? 0.65;
  const currentPct = Math.round(currentPayoutRate * 100);
  const displayPct = commissionPct === "" ? currentPct : commissionPct;
  const sampleOrder = 30;
  const vendorGets = sampleOrder * (Number(displayPct) / 100);
  const platformDriver = sampleOrder - vendorGets;

  const vendorPayouts = transactions.filter((t: any) => t.recipientType === "vendor" && t.recipientId === vendor.id);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Link href="/vendors">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">{vendor.address}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={vendor.status === "active" ? "default" : "destructive"} className="capitalize">{vendor.status}</Badge>
          {vendor.status === "active" ? (
            <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ status: "suspended" })} data-testid="button-suspend">Suspend</Button>
          ) : (
            <Button size="sm" onClick={() => updateMutation.mutate({ status: "active" })} data-testid="button-approve">Approve</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Activity className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Health Score</span></div>
          <p className={`text-lg font-semibold ${vendor.healthScore >= 80 ? 'text-green-500' : vendor.healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
            {vendor.healthScore.toFixed(0)}/100
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Star className="h-3.5 w-3.5 text-yellow-500" /><span className="text-xs text-muted-foreground">Quality</span></div>
          <p className="text-lg font-semibold">{vendor.qualityScore.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Package className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Orders</span></div>
          <p className="text-lg font-semibold">{vendor.totalOrders}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Clock className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Avg Processing</span></div>
          <p className="text-lg font-semibold">{vendor.avgProcessingTime.toFixed(0)}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><DollarSign className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Total Payout</span></div>
          <p className="text-lg font-semibold">{formatCurrency(vendor.totalPayout)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Phone</p><p>{vendor.phone}</p></div>
              <div><p className="text-muted-foreground text-xs">Email</p><p>{vendor.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Hours</p><p>{vendor.operatingHours}</p></div>
              <div><p className="text-muted-foreground text-xs">Capacity</p><p>{vendor.currentLoad}/{vendor.capacity}</p></div>
              <div><p className="text-muted-foreground text-xs">Joined</p><p>{new Date(vendor.joinedAt).toLocaleDateString()}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" />Commission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="input-vendor-commission" className="text-xs">Payout Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="input-vendor-commission"
                  data-testid="input-vendor-commission"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-28"
                  placeholder={String(currentPct)}
                  value={commissionPct}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value)));
                    setCommissionPct(v);
                  }}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button
                  size="sm"
                  data-testid="button-save-commission"
                  disabled={commissionPct === "" || commissionMutation.isPending}
                  onClick={() => {
                    if (commissionPct !== "") {
                      commissionMutation.mutate(Number(commissionPct) / 100);
                      setCommissionPct("");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">What % the vendor keeps. The rest is split between Offload (platform fee) and the driver.</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs space-y-0.5">
              <p className="font-medium">Preview — $30 order</p>
              <p>Vendor gets: <span className="font-semibold">{formatCurrency(vendorGets)}</span></p>
              <p>Platform + driver get: <span className="font-semibold">{formatCurrency(platformDriver)}</span></p>
              <p className="text-muted-foreground">(Using {displayPct}% rate)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payouts found</p>
            ) : (
              <div className="space-y-2">
                {vendorPayouts.slice(0, 10).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-xs">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.status === "completed" ? "default" : "secondary"} className="text-xs">{t.status}</Badge>
                      <span className="font-medium">{formatCurrency(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
