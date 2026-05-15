import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Sparkles, Shirt } from "lucide-react";

const CANONICAL_PRICES = [
  { size: "Small", price: 24.99 },
  { size: "Medium", price: 44.99 },
  { size: "Large", price: 59.99 },
  { size: "XL", price: 89.99 },
] as const;

const SIGNATURE_PREMIUM = 5.0;

const CLOTHING_TYPES = [
  "Everyday Wear",
  "Delicates",
  "Activewear",
  "Denim",
  "Bedding & Linens",
  "Towels",
  "Business Attire",
  "Outerwear",
] as const;

interface WashPrefs {
  [key: string]: boolean;
}

export default function OwnerPricingPage() {
  const { toast } = useToast();

  const { data: vendorData } = useQuery<any>({
    queryKey: ["/api/laundromats/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/laundromats/me");
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const [prefs, setPrefs] = useState<WashPrefs>(() => {
    const initial: WashPrefs = {};
    CLOTHING_TYPES.forEach(t => { initial[t] = true; });
    return initial;
  });

  const savePrefsMutation = useMutation({
    mutationFn: async () => {
      if (!vendorData?.id) throw new Error("No vendor linked");
      const res = await apiRequest("PATCH", `/api/laundromats/${vendorData.id}`, {
        capabilities: JSON.stringify({ washPreferences: prefs }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats/me"] });
      toast({ title: "Wash preferences saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#5B4BC4]" /> Pricing
        </h1>
        <p className="text-sm text-muted-foreground">Canonical bag prices and wash preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Standard Wash Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CANONICAL_PRICES.map(({ size, price }) => (
              <div key={size} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{size}</p>
                <p className="text-lg font-bold">${price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Signature Wash Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CANONICAL_PRICES.map(({ size, price }) => (
              <div key={size} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{size}</p>
                <p className="text-lg font-bold">${(price + SIGNATURE_PREMIUM).toFixed(2)}</p>
                <Badge variant="secondary" className="text-[10px] mt-1">+${SIGNATURE_PREMIUM.toFixed(2)}/bag</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shirt className="h-4 w-4" /> Wash Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select the clothing types your laundromat accepts for processing.
          </p>
          {CLOTHING_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between">
              <Label className="text-sm">{type}</Label>
              <Switch
                checked={prefs[type] ?? true}
                onCheckedChange={(checked) => setPrefs(prev => ({ ...prev, [type]: checked }))}
              />
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => savePrefsMutation.mutate()}
            disabled={savePrefsMutation.isPending}
            className="mt-2"
          >
            {savePrefsMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
