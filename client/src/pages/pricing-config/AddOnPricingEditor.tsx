import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, MapPin, Award } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type PricingConfigRow } from "./hooks/usePricingConfig";

// ─── Service Area ZIP management ───

export function ServiceAreaCard({ allConfig, toast }: { allConfig: PricingConfigRow[]; toast: any }) {
  const row = allConfig.find(c => c.key === "service_area_zips");
  let zips: string[] = [];
  try {
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) zips = parsed.map(String);
    }
  } catch { /* ignore */ }

  const [current, setCurrent] = useState<string[]>(zips);
  const [newZip, setNewZip] = useState("");
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: (next: string[]) =>
      apiRequest("PUT", `/api/admin/pricing-config/service_area_zips`, {
        value: JSON.stringify(next),
        category: "service_area",
        description: "ZIP codes served by Offload",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-audit-log"] });
      toast({ title: "Saved", description: "Service area updated" });
      setConfirming(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
      setConfirming(false);
    },
  });

  const addZip = () => {
    const z = newZip.trim();
    if (!/^\d{5}$/.test(z)) {
      toast({ title: "Invalid ZIP", description: "Must be 5 digits", variant: "destructive" });
      return;
    }
    if (current.includes(z)) {
      toast({ title: "Already added", description: `${z} is already in the service area` });
      return;
    }
    setCurrent([...current, z].sort());
    setNewZip("");
  };

  const removeZip = (z: string) => setCurrent(current.filter(x => x !== z));

  const hasChanges = JSON.stringify(current) !== JSON.stringify(zips);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Service Area ZIP Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Orders are only accepted from these ZIP codes. Currently {current.length} ZIPs covered.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 11201"
            value={newZip}
            onChange={e => setNewZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            onKeyDown={e => { if (e.key === "Enter") addZip(); }}
            className="h-8 w-32"
            maxLength={5}
          />
          <Button size="sm" onClick={addZip} variant="outline">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add ZIP
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto p-2 border rounded">
          {current.length === 0 ? (
            <span className="text-xs text-muted-foreground">No ZIPs configured — no orders will be accepted.</span>
          ) : current.map(z => (
            <Badge key={z} variant="secondary" className="gap-1 pl-2 pr-1">
              {z}
              <button
                onClick={() => removeZip(z)}
                className="hover:bg-destructive/20 rounded p-0.5"
                aria-label={`Remove ${z}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirming(true)}>Save Changes</Button>
            <Button size="sm" variant="ghost" onClick={() => setCurrent(zips)}>Discard</Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Service Area Change</AlertDialogTitle>
            <AlertDialogDescription>
              Update service area from <strong>{zips.length}</strong> ZIPs to <strong>{current.length}</strong> ZIPs?
              This will affect which orders the system accepts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate(current)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Offload Certified rules ───

interface CertifiedRules {
  minHappyReviews: number;
  maxUnhappyReviews: number;
  windowDays: number;
  minTotalReviews: number;
  happyThreshold: number;
  unhappyThreshold: number;
}

export function CertifiedRulesCard({ toast }: { toast: any }) {
  const { data: rules, isLoading } = useQuery<CertifiedRules>({
    queryKey: ["/api/admin/certified-rules"],
  });

  const [draft, setDraft] = useState<CertifiedRules | null>(null);
  const [confirming, setConfirming] = useState(false);

  const active = draft ?? rules ?? null;

  const mutation = useMutation({
    mutationFn: (payload: Partial<CertifiedRules>) =>
      apiRequest("PUT", `/api/admin/certified-rules`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/certified-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-audit-log"] });
      toast({ title: "Saved", description: "Certified rules updated" });
      setDraft(null);
      setConfirming(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
      setConfirming(false);
    },
  });

  if (isLoading || !active) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading certified rules…</CardContent>
      </Card>
    );
  }

  const set = (k: keyof CertifiedRules, v: number) =>
    setDraft({ ...(draft ?? rules!), [k]: v });

  const hasChanges = draft !== null && rules !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(rules);

  const field = (label: string, k: keyof CertifiedRules, hint: string, step = 1) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={active[k]}
        onChange={e => set(k, Number(e.target.value))}
        className="h-8 w-32"
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4" />
          Offload Certified — Quality Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          A Laundromat becomes <strong>Offload Certified</strong> when it earns enough happy reviews
          within the rolling window. It loses certification if too many unhappy reviews accumulate.
          Rules are re-evaluated automatically after every customer review.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {field("Min happy reviews to grant", "minHappyReviews", "Reviews ≥ happy threshold")}
          {field("Max unhappy reviews to revoke", "maxUnhappyReviews", "Reviews ≤ unhappy threshold")}
          {field("Rolling window (days)", "windowDays", "Counts only recent reviews")}
          {field("Min total reviews to be eligible", "minTotalReviews", "Below this — not eligible")}
          {field("Happy rating threshold (≥)", "happyThreshold", "Default 4 stars", 0.5)}
          {field("Unhappy rating threshold (≤)", "unhappyThreshold", "Default 2 stars", 0.5)}
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirming(true)}>Save Rules</Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Certified Rule Change</AlertDialogTitle>
            <AlertDialogDescription>
              These new rules will apply to all vendors going forward. Existing certifications
              will be re-evaluated as new reviews come in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => draft && mutation.mutate(draft)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
