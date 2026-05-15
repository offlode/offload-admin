import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Truck, UserPlus, UserMinus, Phone } from "lucide-react";

interface DriverRow {
  id: number;
  name: string;
  phone: string;
  status: string;
  rating: number;
  completedTrips: number;
  vendorId: number | null;
}

export default function OwnerDriversPage() {
  const { toast } = useToast();
  const { data: drivers = [], isLoading } = useQuery<DriverRow[]>({
    queryKey: ["/api/drivers"],
  });

  const assignMutation = useMutation({
    mutationFn: async ({ driverId, vendorId }: { driverId: number; vendorId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/drivers/${driverId}`, { vendorId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Driver updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === "available") return "default";
    if (s === "busy") return "secondary";
    return "outline";
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#5B4BC4]" /> Drivers
        </h1>
        <p className="text-sm text-muted-foreground">Manage drivers assigned to your laundromat</p>
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No drivers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver) => (
            <Card key={driver.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{driver.name}</span>
                      <Badge variant={statusColor(driver.status)} className="text-xs capitalize">
                        {driver.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {driver.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {driver.phone}
                        </span>
                      )}
                      <span>{driver.completedTrips ?? 0} trips</span>
                      <span>Rating: {driver.rating?.toFixed(1) ?? "—"}</span>
                    </div>
                  </div>
                  <div>
                    {driver.vendorId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => assignMutation.mutate({ driverId: driver.id, vendorId: null })}
                        disabled={assignMutation.isPending}
                      >
                        <UserMinus className="h-3.5 w-3.5 mr-1" /> Unassign
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => assignMutation.mutate({ driverId: driver.id, vendorId: driver.id })}
                        disabled={assignMutation.isPending}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
