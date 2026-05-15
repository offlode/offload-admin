import { useQuery } from "@tanstack/react-query";
import { Package, Users, DollarSign, Clock, Bell, ArrowRight, Award } from "lucide-react";
import { useLocation } from "wouter";
import { KPICard, SkeletonCard } from "@/features/shared/components";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const { data: vendorInfo } = useQuery<{ certified?: boolean }>({
    queryKey: ["/api/laundromats/me"],
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/laundromats/me");
        return res.json();
      } catch {
        return {};
      }
    },
  });

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, {user?.name || "Owner"}</h1>
          <p className="text-sm text-muted-foreground">Your laundromat at a glance</p>
        </div>
        {vendorInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={vendorInfo.certified ? "default" : "secondary"}
                className={`flex items-center gap-1 shrink-0 ${
                  vendorInfo.certified ? "bg-[#5B4BC4] hover:bg-[#5B4BC4]/90" : ""
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                {vendorInfo.certified ? "Certified" : "Uncertified"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] text-xs">
              {vendorInfo.certified
                ? "Your laundromat is Offload Certified. You receive a 60-second priority window on incoming dispatch offers before other laundromats."
                : "Your laundromat is not yet certified. Meet the quality review thresholds to earn Certified status and a 60-second priority window on dispatch offers."}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {k.pending_offers > 0 && (
        <div
          className="bg-[#5B4BC4]/10 border border-[#5B4BC4]/30 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#5B4BC4]/15 transition-colors"
          onClick={() => navigate("/owner/incoming")}
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-[#5B4BC4]" />
            <div>
              <span className="font-semibold text-[#5B4BC4]">{k.pending_offers} incoming offer{k.pending_offers !== 1 ? "s" : ""}</span>
              <p className="text-xs text-muted-foreground">New orders waiting to be accepted</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[#5B4BC4]" />
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
          <Bell className="h-5 w-5 mr-3 text-[#5B4BC4]" />
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
          <Package className="h-5 w-5 mr-3 text-[#5B4BC4]" />
          <div className="text-left">
            <div className="font-medium">All Orders</div>
            <div className="text-xs text-muted-foreground">View and manage your orders</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
