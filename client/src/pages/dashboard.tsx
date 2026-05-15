import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, ShoppingCart, Users, Truck, TrendingUp, Percent,
  AlertTriangle, AlertCircle, UserMinus,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Link } from "wouter";
import { CANONICAL_TO_ADMIN_ORDER_STATUS } from "@/lib/order-status-map";
import { STATUS_CHART_COLORS } from "@/features/shared/constants";
import { KPICard } from "@/features/shared/components";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatStatus(s: string) {
  const adminLabel = CANONICAL_TO_ADMIN_ORDER_STATUS[s] ?? s;
  return adminLabel.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<any>({ queryKey: ["/api/dashboard/kpis"] });
  const { data: revenue, isLoading: revLoading } = useQuery<any[]>({ queryKey: ["/api/dashboard/revenue"] });
  const { data: statusData } = useQuery<any[]>({ queryKey: ["/api/dashboard/orders-by-status"] });
  const { data: recentOrders } = useQuery<any[]>({ queryKey: ["/api/dashboard/recent-orders"] });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live snapshot of the Offload network — revenue, orders, customers, drivers, and laundromat partners</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpisLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <KPICard icon={<DollarSign className="h-4 w-4" />} title="Total Revenue" value={formatCurrency(kpis?.totalRevenue || 0)} />
            <KPICard icon={<ShoppingCart className="h-4 w-4" />} title="Active Orders" value={kpis?.activeOrders || 0} />
            <KPICard icon={<Users className="h-4 w-4" />} title="Active Customers" value={kpis?.activeCustomers || 0} />
            <KPICard icon={<Truck className="h-4 w-4" />} title="Active Drivers" value={kpis?.activeDrivers || 0} />
            <KPICard icon={<TrendingUp className="h-4 w-4" />} title="Avg Order Value" value={formatCurrency(kpis?.avgOrderValue || 0)} />
            <KPICard icon={<Percent className="h-4 w-4" />} title="Platform Fees" value={formatCurrency(kpis?.platformFeeRevenue || 0)} />
          </>
        )}
      </div>

      {/* Alert Cards */}
      {kpis && (kpis.slaViolations > 0 || kpis.openDisputes > 0 || kpis.driverShortage) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {kpis.slaViolations > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{kpis.slaViolations} SLA Violations</p>
                  <p className="text-xs text-muted-foreground">Orders delivered late</p>
                </div>
              </CardContent>
            </Card>
          )}
          {kpis.openDisputes > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{kpis.openDisputes} Open Disputes</p>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </div>
              </CardContent>
            </Card>
          )}
          {kpis.driverShortage && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <UserMinus className="h-5 w-5 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Driver Shortage</p>
                  <p className="text-xs text-muted-foreground">Less than 3 drivers active</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {revLoading ? (
              <Skeleton className="h-[220px]" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    stroke="hsl(var(--muted-foreground))"
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`}
                    stroke="hsl(var(--muted-foreground))"
                    width={50}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(248, 51%, 53%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_CHART_COLORS[entry.status] || "#888"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [v, formatStatus(name)]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-xs">{formatStatus(value)}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-[220px]" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Order</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Customer</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Total</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders?.map((order: any) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/orders/${order.id}`} className="text-primary hover:underline font-medium" data-testid={`link-order-${order.id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{order.customerName}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(order.total)}</td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "delivered" ? "default" :
    status === "cancelled" ? "destructive" :
    "secondary";
  return (
    <Badge variant={variant} className="text-xs font-normal capitalize" data-testid={`badge-status-${status}`}>
      {formatStatus(status)}
    </Badge>
  );
}
