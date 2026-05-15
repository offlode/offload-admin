import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DollarSign, Percent, Truck, Scale, History, MapPin, Award, Sparkles } from "lucide-react";
import { usePricingConfig } from "./hooks/usePricingConfig";
import { PricingTierEditor } from "./PricingTierEditor";
import { SignaturePremiumCard } from "./SurgeConfigEditor";
import { ServiceAreaCard, CertifiedRulesCard } from "./AddOnPricingEditor";

export default function PricingConfigPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === "admin";

  const {
    allConfig,
    isLoading,
    auditLog,
    serviceTiers,
    deliveryFees,
    taxConfig,
    commissions,
    serviceMultipliers,
    loyaltyConfig,
  } = usePricingConfig();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading pricing configuration...</p>
      </div>
    );
  }

  const tabs = PricingTierEditor({
    serviceTiers,
    deliveryFees,
    taxConfig,
    commissions,
    serviceMultipliers,
    loyaltyConfig,
    toast,
  });

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
          {isSuperAdmin && (
            <TabsTrigger value="signature-premium"><Sparkles className="h-3.5 w-3.5 mr-1" /> Signature</TabsTrigger>
          )}
          <TabsTrigger value="service-area"><MapPin className="h-3.5 w-3.5 mr-1" /> Service Area</TabsTrigger>
          <TabsTrigger value="certified"><Award className="h-3.5 w-3.5 mr-1" /> Certified</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-3.5 w-3.5 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">{tabs.TiersTab}</TabsContent>
        <TabsContent value="delivery">{tabs.DeliveryTab}</TabsContent>
        <TabsContent value="tax">{tabs.TaxTab}</TabsContent>
        <TabsContent value="commissions">{tabs.CommissionsTab}</TabsContent>
        <TabsContent value="multipliers">{tabs.MultipliersTab}</TabsContent>
        <TabsContent value="loyalty">{tabs.LoyaltyTab}</TabsContent>

        {isSuperAdmin && (
          <TabsContent value="signature-premium">
            <SignaturePremiumCard toast={toast} />
          </TabsContent>
        )}

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
