import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DollarSign,
  Star,
  MapPin,
  CheckCircle,
  Navigation,
  ChevronRight,
  Truck,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KPICard,
  StatusPill,
  SectionHeader,
  SkeletonCard,
  SkeletonList,
  EmptyState,
} from "@/features/shared/components";
import type { DriverStats, OrderListItem } from "@/features/shared/types";

// ─── Types ───

interface DriverProfile {
  id: number;
  name: string;
  status: "available" | "offline" | "on_trip";
  stats: DriverStats;
}

interface DriverJob {
  id: number;
  order_number: string;
  customer_name: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  display_status: string;
  scheduled_pickup: string | null;
  bags: string;
}

// ─── Empty defaults ───

const EMPTY_PROFILE: DriverProfile = {
  id: 0,
  name: "",
  status: "offline",
  stats: {
    earned_today: 0,
    rating: 0,
    miles_today: 0,
    trips_completed: 0,
  },
};

// ─── Greeting helper ───

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Component ───

export default function DriverDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch driver profile
  const {
    data: driver,
    isLoading: profileLoading,
  } = useQuery<DriverProfile>({
    queryKey: ["/api/drivers/me"],
    select: (data) => data ?? EMPTY_PROFILE,
  });

  const profile = driver ?? EMPTY_PROFILE;

  // Fetch driver jobs
  const {
    data: jobs,
    isLoading: jobsLoading,
  } = useQuery<DriverJob[]>({
    queryKey: ["/api/drivers/me/jobs"],
    select: (data) => data ?? [],
  });

  const driverJobs = jobs ?? [];
  const activeJob = driverJobs.find(
    (j) =>
      j.status === "pickup_in_progress" ||
      j.status === "out_for_delivery" ||
      j.status === "driver_assigned"
  );
  const upcomingJobs = driverJobs
    .filter((j) => j.id !== activeJob?.id && j.status !== "delivered" && j.status !== "completed")
    .slice(0, 5);

  // Status toggle mutation
  const [isOnline, setIsOnline] = useState(profile.status !== "offline");

  const statusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      const res = await apiRequest("PATCH", "/api/drivers/me/status", {
        status: online ? "available" : "offline",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/me"] });
    },
    onError: (error: Error) => {
      setIsOnline(!isOnline);
      toast({
        title: "Status update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function handleStatusToggle(checked: boolean) {
    setIsOnline(checked);
    statusMutation.mutate(checked);
  }

  // Keep local state in sync with server data
  if (driver && ((driver.status !== "offline") !== isOnline) && !statusMutation.isPending) {
    setIsOnline(driver.status !== "offline");
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
      {/* Header / Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {getGreeting()}, {user?.name ?? "Driver"}!
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOnline ? "You're online and accepting trips" : "You're currently offline"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isOnline ? "Online" : "Offline"}
          </span>
          <Switch
            checked={isOnline}
            onCheckedChange={handleStatusToggle}
            disabled={statusMutation.isPending}
          />
        </div>
      </div>

      {/* Stats Grid */}
      {profileLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Earned Today"
            value={`$${profile.stats.earned_today.toFixed(2)}`}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <KPICard
            title="Rating"
            value={profile.stats.rating.toFixed(1)}
            icon={<Star className="w-4 h-4" />}
          />
          <KPICard
            title="Miles Today"
            value={profile.stats.miles_today.toFixed(1)}
            icon={<MapPin className="w-4 h-4" />}
          />
          <KPICard
            title="Trips Completed"
            value={profile.stats.trips_completed}
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Active Job */}
      <div>
        <SectionHeader title="Active Job" />
        {jobsLoading ? (
          <SkeletonCard />
        ) : activeJob ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  #{activeJob.order_number}
                </CardTitle>
                <StatusPill status={activeJob.status} label={activeJob.display_status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {activeJob.customer_name}
                </p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-start gap-1.5">
                    <span className="text-green-400 font-medium shrink-0">Pickup:</span>
                    {activeJob.pickup_address}
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-medium shrink-0">Delivery:</span>
                    {activeJob.delivery_address}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const address =
                      activeJob.status === "out_for_delivery"
                        ? activeJob.delivery_address
                        : activeJob.pickup_address;
                    window.open(
                      `https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`,
                      "_blank"
                    );
                  }}
                >
                  <Navigation className="w-4 h-4" />
                  Navigate
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/driver/orders/${activeJob.id}`)}
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            title="No Active Job"
            description={
              isOnline
                ? "You'll be notified when a new trip is assigned to you."
                : "Go online to start receiving trip assignments."
            }
            icon={<Truck className="w-10 h-10" />}
          />
        )}
      </div>

      {/* Upcoming Jobs */}
      <div>
        <SectionHeader title="Upcoming Jobs" />
        {jobsLoading ? (
          <SkeletonList count={3} />
        ) : upcomingJobs.length > 0 ? (
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/driver/orders/${job.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        #{job.order_number} - {job.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.bags} bag{job.bags !== "1" ? "s" : ""} &middot;{" "}
                        {job.scheduled_pickup
                          ? new Date(job.scheduled_pickup).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Flexible"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={job.status} label={job.display_status} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Upcoming Jobs"
            description="New assignments will appear here."
            icon={<CheckCircle className="w-10 h-10" />}
          />
        )}
      </div>
    </div>
  );
}
