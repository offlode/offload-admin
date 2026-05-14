import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Package, Loader, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { KPICard, SkeletonCard, SectionHeader } from "@/features/shared/components";
import type { OperatorKPI } from "@/features/shared/types";
import { Button } from "@/components/ui/button";

const FALLBACK_KPIS: OperatorKPI = {
  processed_today: 12,
  currently_washing: 3,
  avg_wash_time_min: 42,
  quality_pct: 97,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: kpis, isLoading } = useQuery<OperatorKPI>({
    queryKey: ["/api/operators/me/kpis"],
    placeholderData: FALLBACK_KPIS,
  });

  const data = kpis ?? FALLBACK_KPIS;

  return (
    <div className="min-h-screen bg-background p-4 pb-20 max-w-2xl mx-auto">
      {/* Greeting */}
      <h1 className="text-2xl font-bold mb-6">
        {getGreeting()}, {user?.name ?? "Operator"}!
      </h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KPICard
              title="Processed Today"
              value={data.processed_today}
              icon={<Package className="w-4 h-4" />}
            />
            <KPICard
              title="Currently Washing"
              value={data.currently_washing}
              icon={<Loader className="w-4 h-4" />}
            />
            <KPICard
              title="Avg Wash Time"
              value={`${data.avg_wash_time_min} min`}
              icon={<Clock className="w-4 h-4" />}
            />
            <KPICard
              title="Quality %"
              value={`${data.quality_pct}%`}
              icon={<CheckCircle className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* Wash Queue Link */}
      <SectionHeader
        title="Wash Queue"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/operator/queue")}
          >
            View All
          </Button>
        }
      />
      <div
        className="bg-card border border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => navigate("/operator/queue")}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Orders waiting</p>
            <p className="text-xl font-bold mt-1">
              {isLoading ? "..." : data.currently_washing} active
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
