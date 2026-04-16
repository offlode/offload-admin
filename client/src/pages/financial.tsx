import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight, CreditCard } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function FinancialPage() {
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/orders"] });

  const financials = useMemo(() => {
    const grossRevenue = transactions.filter(t => t.type === "payment").reduce((s, t) => s + t.amount, 0);
    const vendorPayouts = transactions.filter(t => t.type === "payout_vendor").reduce((s, t) => s + t.amount, 0);
    const driverPayouts = transactions.filter(t => t.type === "payout_driver").reduce((s, t) => s + t.amount, 0);
    const platformFees = orders.reduce((s: number, o: any) => s + (o.platformFee || 0), 0);
    const refunds = transactions.filter(t => t.type === "refund").reduce((s, t) => s + t.amount, 0);
    const netRevenue = grossRevenue - vendorPayouts - driverPayouts - refunds;

    return { grossRevenue, vendorPayouts, driverPayouts, platformFees, refunds, netRevenue };
  }, [transactions, orders]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; payouts: number }> = {};
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months[key] = { month: label, revenue: 0, payouts: 0 };
    }
    transactions.forEach(t => {
      const key = t.createdAt.substring(0, 7);
      if (months[key]) {
        if (t.type === "payment") months[key].revenue += t.amount;
        if (t.type === "payout_vendor" || t.type === "payout_driver") months[key].payouts += t.amount;
      }
    });
    return Object.values(months);
  }, [transactions]);

  const pendingPayouts = transactions.filter(t => t.status === "pending" && (t.type === "payout_vendor" || t.type === "payout_driver"));

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Financial Overview</h1>
        <p className="text-sm text-muted-foreground">Revenue, payouts, and transaction history</p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><ArrowUpRight className="h-3.5 w-3.5 text-green-500" /><span className="text-xs text-muted-foreground">Gross Revenue</span></div>
          <p className="text-lg font-semibold">{formatCurrency(financials.grossRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><CreditCard className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Platform Fees</span></div>
          <p className="text-lg font-semibold">{formatCurrency(financials.platformFees)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><ArrowDownRight className="h-3.5 w-3.5 text-red-500" /><span className="text-xs text-muted-foreground">Vendor Payouts</span></div>
          <p className="text-lg font-semibold">{formatCurrency(financials.vendorPayouts)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><ArrowDownRight className="h-3.5 w-3.5 text-orange-500" /><span className="text-xs text-muted-foreground">Driver Payouts</span></div>
          <p className="text-lg font-semibold">{formatCurrency(financials.driverPayouts)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><ArrowDownRight className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Refunds</span></div>
          <p className="text-lg font-semibold">{formatCurrency(financials.refunds)}</p>
        </CardContent></Card>
        <Card className="border-primary/30"><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">Net Revenue</span></div>
          <p className="text-lg font-semibold text-primary">{formatCurrency(financials.netRevenue)}</p>
        </CardContent></Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue vs Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" width={55} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="hsl(248, 51%, 53%)" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="payouts" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Payouts" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="pending">Pending Payouts ({pendingPayouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Type</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Description</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Amount</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map((t: any) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="text-xs capitalize">{t.type.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs">{t.description}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={t.status === "completed" ? "default" : "secondary"} className="text-xs">{t.status}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-medium">{formatCurrency(t.amount)}</td>
                        <td className="py-2 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-4">
              {pendingPayouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No pending payouts</p>
              ) : (
                <div className="space-y-2">
                  {pendingPayouts.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()} · {t.recipientType}</p>
                      </div>
                      <span className="font-semibold">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
