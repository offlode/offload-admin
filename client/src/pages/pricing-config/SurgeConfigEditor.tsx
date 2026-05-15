import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { type PricingConfigRow } from "./hooks/usePricingConfig";

const SIGNATURE_PREMIUM_KEYS = [
  { key: "signature_premium_cents_small_bag", label: "Small Bag premium" },
  { key: "signature_premium_cents_medium_bag", label: "Medium Bag premium" },
  { key: "signature_premium_cents_large_bag", label: "Large Bag premium" },
  { key: "signature_premium_cents_xl_bag", label: "XL Bag premium" },
] as const;

type SigKey = typeof SIGNATURE_PREMIUM_KEYS[number]["key"];

export function SignaturePremiumCard({ toast }: { toast: any }) {
  const qSmall = useQuery<PricingConfigRow>({
    queryKey: ["/api/admin/pricing-config", "signature_premium_cents_small_bag"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/pricing-config/signature_premium_cents_small_bag")).json(),
    retry: false,
  });
  const qMedium = useQuery<PricingConfigRow>({
    queryKey: ["/api/admin/pricing-config", "signature_premium_cents_medium_bag"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/pricing-config/signature_premium_cents_medium_bag")).json(),
    retry: false,
  });
  const qLarge = useQuery<PricingConfigRow>({
    queryKey: ["/api/admin/pricing-config", "signature_premium_cents_large_bag"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/pricing-config/signature_premium_cents_large_bag")).json(),
    retry: false,
  });
  const qXl = useQuery<PricingConfigRow>({
    queryKey: ["/api/admin/pricing-config", "signature_premium_cents_xl_bag"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/pricing-config/signature_premium_cents_xl_bag")).json(),
    retry: false,
  });

  const queryResults = [qSmall, qMedium, qLarge, qXl];

  const toInitialDollars = (q: typeof qSmall): string => {
    const row = q.data as PricingConfigRow | undefined;
    const cents = row?.value ? Number(row.value) : 500;
    return (cents / 100).toFixed(2);
  };

  const [vals, setVals] = useState<Record<SigKey, string>>({
    signature_premium_cents_small_bag: "5.00",
    signature_premium_cents_medium_bag: "5.00",
    signature_premium_cents_large_bag: "5.00",
    signature_premium_cents_xl_bag: "5.00",
  });
  const [saved, setSaved] = useState(false);

  // Re-sync vals once all 4 queries have data
  const allLoaded = queryResults.every(q => !q.isLoading);
  useEffect(() => {
    if (allLoaded) {
      setVals({
        signature_premium_cents_small_bag: toInitialDollars(qSmall),
        signature_premium_cents_medium_bag: toInitialDollars(qMedium),
        signature_premium_cents_large_bag: toInitialDollars(qLarge),
        signature_premium_cents_xl_bag: toInitialDollars(qXl),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        SIGNATURE_PREMIUM_KEYS.map(item => {
          const dollars = parseFloat(vals[item.key]) || 5;
          const cents = Math.round(dollars * 100);
          return apiRequest("PUT", `/api/admin/pricing-config/${item.key}`, {
            value: String(cents),
            category: "signature_premium",
            description: `Signature Wash ${item.label} (cents)`,
          });
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-config"] });
      setSaved(true);
      toast({ title: "Saved", description: "Signature Wash premiums updated." });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
    },
  });

  const setVal = (key: SigKey, v: string) => {
    setVals(prev => ({ ...prev, [key]: v }));
    setSaved(false);
  };

  const fieldError = (v: string): string | null => {
    const n = parseFloat(v);
    if (v === "" || isNaN(n)) return "Required";
    if (n < 0) return "Cannot be negative";
    if (n > 100) return "Max $100";
    return null;
  };

  const hasErrors = SIGNATURE_PREMIUM_KEYS.some(item => !!fieldError(vals[item.key]));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Signature Wash Premiums
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Per-bag surcharge added when a customer selects <strong>Signature Wash</strong>.
          Enter the amount in dollars (e.g. 5.00 = $5.00 per bag). Admin-only.
        </p>
        {!allLoaded && (
          <p className="text-xs text-muted-foreground">Loading current values…</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SIGNATURE_PREMIUM_KEYS.map(item => {
            const err = fieldError(vals[item.key]);
            return (
              <div key={item.key} className="space-y-1.5">
                <Label className="text-xs">{item.label} ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-[9px] text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={vals[item.key]}
                    onChange={e => setVal(item.key, e.target.value)}
                    className={`h-9 pl-6 ${err ? "border-red-500" : ""}`}
                  />
                </div>
                {err && <p className="text-xs text-red-500">{err}</p>}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || hasErrors}
          >
            {saveMutation.isPending ? "Saving…" : "Save All"}
          </Button>
          {saved && (
            <span className="text-xs text-emerald-500 font-medium">Saved ✓</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
