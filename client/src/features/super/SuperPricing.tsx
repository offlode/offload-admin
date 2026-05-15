import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Save } from "lucide-react";

interface PricingTier {
  id: number;
  name: string;
  displayName: string;
  maxWeight: number;
  flatPrice: number;
  flatPriceCents: number;
  overageRate: number;
  overageRateCents: number;
  description: string;
  isActive: boolean;
}

export default function SuperPricing() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<number, Partial<PricingTier>>>({});

  const { data: tiers, isLoading } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pricing");
      const data = await res.json();
      // Handle both array (new) and { tiers } (legacy) response shapes
      return Array.isArray(data) ? data : (data?.tiers ?? []);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PricingTier> }) => {
      const res = await apiRequest("PATCH", "/api/pricing", { tiers: [{ id, ...data }] });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({ title: "Pricing updated" });
      setEditing({});
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleEdit = (id: number, field: string, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseFloat(value) || 0 },
    }));
  };

  const handleSave = (tier: PricingTier) => {
    const edits = editing[tier.id];
    if (!edits) return;
    updateMutation.mutate({ id: tier.id, data: edits });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Pricing Configuration</h1>
        <p className="text-sm text-muted-foreground">Edit canonical pricing tiers and signature premium</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(tiers ?? []).map((tier) => {
            const edits = editing[tier.id] || {};
            const price = edits.flatPrice ?? tier.flatPrice;
            const overage = edits.overageRate ?? tier.overageRate;
            const hasChanges = Object.keys(edits).length > 0;

            return (
              <div key={tier.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#5B4BC4]" />
                    <h3 className="font-semibold">{tier.displayName}</h3>
                    <span className="text-xs text-muted-foreground">up to {tier.maxWeight} lbs</span>
                  </div>
                  {hasChanges && (
                    <Button size="sm" onClick={() => handleSave(tier)} disabled={updateMutation.isPending}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Flat Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => handleEdit(tier.id, "flatPrice", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Overage Rate ($/lb)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={overage}
                      onChange={(e) => handleEdit(tier.id, "overageRate", e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
                {tier.description && (
                  <p className="text-xs text-muted-foreground mt-2">{tier.description}</p>
                )}
              </div>
            );
          })}

          {(!tiers || tiers.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No pricing tiers configured.</p>
              <p className="text-xs mt-1">Pricing tiers are created during initial setup.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
