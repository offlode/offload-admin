import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CANONICAL_DEFAULTS,
  formatKey,
  validatePrice,
  type PricingConfigRow,
} from "./hooks/usePricingConfig";

function BagTierRow({ row, toast }: { row: PricingConfigRow; toast: any }) {
  const canonical = CANONICAL_DEFAULTS[row.key] ?? { flatPrice: 0, overageRate: 0, maxWeight: 0 };
  let parsed: { flatPrice: number; overageRate: number; maxWeight: number } = { ...canonical };
  try {
    const val = JSON.parse(row.value);
    if (val.flatPrice > 0 || val.overageRate > 0 || val.maxWeight > 0) parsed = val;
  } catch {}

  const [flatPrice, setFlatPrice] = useState(String(parsed.flatPrice));
  const [overageRate, setOverageRate] = useState(String(parsed.overageRate));
  const [maxWeight, setMaxWeight] = useState(String(parsed.maxWeight));
  const [confirming, setConfirming] = useState(false);

  const flatPriceError = validatePrice(flatPrice);
  const overageRateError = validatePrice(overageRate);
  const maxWeightError = (() => {
    const n = parseFloat(maxWeight);
    if (maxWeight === "" || isNaN(n)) return "Weight is required";
    if (n < 0) return "Weight cannot be negative";
    if (n > 1000) return "Weight too high";
    return null;
  })();
  const hasErrors = !!(flatPriceError || overageRateError || maxWeightError);

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
          <div className="space-y-1">
            <Input
              value={flatPrice}
              onChange={e => setFlatPrice(e.target.value)}
              className={`h-8 w-24 ${flatPriceError ? "border-red-500" : ""}`}
              type="number"
              step="0.01"
              min="0"
              max="10000"
            />
            {flatPriceError && <p className="text-xs text-red-500">{flatPriceError}</p>}
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <Input
              value={overageRate}
              onChange={e => setOverageRate(e.target.value)}
              className={`h-8 w-24 ${overageRateError ? "border-red-500" : ""}`}
              type="number"
              step="0.01"
              min="0"
              max="10000"
            />
            {overageRateError && <p className="text-xs text-red-500">{overageRateError}</p>}
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <Input
              value={maxWeight}
              onChange={e => setMaxWeight(e.target.value)}
              className={`h-8 w-24 ${maxWeightError ? "border-red-500" : ""}`}
              type="number"
              step="1"
              min="0"
            />
            {maxWeightError && <p className="text-xs text-red-500">{maxWeightError}</p>}
          </div>
        </TableCell>
        <TableCell>
          {hasChanges && (
            <Button size="sm" onClick={() => setConfirming(true)} disabled={hasErrors}>Save</Button>
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

  // Validate the current value
  const fieldError = (() => {
    const n = parseFloat(val);
    if (val === "" || isNaN(n)) return "Value is required";
    if (format === "currency") {
      if (n < 0) return "Price cannot be negative";
      if (n > 10000) return "Price too high (max $10,000)";
    } else if (format === "percent") {
      if (n < 0) return "Percentage cannot be negative";
      if (n > 100) return "Percentage too high (max 100%)";
    } else {
      if (n < 0) return "Value cannot be negative";
      if (n > 10000) return "Value too high";
    }
    return null;
  })();

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
            <div className="relative flex-1 max-w-[200px] space-y-1">
              <Input
                value={val}
                onChange={e => setVal(e.target.value)}
                className={`h-8 ${fieldError ? "border-red-500" : ""}`}
                type="number"
                step={format === "percent" ? "0.001" : "0.01"}
                min="0"
                max={format === "currency" ? "10000" : format === "percent" ? "100" : undefined}
              />
              {isPercent && (
                <span className="absolute right-3 top-[9px] text-xs text-muted-foreground">%</span>
              )}
              {format === "currency" && !isPercent && (
                <span className="absolute left-3 top-[9px] text-xs text-muted-foreground">$</span>
              )}
              {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
            </div>
            {row.description && (
              <span className="text-xs text-muted-foreground">{row.description}</span>
            )}
          </div>
        </div>
        {changed && (
          <Button size="sm" onClick={() => setConfirming(true)} disabled={!!fieldError}>Save</Button>
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

export function PricingTierEditor({
  serviceTiers,
  deliveryFees,
  taxConfig,
  commissions,
  serviceMultipliers,
  loyaltyConfig,
  toast,
}: {
  serviceTiers: PricingConfigRow[];
  deliveryFees: PricingConfigRow[];
  taxConfig: PricingConfigRow[];
  commissions: PricingConfigRow[];
  serviceMultipliers: PricingConfigRow[];
  loyaltyConfig: PricingConfigRow[];
  toast: any;
}) {
  return {
    TiersTab: (
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
    ),
    DeliveryTab: (
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
    ),
    TaxTab: (
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
    ),
    CommissionsTab: (
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
    ),
    MultipliersTab: (
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
    ),
    LoyaltyTab: (
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
    ),
  };
}
