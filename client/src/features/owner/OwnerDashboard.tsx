import { useQuery } from "@tanstack/react-query";
import { Package, Users, DollarSign, Clock, Bell, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { KPICard, SkeletonCard } from "@/features/shared/components";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

interface OwnerKPIs {
  orders_today: number;
  active_orders: number;
  completed_today: number;
  revenue_today_cents: number;
  pending_offers: number;
  employees_active: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: kpis, isLoading } = useQuery<OwnerKPIs>({
    queryKey: ["/api/vendors/me/kpis"],
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/kpis");
        return res.json();
      } catch {
        return {
          orders_today: 0,
          active_orders: 0,
          completed_today: 0,
          revenue_today_cents: 0,
          pending_offers: 0,
          employees_active: 0,
        };
      }
    },
  });

  const k = kpis ?? {
    orders_today: 0,
    active_orders: 0,
    completed_today: 0,
    revenue_today_cents: 0,
    pending_offers: 0,
    employees_active: 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}, {user?.name || "Owner"}</h1>
        <p className="text-sm text-muted-foreground">Your laundromat at a glance</p>
      </div>

      {k.pending_offers > 0 && (
        <div
          className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#7C3AED]/15 transition-colors"
          onClick={() => navigate("/owner/incoming")}
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-[#7C3AED]" />
            <div>
              <span className="font-semibold text-[#7C3AED]">{k.pending_offers} incoming offer{k.pending_offers !== 1 ? "s" : ""}</span>
              <p className="text-xs text-muted-foreground">New orders waiting to be accepted</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[#7C3AED]" />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard title="Orders Today" value={k.orders_today} icon={<Package className="h-4 w-4" />} />
            <KPICard title="Active" value={k.active_orders} icon={<Clock className="h-4 w-4" />} />
            <KPICard title="Completed" value={k.completed_today} icon={<Package className="h-4 w-4" />} />
            <KPICard
              title="Revenue Today"
              value={`$${((k.revenue_today_cents || 0) / 100).toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KPICard title="Pending Offers" value={k.pending_offers} icon={<Bell className="h-4 w-4" />} />
            <KPICard title="Employees" value={k.employees_active} icon={<Users className="h-4 w-4" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto p-4 justify-start"
          onClick={() => navigate("/owner/incoming")}
        >
          <Bell className="h-5 w-5 mr-3 text-[#7C3AED]" />
          <div className="text-left">
            <div className="font-medium">Incoming Orders</div>
            <div className="text-xs text-muted-foreground">Review and accept new orders</div>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto p-4 justify-start"
          onClick={() => navigate("/owner/orders")}
        >
          <Package className="h-5 w-5 mr-3 text-[#7C3AED]" />
          <div className="text-left">
            <div className="font-medium">All Orders</div>
            <div className="text-xs text-muted-foreground">View and manage your orders</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
