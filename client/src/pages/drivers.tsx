import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Star, Truck } from "lucide-react";
import { DRIVER_STATUS_COLORS } from "@/features/shared/constants";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function DriversPage() {
  const { data: drivers = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/drivers"] });

  const sorted = [...drivers].sort((a, b) => Number(b.rating ?? b.customerRatingAvg ?? 0) - Number(a.rating ?? a.customerRatingAvg ?? 0));

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-sm text-muted-foreground">{drivers.length} total drivers</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Available</p>
          <p className="text-lg font-semibold text-green-500">{drivers.filter(d => d.status === "available").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Busy</p>
          <p className="text-lg font-semibold text-yellow-500">{drivers.filter(d => d.status === "busy").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Offline</p>
          <p className="text-lg font-semibold text-muted-foreground">{drivers.filter(d => d.status === "offline").length}</p>
        </CardContent></Card>
      </div>

      {/* Driver Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Performance Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">#</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Driver</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Rating</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Trips</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Earnings</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Completion</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">On-Time</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No drivers on the network yet. Driver applications will appear in Partner Applications.
                  </td></tr>
                )}
                {sorted.map((d: any, i: number) => {
                  const rating = Number(d.rating ?? d.customerRatingAvg ?? 0);
                  const totalTrips = Number(d.totalTrips ?? d.completedTrips ?? 0);
                  const totalEarnings = Number(d.totalEarnings ?? 0);
                  const completionRate = Number(d.completionRate ?? 1);
                  const onTimeRate = Number(d.onTimeRate ?? d.onTimePickupRate ?? 0);
                  const status = d.status || "offline";
                  const name = d.name || `Driver #${d.id}`;
                  const vehicleType = d.vehicleType || "—";
                  const licensePlate = d.licensePlate || "—";
                  return (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-3 text-muted-foreground font-medium">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/drivers/${d.id}`} className="text-primary hover:underline font-medium" data-testid={`link-driver-${d.id}`}>
                        {name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{vehicleType} · {licensePlate}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={(DRIVER_STATUS_COLORS[status] || "outline") as any} className="text-xs capitalize">{status}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right">{totalTrips}</td>
                    <td className="py-2.5 pr-3 text-right font-medium">{formatCurrency(totalEarnings)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${completionRate * 100}%` }} />
                        </div>
                        <span className="text-xs">{(completionRate * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${onTimeRate > 0.9 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${onTimeRate * 100}%` }} />
                        </div>
                        <span className="text-xs">{(onTimeRate * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
