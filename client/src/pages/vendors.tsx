import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Store, Star, Activity } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function VendorsPage() {
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor updated" });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Vendors</h1>
        <p className="text-sm text-muted-foreground">{vendors.length} laundromat partners</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v: any) => (
          <Card key={v.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/vendors/${v.id}`} className="font-medium text-primary hover:underline" data-testid={`link-vendor-${v.id}`}>
                    {v.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.address}</p>
                </div>
                <Badge variant={v.status === "active" ? "default" : v.status === "suspended" ? "destructive" : "secondary"} className="text-xs capitalize">
                  {v.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Health</p>
                  <div className="flex items-center gap-1" title={`${v.healthScore >= 80 ? 'Good' : v.healthScore >= 60 ? 'Fair' : 'Poor'} — composite of quality, speed & capacity`}>
                    <Activity className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-sm font-semibold ${v.healthScore >= 80 ? 'text-green-500' : v.healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {v.healthScore.toFixed(0)}
                    </span>
                    <span className={`text-[10px] font-medium ${v.healthScore >= 80 ? 'text-green-500' : v.healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {v.healthScore >= 80 ? 'Good' : v.healthScore >= 60 ? 'Fair' : 'Poor'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm font-semibold">{v.qualityScore.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Load</p>
                  <span className="text-sm font-semibold">{v.currentLoad}/{v.capacity}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>{v.totalOrders} orders</span>
                <span>{formatCurrency(v.totalPayout)} paid</span>
                <span>{v.operatingHours}</span>
              </div>

              <div className="flex gap-2">
                {v.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-1"
                    onClick={() => updateMutation.mutate({ id: v.id, data: { status: "suspended" } })}
                    data-testid={`button-suspend-${v.id}`}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => updateMutation.mutate({ id: v.id, data: { status: "active" } })}
                    data-testid={`button-approve-${v.id}`}
                  >
                    Approve
                  </Button>
                )}
                <Link href={`/vendors/${v.id}`}>
                  <Button size="sm" variant="secondary" className="text-xs">Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
