import { useQuery } from "@tanstack/react-query";
import { Package, Users, Building2, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { KPICard, SkeletonCard } from "@/features/shared/components";

interface SystemKPIs {
  total_orders: number;
  active_orders: number;
  total_customers: number;
  total_laundromats: number;
  revenue_today_cents: number;
  unmatched_orders: number;
}

export default function SuperDashboard() {
  const { data: kpis, isLoading } = useQuery<SystemKPIs>({
    queryKey: ["/api/dashboard/kpis"],
  });

  const { data: recentOrders } = useQuery<any[]>({
    queryKey: ["/api/dashboard/recent-orders"],
  });

  const k = kpis ?? {
    total_orders: 0,
    active_orders: 0,
    total_customers: 0,
    total_laundromats: 0,
    revenue_today_cents: 0,
    unmatched_orders: 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">System Dashboard</h1>
        <p className="text-sm text-muted-foreground">Super Admin overview of the Offload network</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard title="Total Orders" value={k.total_orders} icon={<Package className="h-4 w-4" />} />
            <KPICard title="Active Orders" value={k.active_orders} icon={<TrendingUp className="h-4 w-4" />} />
            <KPICard title="Customers" value={k.total_customers} icon={<Users className="h-4 w-4" />} />
            <KPICard title="Laundromats" value={k.total_laundromats} icon={<Building2 className="h-4 w-4" />} />
            <KPICard
              title="Revenue Today"
              value={`$${((k.revenue_today_cents || 0) / 100).toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KPICard
              title="Unmatched"
              value={k.unmatched_orders}
              icon={<AlertTriangle className="h-4 w-4" />}
              subtitle={k.unmatched_orders > 0 ? "Needs attention" : "All matched"}
            />
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Orders</h2>
        <div className="space-y-2">
          {(recentOrders ?? []).slice(0, 10).map((order: any) => (
            <a
              key={order.id}
              href={`#/super/orders/${order.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">{order.order_number || `#${order.id}`}</span>
                  <span className="text-xs text-muted-foreground ml-2">{order.customer_name || "Customer"}</span>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#5B4BC4]/10 text-[#5B4BC4]">
                {(order.status || "pending").replace(/_/g, " ")}
              </span>
            </a>
          ))}
          {(!recentOrders || recentOrders.length === 0) && (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent orders</p>
          )}
        </div>
      </div>
    </div>
  );
}
