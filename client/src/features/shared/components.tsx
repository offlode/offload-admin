import { cn } from "@/lib/utils";
import { STATUS_COLORS, ORDER_PROGRESS_STATES } from "./types";

// ─── Status Pill ───
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const colors = STATUS_COLORS[status] || "bg-gray-500/20 text-gray-400";
  const displayLabel = label || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors)}>
      {displayLabel}
    </span>
  );
}

// ─── KPI Card ───
export function KPICard({ title, value, icon, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

// ─── Skeleton Card ───
export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-3 bg-muted rounded w-1/3 mb-3" />
      <div className="h-7 bg-muted rounded w-1/2 mb-2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );
}

// ─── Skeleton List ───
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-6 bg-muted rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Order Progress Timeline ───
export function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = ORDER_PROGRESS_STATES.findIndex((s) => s.key === currentStatus);

  return (
    <div className="space-y-0">
      {ORDER_PROGRESS_STATES.map((state, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;

        return (
          <div key={state.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 mt-1",
                  isCompleted && "bg-green-500 border-green-500",
                  isCurrent && "bg-primary border-primary ring-2 ring-primary/30",
                  isPending && "bg-transparent border-muted-foreground/30"
                )}
              />
              {idx < ORDER_PROGRESS_STATES.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-6",
                    isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-sm pb-4",
                isCompleted && "text-green-500",
                isCurrent && "text-primary font-semibold",
                isPending && "text-muted-foreground"
              )}
            >
              {state.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Header ───
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

// ─── Empty State ───
export function EmptyState({ title, description, icon }: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

// ─── Certified Badge ───
export function CertifiedBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold rounded-full",
      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
      "bg-orange-500/20 text-orange-400 border border-orange-500/30"
    )}>
      <svg className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Offload Certified{size === "lg" ? "\u2122" : ""}
    </span>
  );
}

// ─── Tab Pills ───
export function TabPills({ tabs, active, onChange }: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            active === tab.key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
