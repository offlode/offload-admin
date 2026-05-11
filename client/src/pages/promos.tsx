import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Users, Star, Gift } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function PromosPage() {
  const { data: promoCodes = [] } = useQuery<any[]>({ queryKey: ["/api/promo-codes"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // Refactor-C1 fix: align with offload server schema (type/value/isActive/usedCount).
  const [newCode, setNewCode] = useState({ code: "", description: "", type: "percentage", value: "", minOrderAmount: "0", maxUses: "" });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/promo-codes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      setOpen(false);
      toast({ title: "Promo code created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/promo-codes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      toast({ title: "Promo code updated" });
    },
  });

  // Loyalty stats
  const tierBreakdown = customers.reduce((acc: Record<string, number>, c: any) => {
    acc[c.tier] = (acc[c.tier] || 0) + 1;
    return acc;
  }, {});
  const totalPoints = customers.reduce((sum: number, c: any) => sum + c.loyaltyPoints, 0);
  const subscribers = customers.filter((c: any) => c.subscriptionType).length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Promos & Loyalty</h1>
          <p className="text-sm text-muted-foreground">Manage promotions, loyalty program, and referrals</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-promo"><Plus className="h-4 w-4 mr-1.5" /> New Promo Code</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Code</Label><Input value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" data-testid="input-promo-code" /></div>
              <div className="space-y-1.5"><Label>Description</Label><Input value={newCode.description} onChange={e => setNewCode({ ...newCode, description: e.target.value })} placeholder="25% off summer orders" data-testid="input-promo-desc" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={newCode.type} onValueChange={v => setNewCode({ ...newCode, type: v })}>
                    <SelectTrigger data-testid="select-discount-type"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Value</Label><Input type="number" value={newCode.value} onChange={e => setNewCode({ ...newCode, value: e.target.value })} placeholder="25" data-testid="input-discount-value" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Min Order ($)</Label><Input type="number" value={newCode.minOrderAmount} onChange={e => setNewCode({ ...newCode, minOrderAmount: e.target.value })} data-testid="input-min-order" /></div>
                <div className="space-y-1.5"><Label>Max Uses</Label><Input type="number" value={newCode.maxUses} onChange={e => setNewCode({ ...newCode, maxUses: e.target.value })} placeholder="Unlimited" data-testid="input-max-uses" /></div>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({
                  code: newCode.code,
                  description: newCode.description,
                  type: newCode.type,
                  value: parseFloat(newCode.value),
                  minOrderAmount: parseFloat(newCode.minOrderAmount) || 0,
                  maxUses: newCode.maxUses ? parseInt(newCode.maxUses) : null,
                  usedCount: 0,
                  isActive: true,
                  expiresAt: null,
                  createdAt: new Date().toISOString(),
                })}
                disabled={!newCode.code || !newCode.description || !newCode.value}
                data-testid="button-submit-promo"
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="promos">
        <TabsList>
          <TabsTrigger value="promos">Promo Codes</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="promos">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Code</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Description</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Discount</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Uses</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoCodes.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-3 font-mono font-medium">{p.code}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">{p.description}</td>
                        <td className="py-2.5 pr-3 font-medium">
                          {(p.type ?? p.discountType) === "percentage"
                            ? `${p.value ?? p.discountValue}%`
                            : formatCurrency(p.value ?? p.discountValue)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs">
                          {(p.usedCount ?? p.currentUses ?? 0)}{p.maxUses ? `/${p.maxUses}` : ""}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={(p.isActive ?? (p.status === "active")) ? "default" : "secondary"} className="text-xs capitalize">{(p.isActive ?? (p.status === "active")) ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="py-2.5">
                          {(p.isActive ?? (p.status === "active")) ? (
                            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateMutation.mutate({ id: p.id, data: { isActive: false } })} data-testid={`button-deactivate-${p.id}`}>
                              Deactivate
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateMutation.mutate({ id: p.id, data: { isActive: true } })} data-testid={`button-activate-${p.id}`}>
                              Activate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card><CardContent className="p-4 text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-xs text-muted-foreground">Total Points</p>
              <p className="text-lg font-semibold">{totalPoints.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Subscribers</p>
              <p className="text-lg font-semibold">{subscribers}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Active Promos</p>
              <p className="text-lg font-semibold">{promoCodes.filter((p: any) => p.status === "active").length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <Tag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Redemptions</p>
              <p className="text-lg font-semibold">{promoCodes.reduce((s: number, p: any) => s + (p.usedCount ?? p.currentUses ?? 0), 0)}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tier Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {["standard", "silver", "gold", "platinum"].map(tier => (
                  <div key={tier} className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground capitalize mb-1">{tier}</p>
                    <p className="text-xl font-semibold">{tierBreakdown[tier] || 0}</p>
                    <p className="text-xs text-muted-foreground">customers</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardContent className="p-6 text-center">
              <Gift className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Referral Program</p>
              <p className="text-xs text-muted-foreground mb-4">
                234 referrals completed · $2,340 in referral bonuses paid
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-lg font-semibold">234</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-lg font-semibold">$10</p>
                  <p className="text-xs text-muted-foreground">Per Referral</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-lg font-semibold">18%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
