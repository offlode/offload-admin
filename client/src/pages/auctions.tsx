import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Gavel, RotateCcw, Clock } from "lucide-react";

interface DispatchOffer {
  id: number;
  orderId: number;
  orderNumber?: string;
  createdAt: string;
  expiresAt: string;
  vendorIds: number[] | string;
  status: string;
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const isExpired = remaining === "Expired";
  return (
    <Badge variant={isExpired ? "secondary" : "outline"} className="text-xs font-mono">
      <Clock className="h-3 w-3 mr-1" />
      {remaining}
    </Badge>
  );
}

export default function AuctionsPage() {
  const { toast } = useToast();

  // TODO: Replace with actual dispatch_offers endpoint when API is ready
  const { data: offers = [], isLoading } = useQuery<DispatchOffer[]>({
    queryKey: ["/api/dispatch-offers"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/dispatch-offers");
        return res.json();
      } catch {
        return [];
      }
    },
  });

  const redispatchMutation = useMutation({
    mutationFn: async (offerId: number) => {
      // TODO: Call actual re-dispatch endpoint when available
      const res = await apiRequest("POST", `/api/dispatch-offers/${offerId}/redispatch`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch-offers"] });
      toast({ title: "Re-dispatched", description: "Offer has been re-sent to laundromats." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Re-dispatch failed", variant: "destructive" });
    },
  });

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "accepted") return "default";
    if (s === "pending") return "secondary";
    if (s === "expired" || s === "declined") return "destructive";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Gavel className="h-5 w-5" /> Dispatch Auctions
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage dispatch offers sent to laundromats (10-minute expiry window)
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Offer ID</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Order Ref</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Created</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Expires</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Laundromats</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Gavel className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>No dispatch offers found</p>
                      <p className="text-xs mt-1">Offers appear here when orders are dispatched to laundromats</p>
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => {
                    const vendors = typeof offer.vendorIds === "string"
                      ? JSON.parse(offer.vendorIds || "[]")
                      : offer.vendorIds || [];
                    return (
                      <tr key={offer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-3 font-mono text-xs">#{offer.id}</td>
                        <td className="py-2.5 pr-3 font-medium">{offer.orderNumber || `Order #${offer.orderId}`}</td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                          {new Date(offer.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-3">
                          <CountdownBadge expiresAt={offer.expiresAt} />
                        </td>
                        <td className="py-2.5 pr-3 text-xs">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={statusColor(offer.status)} className="text-xs capitalize">
                            {offer.status}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          {(offer.status === "expired" || offer.status === "declined") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => redispatchMutation.mutate(offer.id)}
                              disabled={redispatchMutation.isPending}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-dispatch
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
