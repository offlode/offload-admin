import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, Target, Gift } from "lucide-react";
import { SectionHeader, SkeletonCard, SkeletonList } from "@/features/shared/components";
import type { BonusRule, BonusPayout } from "@/features/shared/types";
import { Progress } from "@/components/ui/progress";


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

function getProgressLabel(rule: BonusRule): string {
  const progress = rule.progress ?? 0;
  if (rule.ruleType === "on_time") {
    return `${progress}% on-time (target: ${rule.threshold}%)`;
  }
  return `${progress} of ${rule.threshold} to next bonus`;
}

function getProgressPercent(rule: BonusRule): number {
  const progress = rule.progress ?? 0;
  if (rule.threshold <= 0) return 0;
  return Math.min(100, (progress / rule.threshold) * 100);
}

export default function ManagerBonuses() {
  // Bonus rules: GET /api/vendors/:id/bonus-rules (vendor_id from auth)
  const { data: rulesResp, isLoading: rulesLoading } = useQuery<{ rules: BonusRule[] }>({
    queryKey: ["/api/vendors/me/bonus-rules"],
    // TODO: actual endpoint is GET /api/vendors/:id/bonus-rules — manager's vendor_id from auth
  });

  // Bonus payouts: GET /api/vendors/:id/bonuses
  const { data: payoutsResp, isLoading: payoutsLoading } = useQuery<{ payouts: BonusPayout[] }>({
    queryKey: ["/api/vendors/me/bonuses"],
    // TODO: actual endpoint is GET /api/vendors/:id/bonuses — manager's vendor_id from auth
  });

  const bonusRules = rulesResp?.rules ?? [];
  const bonusPayouts = payoutsResp?.payouts ?? [];

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
          {bonusRules.filter((r) => r.isActive).map((rule) => (
            <div key={rule.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {getRuleIcon(rule.ruleType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reward: {formatCents(rule.amountCents)}
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

          {bonusRules.filter((r) => r.isActive).length === 0 && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bonuses yet.</p>
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
          <p className="text-sm text-muted-foreground">No bonus payouts yet.</p>
        ) : (
          <div className="space-y-0">
            {bonusPayouts.map((payout) => {
              const matchedRule = bonusRules.find((r) => r.id === payout.ruleId);
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
                        {matchedRule?.name ?? "Bonus"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payout.reason}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-green-400">
                      +{formatCents(payout.amountCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payout.createdAt).toLocaleDateString("en-US", {
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
