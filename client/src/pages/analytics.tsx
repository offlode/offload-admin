import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const COLORS = ["hsl(167, 100%, 39%)", "hsl(220, 70%, 50%)", "hsl(280, 60%, 50%)", "hsl(43, 74%, 49%)", "hsl(0, 70%, 55%)"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<any>({ queryKey: ["/api/analytics/overview"] });

  if (isLoading) return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
      <div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );

  if (!analytics) return null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Deep insights across all platform metrics</p>
      </div>

      {/* Acquisition Funnel */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Customer Acquisition Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.funnel?.map((stage: any, i: number) => {
              const maxCount = analytics.funnel[0].count;
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 shrink-0">{stage.stage}</span>
                  <div className="flex-1 h-8 bg-muted/30 rounded overflow-hidden">
                    <div
                      className="h-full rounded flex items-center px-3"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    >
                      <span className="text-xs font-medium text-white">{stage.count.toLocaleString()}</span>
                    </div>
                  </div>
                  {i > 0 && (
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      {((stage.count / analytics.funnel[i - 1].count) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trends */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Weekly Revenue Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.weeklyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" width={50} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(167, 100%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CLV Distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Customer Lifetime Value Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.clvBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(167, 100%, 39%)" radius={[4, 4, 0, 0]} name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Zip Codes */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Zip Codes by Order Volume</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">#</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Zip Code</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Orders</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topZips?.map((z: any, i: number) => {
                    const totalOrders = analytics.topZips.reduce((s: number, x: any) => s + x.count, 0);
                    return (
                      <tr key={z.zip} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-3 font-mono font-medium">{z.zip}</td>
                        <td className="py-2 pr-3 text-right">{z.count}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(z.count / totalOrders) * 100}%` }} />
                            </div>
                            <span className="text-xs">{((z.count / totalOrders) * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tier Breakdown Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Customer Tier Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={Object.entries(analytics.tierBreakdown || {}).map(([tier, count]) => ({ name: tier, value: count as number }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {Object.keys(analytics.tierBreakdown || {}).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                  formatter={(v: number, name: string) => [v, name.charAt(0).toUpperCase() + name.slice(1)]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Driver Utilization */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Driver Utilization</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.driverUtilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, "Utilization"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                <Bar dataKey="utilization" fill="hsl(167, 100%, 39%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendor Performance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vendor Performance Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Vendor</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Health</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Quality</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Orders</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Avg Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.vendorPerformance?.map((v: any) => (
                    <tr key={v.name} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{v.name}</td>
                      <td className="py-2 pr-3">
                        <span className={`font-medium ${v.healthScore >= 80 ? 'text-green-500' : v.healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {v.healthScore.toFixed(0)}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{v.qualityScore.toFixed(1)}</td>
                      <td className="py-2 pr-3 text-right">{v.totalOrders}</td>
                      <td className="py-2 text-right">{v.avgProcessingTime.toFixed(0)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
