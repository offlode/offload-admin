import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Truck, DollarSign, Clock, CheckCircle } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: driver, isLoading } = useQuery<any>({ queryKey: ["/api/drivers", id] });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/drivers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Driver updated" });
    },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!driver) return <div className="p-6 text-muted-foreground">Driver not found</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Link href="/drivers">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{driver.name}</h1>
          <p className="text-sm text-muted-foreground">{driver.email} · {driver.phone}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={driver.status === "available" ? "default" : driver.status === "busy" ? "secondary" : "outline"} className="capitalize">
            {driver.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Star className="h-3.5 w-3.5 text-yellow-500" /><span className="text-xs text-muted-foreground">Rating</span></div>
          <p className="text-lg font-semibold">{driver.rating.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Truck className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Trips</span></div>
          <p className="text-lg font-semibold">{driver.totalTrips}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Earnings</span></div>
          <p className="text-lg font-semibold">{formatCurrency(driver.totalEarnings)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><CheckCircle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">On-Time Rate</span></div>
          <p className="text-lg font-semibold">{(driver.onTimeRate * 100).toFixed(0)}%</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Driver Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Vehicle</p><p className="capitalize">{driver.vehicleType}</p></div>
              <div><p className="text-muted-foreground text-xs">License Plate</p><p>{driver.licensePlate}</p></div>
              <div><p className="text-muted-foreground text-xs">Joined</p><p>{new Date(driver.joinedAt).toLocaleDateString()}</p></div>
              <div><p className="text-muted-foreground text-xs">Completion Rate</p><p>{(driver.completionRate * 100).toFixed(0)}%</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={driver.status} onValueChange={(v) => updateMutation.mutate({ status: v })}>
                <SelectTrigger data-testid="select-driver-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payout Rate ($/delivery)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.5"
                  defaultValue={driver.payoutRate}
                  id="payout-rate"
                  data-testid="input-payout-rate"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const val = parseFloat((document.getElementById("payout-rate") as HTMLInputElement).value);
                    if (!isNaN(val)) updateMutation.mutate({ payoutRate: val });
                  }}
                  data-testid="button-update-payout"
                >
                  Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
