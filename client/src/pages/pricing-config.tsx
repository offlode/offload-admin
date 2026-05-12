import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Percent, Truck, Scale, History, MapPin, Award, Plus, X } from "lucide-react";

interface PricingConfigRow {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedAt: string;
  updatedBy: number | null;
}

interface AuditEntry {
  id: number;
  action: string;
  details: string;
  actorId: number | null;
  actorRole: string | null;
  timestamp: string;
}

export default function PricingConfigPage() {
  const { toast } = useToast();

  const { data: allConfig = [], isLoading } = useQuery<PricingConfigRow[]>({
    queryKey: ["/api/admin/pricing-config"],
  });

  const { data: auditLog = [] } = useQuery<AuditEntry[]>({
    queryKey: ["/api/admin/pricing-audit-log"],
  });

  const serviceTiers = allConfig.filter(c => c.category === "service_tiers");
  const deliveryFees = allConfig.filter(c => c.category === "delivery_fees");
  const taxConfig = allConfig.filter(c => c.category === "tax");
  const commissions = allConfig.filter(c => c.category === "commissions" || c.category === "logistics");
  const serviceMultipliers = allConfig.filter(c => c.category === "service_multipliers");
  const loyaltyConfig = allConfig.filter(c => c.category === "loyalty");

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1100px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pricing Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage bag prices, delivery fees, tax rates, commissions, and loyalty settings.
          Changes take effect within 60 seconds.
        </p>
      </div>

      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers"><Scale className="h-3.5 w-3.5 mr-1" /> Bag Tiers</TabsTrigger>
          <TabsTrigger value="delivery"><Truck className="h-3.5 w-3.5 mr-1" /> Delivery</TabsTrigger>
          <TabsTrigger value="tax"><Percent className="h-3.5 w-3.5 mr-1" /> Tax</TabsTrigger>
          <TabsTrigger value="commissions"><DollarSign className="h-3.5 w-3.5 mr-1" /> Commissions</TabsTrigger>
          <TabsTrigger value="multipliers">Multipliers</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="service-area"><MapPin className="h-3.5 w-3.5 mr-1" /> Service Area</TabsTrigger>
          <TabsTrigger value="certified"><Award className="h-3.5 w-3.5 mr-1" /> Certified</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-3.5 w-3.5 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bag Size Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Flat Price ($)</TableHead>
                    <TableHead>Overage Rate ($)</TableHead>
                    <TableHead>Max Weight (lbs)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTiers.map(row => (
                    <BagTierRow key={row.key} row={row} toast={toast} />
                  ))}
                  {serviceTiers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                        No bag tier configs found. They will be seeded on next server restart.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delivery Speed Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveryFees.map(row => (
                <ConfigRow key={row.key} row={row} toast={toast} format="currency" />
              ))}
              {deliveryFees.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No delivery fee configs found. They will be seeded on next server restart.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tax Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {taxConfig.map(row => (
                <ConfigRow key={row.key} row={row} toast={toast} format="percent" />
              ))}
              {taxConfig.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tax configs found. They will be seeded on next server restart.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Platform Commissions &amp; Payouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commissions.map(row => {
                const isRate = row.key.includes("rate") || row.key.includes("share") || row.key === "vendor_payout_default";
                return (
                  <ConfigRow
                    key={row.key}
                    row={row}
                    toast={toast}
                    format={isRate ? "percent" : "currency"}
                  />
                );
              })}
              {commissions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No commission configs found. They will be seeded on next server restart.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multipliers">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Service Type Multipliers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceMultipliers.map(row => (
                <ConfigRow key={row.key} row={row} toast={toast} format="number" />
              ))}
              {serviceMultipliers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No multiplier configs found. They will be seeded on next server restart.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Loyalty Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loyaltyConfig.filter(r => r.key !== "loyalty_tiers").map(row => (
                <ConfigRow key={row.key} row={row} toast={toast} format="number" />
              ))}
              {loyaltyConfig.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No loyalty configs found. They will be seeded on next server restart.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service-area">
          <ServiceAreaCard allConfig={allConfig} toast={toast} />
        </TabsContent>

        <TabsContent value="certified">
          <CertifiedRulesCard toast={toast} />
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pricing Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.slice(0, 50).map(entry => {
                    let details: any = {};
                    try { details = JSON.parse(entry.details); } catch {}
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">
                          {details.key && (
                            <span>
                              <strong>{details.key}</strong>: {String(details.oldValue ?? "—")} → {String(details.newValue ?? "—")}
                            </span>
                          )}
                          {!details.key && entry.details.slice(0, 80)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.actorRole || "—"} #{entry.actorId || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {auditLog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                        No audit entries yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Bag Tier Row (JSON value) ───

function BagTierRow({ row, toast }: { row: PricingConfigRow; toast: any }) {
  let parsed: { flatPrice: number; overageRate: number; maxWeight: number } = { flatPrice: 0, overageRate: 0, maxWeight: 0 };
  try { parsed = JSON.parse(row.value); } catch {}

  const [flatPrice, setFlatPrice] = useState(String(parsed.flatPrice));
  const [overageRate, setOverageRate] = useState(String(parsed.overageRate));
  const [maxWeight, setMaxWeight] = useState(String(parsed.maxWeight));
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: (newValue: string) =>
      apiRequest("PUT", `/api/admin/pricing-config/${row.key}`, { value: newValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-audit-log"] });
      toast({ title: "Saved", description: `Updated ${formatKey(row.key)}` });
      setConfirming(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
      setConfirming(false);
    },
  });

  const hasChanges =
    parseFloat(flatPrice) !== parsed.flatPrice ||
    parseFloat(overageRate) !== parsed.overageRate ||
    parseFloat(maxWeight) !== parsed.maxWeight;

  const newJsonValue = JSON.stringify({
    flatPrice: parseFloat(flatPrice) || 0,
    overageRate: parseFloat(overageRate) || 0,
    maxWeight: parseFloat(maxWeight) || 0,
  });

  return (
    <>
      <TableRow>
        <TableCell className="font-medium text-sm">{formatKey(row.key)}</TableCell>
        <TableCell>
          <Input
            value={flatPrice}
            onChange={e => setFlatPrice(e.target.value)}
            className="h-8 w-24"
            type="number"
            step="0.01"
          />
        </TableCell>
        <TableCell>
          <Input
            value={overageRate}
            onChange={e => setOverageRate(e.target.value)}
            className="h-8 w-24"
            type="number"
            step="0.01"
          />
        </TableCell>
        <TableCell>
          <Input
            value={maxWeight}
            onChange={e => setMaxWeight(e.target.value)}
            className="h-8 w-24"
            type="number"
            step="1"
          />
        </TableCell>
        <TableCell>
          {hasChanges && (
            <Button size="sm" onClick={() => setConfirming(true)}>Save</Button>
          )}
        </TableCell>
      </TableRow>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Price Change</AlertDialogTitle>
            <AlertDialogDescription>
              Update <strong>{formatKey(row.key)}</strong>?
              <br />
              <span className="text-muted-foreground">Old:</span> ${parsed.flatPrice} / ${parsed.overageRate}/lb / {parsed.maxWeight} lbs
              <br />
              <span className="font-medium">New:</span> ${flatPrice} / ${overageRate}/lb / {maxWeight} lbs
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate(newJsonValue)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Single Config Row (scalar value) ───

function ConfigRow({
  row,
  toast,
  format,
}: {
  row: PricingConfigRow;
  toast: any;
  format: "currency" | "percent" | "number";
}) {
  const numericVal = parseFloat(row.value);
  const isPercent = format === "percent" && !isNaN(numericVal) && numericVal >= 0 && numericVal < 1;
  const displayValue = isPercent ? (numericVal * 100).toFixed(3) : row.value;
  const [val, setVal] = useState(displayValue);
  const [confirming, setConfirming] = useState(false);

  const changed = isPercent
    ? parseFloat(val) !== numericVal * 100
    : val !== row.value;

  const mutation = useMutation({
    mutationFn: (newValue: string) =>
      apiRequest("PUT", `/api/admin/pricing-config/${row.key}`, { value: newValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-audit-log"] });
      toast({ title: "Saved", description: `Updated ${formatKey(row.key)}` });
      setConfirming(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
      setConfirming(false);
    },
  });

  const getSaveValue = (): string => {
    if (isPercent) {
      const pctVal = parseFloat(val);
      return !isNaN(pctVal) ? (pctVal / 100).toString() : row.value;
    }
    return val;
  };

  return (
    <>
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">
            {formatKey(row.key)}
            {isPercent ? " (%)" : format === "currency" ? " ($)" : ""}
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[200px]">
              <Input
                value={val}
                onChange={e => setVal(e.target.value)}
                className="h-8"
                type="number"
                step={format === "percent" ? "0.001" : "0.01"}
              />
              {isPercent && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              )}
              {format === "currency" && !isPercent && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              )}
            </div>
            {row.description && (
              <span className="text-xs text-muted-foreground">{row.description}</span>
            )}
          </div>
        </div>
        {changed && (
          <Button size="sm" onClick={() => setConfirming(true)}>Save</Button>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Change</AlertDialogTitle>
            <AlertDialogDescription>
              Update <strong>{formatKey(row.key)}</strong>?
              <br />
              <span className="text-muted-foreground">Old:</span> {row.value}
              <br />
              <span className="font-medium">New:</span> {getSaveValue()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate(getSaveValue())}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/^(bag_|multiplier_|delivery_fee_|loyalty_)/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Service Area ZIP management ───

function ServiceAreaCard({ allConfig, toast }: { allConfig: PricingConfigRow[]; toast: any }) {
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

function CertifiedRulesCard({ toast }: { toast: any }) {
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
