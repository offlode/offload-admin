import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { SkeletonList } from "@/features/shared/components";

interface DispatchOffer {
  id: string;
  order_id: number;
  order_number?: string;
  customer_name?: string;
  bags?: string;
  service_type?: string;
  pickup_address?: string;
  offered_at: string;
  certified_only_until: string;
  status: string;
  laundromat_certified?: boolean;
}

function CountdownTimer({ until, isCertified }: { until: string; isCertified: boolean }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (secondsLeft <= 0) return null;

  if (isCertified) {
    return (
      <div className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Priority window: {secondsLeft}s remaining
      </div>
    );
  }

  return (
    <div className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-full flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Available in {secondsLeft}s (certified-first window)
    </div>
  );
}

export default function OwnerIncoming() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: offers, isLoading } = useQuery<DispatchOffer[]>({
    queryKey: ["/api/dispatch/offers"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/dispatch/offers");
        return res.json();
      } catch {
        return [];
      }
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const acceptMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest("POST", `/api/dispatch/offers/${offerId}/accept`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/offers"] });
      toast({ title: "Order accepted!" });
      if (data.order_id) {
        navigate(`/owner/orders/${data.order_id}`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Could not accept", description: err.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest("POST", `/api/dispatch/offers/${offerId}/decline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/offers"] });
      toast({ title: "Offer declined" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pendingOffers = (offers ?? []).filter((o) => o.status === "pending");
  const now = Date.now();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Incoming Orders</h1>
        <p className="text-sm text-muted-foreground">
          Accept or decline dispatch offers. Polling every 5 seconds.
        </p>
      </div>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : pendingOffers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pending offers</p>
          <p className="text-xs mt-1">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingOffers.map((offer) => {
            const certifiedUntil = new Date(offer.certified_only_until).getTime();
            const inCertifiedWindow = certifiedUntil > now;
            const isCertified = offer.laundromat_certified !== false;
            const canAccept = !inCertifiedWindow || isCertified;

            return (
              <div key={offer.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#7C3AED]" />
                    <span className="font-medium">
                      {offer.order_number || `Order #${offer.order_id}`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(offer.offered_at).toLocaleTimeString()}
                  </span>
                </div>

                {offer.customer_name && (
                  <div className="text-sm text-muted-foreground">
                    Customer: {offer.customer_name}
                  </div>
                )}

                {offer.pickup_address && (
                  <div className="text-sm text-muted-foreground">
                    Pickup: {offer.pickup_address}
                  </div>
                )}

                {offer.service_type && (
                  <div className="text-xs text-muted-foreground">
                    Service: {offer.service_type.replace(/_/g, " ")}
                  </div>
                )}

                {inCertifiedWindow && (
                  <CountdownTimer until={offer.certified_only_until} isCertified={isCertified} />
                )}

                {!canAccept && (
                  <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 px-3 py-2 rounded-lg">
                    <AlertTriangle className="h-3 w-3" />
                    Certified laundromats get priority. You can accept after the countdown.
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => acceptMutation.mutate(offer.id)}
                    disabled={!canAccept || acceptMutation.isPending}
                    className="flex-1"
                    style={{ backgroundColor: canAccept ? "#7C3AED" : undefined }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => declineMutation.mutate(offer.id)}
                    disabled={declineMutation.isPending}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
