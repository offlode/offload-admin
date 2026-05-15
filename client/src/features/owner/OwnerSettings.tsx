import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

interface LaundromatSettings {
  id: string;
  name: string;
  accepts_standard: boolean;
  accepts_signature: boolean;
  accepts_custom: boolean;
  signature_premium_cents: number;
  capacity_bags_per_day: number;
  service_radius_miles: number;
  hours_json: string | null;
}

export default function OwnerSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<LaundromatSettings>({
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

  const [form, setForm] = useState({
    accepts_standard: true,
    accepts_signature: true,
    accepts_custom: true,
    signature_premium_cents: 500,
    capacity_bags_per_day: 100,
    service_radius_miles: 10,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        accepts_standard: settings.accepts_standard,
        accepts_signature: settings.accepts_signature,
        accepts_custom: settings.accepts_custom,
        signature_premium_cents: settings.signature_premium_cents,
        capacity_bags_per_day: settings.capacity_bags_per_day,
        service_radius_miles: settings.service_radius_miles,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/laundromats/${settings?.id}`, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats/me"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No laundromat linked to your account</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">{settings.name}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-[#7C3AED]" />
          <h2 className="font-semibold">Accepted Services</h2>
        </div>

        {(["accepts_standard", "accepts_signature", "accepts_custom"] as const).map((key) => {
          const labels: Record<string, string> = {
            accepts_standard: "Standard Wash",
            accepts_signature: "Signature Wash",
            accepts_custom: "Custom Wash",
          };
          return (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-[#7C3AED] focus:ring-[#7C3AED]"
              />
              <span className="text-sm">{labels[key]}</span>
            </label>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Capacity & Coverage</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Signature Premium (cents)</Label>
            <Input
              type="number"
              value={form.signature_premium_cents}
              onChange={(e) => setForm((prev) => ({ ...prev, signature_premium_cents: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground">
              ${(form.signature_premium_cents / 100).toFixed(2)} per bag
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Capacity (bags/day)</Label>
            <Input
              type="number"
              value={form.capacity_bags_per_day}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity_bags_per_day: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Service Radius (miles)</Label>
          <Input
            type="number"
            value={form.service_radius_miles}
            onChange={(e) => setForm((prev) => ({ ...prev, service_radius_miles: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>
    </div>
  );
}
