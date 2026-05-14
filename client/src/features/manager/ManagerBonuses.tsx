import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, Target, Gift } from "lucide-react";
import { SectionHeader, SkeletonCard, SkeletonList } from "@/features/shared/components";
import type { BonusRule, BonusPayout } from "@/features/shared/types";
import { Progress } from "@/components/ui/progress";

// ─── Mock data ───
const MOCK_RULES: (BonusRule & { progress?: number })[] = [
  {
    id: 1,
    vendor_id: null,
    rule_type: "five_star_streak",
    threshold: 5,
    amount_cents: 500,
    active: true,
    description: "5-Star Streak: +$5 for every 5 consecutive 5-star reviews",
    progress: 3,
  },
  {
    id: 2,
    vendor_id: null,
    rule_type: "weekly_volume",
    threshold: 25,
    amount_cents: 2000,
    active: true,
    description: "Volume Bonus: +$20 for completing 25+ orders in a week",
    progress: 18,
  },
  {
    id: 3,
    vendor_id: null,
    rule_type: "on_time",
    threshold: 95,
    amount_cents: 1000,
    active: true,
    description: "On-Time Champion: +$10 for maintaining 95%+ on-time rate this month",
    progress: 96,
  },
];

const MOCK_PAYOUTS: BonusPayout[] = [
  { id: 1, vendor_id: 1, rule_id: 1, period_start: "2026-05-01", period_end: "2026-05-07", amount_cents: 500, triggered_at: "2026-05-07T18:00:00Z" },
  { id: 2, vendor_id: 1, rule_id: 2, period_start: "2026-04-28", period_end: "2026-05-04", amount_cents: 2000, triggered_at: "2026-05-05T12:00:00Z" },
  { id: 3, vendor_id: 1, rule_id: 1, period_start: "2026-04-21", period_end: "2026-04-27", amount_cents: 500, triggered_at: "2026-04-28T10:00:00Z" },
];

// ─── Helpers ───
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getRuleIcon(ruleType: string) {
  switch (ruleType) {
    case "five_star_streak":
      return <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
    case "weekly_volume":
      return <Target className="w-5 h-5 text-blue-400" />;
    case "on_time":
      return <Trophy className="w-5 h-5 text-green-400" />;
    default:
      return <Gift className="w-5 h-5 text-purple-400" />;
  }
}

function getProgressLabel(rule: BonusRule & { progress?: number }): string {
  const progress = rule.progress ?? 0;
  if (rule.rule_type === "on_time") {
    return `${progress}% on-time (target: ${rule.threshold}%)`;
  }
  return `${progress} of ${rule.threshold} to next bonus`;
}

function getProgressPercent(rule: BonusRule & { progress?: number }): number {
  const progress = rule.progress ?? 0;
  if (rule.threshold <= 0) return 0;
  return Math.min(100, (progress / rule.threshold) * 100);
}

export default function ManagerBonuses() {
  const { data: rules, isLoading: rulesLoading } = useQuery<(BonusRule & { progress?: number })[]>({
    queryKey: ["/api/vendors/me/bonus-rules"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/bonus-rules");
        return await res.json();
      } catch {
        return MOCK_RULES;
      }
    },
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<BonusPayout[]>({
    queryKey: ["/api/vendors/me/bonuses"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/bonuses");
        return await res.json();
      } catch {
        return MOCK_PAYOUTS;
      }
    },
  });

  const bonusRules = rules ?? MOCK_RULES;
  const bonusPayouts = payouts ?? MOCK_PAYOUTS;

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader title="Performance Bonuses" />

      {/* ─── Active Bonus Rules ─── */}
      {rulesLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="space-y-3">
          {bonusRules.filter((r) => r.active).map((rule) => (
            <div key={rule.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {getRuleIcon(rule.rule_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rule.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reward: {formatCents(rule.amount_cents)}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{getProgressLabel(rule)}</span>
                  <span className="font-medium">{Math.round(getProgressPercent(rule))}%</span>
                </div>
                <Progress value={getProgressPercent(rule)} className="h-2" />
              </div>
            </div>
          ))}

          {bonusRules.filter((r) => r.active).length === 0 && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active bonus rules at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Recent Bonus Payouts ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Recent Bonus Payouts" />
        {payoutsLoading ? (
          <SkeletonList count={3} />
        ) : bonusPayouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bonus payouts yet. Keep up the great work!</p>
        ) : (
          <div className="space-y-0">
            {bonusPayouts.map((payout) => {
              const matchedRule = bonusRules.find((r) => r.id === payout.rule_id);
              return (
                <div
                  key={payout.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {matchedRule?.description?.split(":")[0] ?? "Bonus"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payout.period_start} &mdash; {payout.period_end}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-green-400">
                      +{formatCents(payout.amount_cents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payout.triggered_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
