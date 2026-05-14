import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Package, Loader, CheckCircle, DollarSign, Star, Clock, TrendingUp, Bell, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { KPICard, SkeletonCard, SectionHeader, CertifiedBadge } from "@/features/shared/components";
import type { ManagerKPI, PerformanceSnapshot } from "@/features/shared/types";
import { Button } from "@/components/ui/button";

// ─── Types ───
interface VendorProfile {
  id: number;
  name: string;
  location_label: string;
  certified: boolean;
  rating: number;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// ─── Mock / Fallback Data ───
const MOCK_VENDOR: VendorProfile = {
  id: 1,
  name: "Demo Laundry Co.",
  location_label: "Brooklyn, NY",
  certified: true,
  rating: 4.8,
};

const MOCK_KPIS: ManagerKPI = {
  new_orders: 7,
  active_orders: 12,
  completed_today: 4,
  revenue_this_week: 1845,
};

const MOCK_PERF: PerformanceSnapshot = {
  rating: 4.8,
  on_time_pct: 96,
  growth_pct: 12,
};

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, title: "New Order #1042", body: "Customer Jane D. placed a pickup order.", read: false, created_at: new Date().toISOString() },
  { id: 2, title: "Driver Unassigned", body: "Order #1038 needs a driver for delivery.", read: false, created_at: new Date().toISOString() },
  { id: 3, title: "5-Star Review", body: "You received a 5-star review from Mike R.", read: false, created_at: new Date().toISOString() },
];

// ─── Greeting helper ───
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: vendor, isLoading: vendorLoading } = useQuery<VendorProfile>({
    queryKey: ["/api/vendors/me"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me");
        return await res.json();
      } catch {
        return MOCK_VENDOR;
      }
    },
  });

  const { data: kpis, isLoading: kpiLoading } = useQuery<ManagerKPI>({
    queryKey: ["/api/vendors/me/kpis"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/kpis");
        return await res.json();
      } catch {
        return MOCK_KPIS;
      }
    },
  });

  const { data: perf } = useQuery<PerformanceSnapshot>({
    queryKey: ["/api/vendors/me/performance"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/performance");
        return await res.json();
      } catch {
        return MOCK_PERF;
      }
    },
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", "unread=true"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/notifications?unread=true");
        return await res.json();
      } catch {
        return MOCK_NOTIFICATIONS;
      }
    },
  });

  const v = vendor ?? MOCK_VENDOR;
  const k = kpis ?? MOCK_KPIS;
  const p = perf ?? MOCK_PERF;
  const notifs = notifications ?? MOCK_NOTIFICATIONS;

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* ─── Greeting Header ─── */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.name ?? "Manager"}!
          </h1>
          {v.certified && <CertifiedBadge />}
        </div>
        {vendorLoading ? (
          <div className="h-4 bg-muted rounded w-32 mt-1 animate-pulse" />
        ) : (
          <p className="text-sm text-muted-foreground mt-1">{v.location_label}</p>
        )}
      </div>

      {/* ─── KPI Tiles ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KPICard
              title="New Orders"
              value={k.new_orders}
              icon={<Package className="w-4 h-4" />}
            />
            <KPICard
              title="Active Orders"
              value={k.active_orders}
              icon={<Loader className="w-4 h-4" />}
            />
            <KPICard
              title="Completed Today"
              value={k.completed_today}
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <KPICard
              title="$ This Week"
              value={`$${k.revenue_this_week.toLocaleString()}`}
              icon={<DollarSign className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* ─── Performance Snapshot ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Performance Snapshot" />
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-bold">{p.rating}</span>
            </div>
            <span className="text-xs text-muted-foreground">Star Rating</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xl font-bold">{p.on_time_pct}%</span>
            </div>
            <span className="text-xs text-muted-foreground">On-Time</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xl font-bold">+{p.growth_pct}%</span>
            </div>
            <span className="text-xs text-muted-foreground">Growth</span>
          </div>
        </div>
      </div>

      {/* ─── Urgent Notifications ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader
          title="Urgent Notifications"
          action={
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {notifs.length > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
              {notifs.length} unread
            </span>
          }
        />
        {notifs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new notifications.</p>
        ) : (
          <ul className="space-y-3">
            {notifs.map((n) => (
              <li key={n.id} className="flex items-start gap-3">
                <div className="mt-1.5 flex-shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="justify-between h-auto py-3"
            onClick={() => navigate("/manager/orders")}
          >
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Orders Queue
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="justify-between h-auto py-3"
            onClick={() => navigate("/manager/employees")}
          >
            <span className="flex items-center gap-2">
              <Loader className="w-4 h-4" />
              Team Members
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="justify-between h-auto py-3"
            onClick={() => navigate("/manager/banking")}
          >
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Banking & Payouts
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
