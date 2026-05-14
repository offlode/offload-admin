import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CreditCard,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Mail,
} from "lucide-react";
import { SectionHeader, SkeletonCard, SkeletonList } from "@/features/shared/components";
import type { BankAccount } from "@/features/shared/types";
import { Button } from "@/components/ui/button";

// ─── Types ───
interface Transaction {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  amount_cents: number;
  date: string;
  type: string;
}

interface WeeklyPayout {
  week_label: string;
  amount_cents: number;
  orders_count: number;
  paid_at: string | null;
}


// ─── Helpers ───
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getNextFriday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5 + (7 - dayOfWeek);
  const nextFri = new Date(today);
  nextFri.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  return nextFri.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManagerBanking() {
  // Bank account endpoint uses vendor ID from auth context
  const { data: bank, isLoading: bankLoading } = useQuery<BankAccount>({
    queryKey: ["/api/vendors/me/bank-account"],
    // TODO: actual endpoint is GET /api/vendors/:id/bank-account — manager's vendor_id from auth
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions?vendor_id=me"],
  });

  const { data: payouts } = useQuery<WeeklyPayout[]>({
    queryKey: ["/api/vendors/me/payouts"],
  });

  const b = bank ?? null;
  const txs = transactions ?? [];
  const wkPayouts = payouts ?? [];
  const lastPayout = wkPayouts[0] ?? null;

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader title="Banking & Payouts" />

      {/* ─── Direct Deposit Info (D8: bankName + last4 only, no routing) ─── */}
      {bankLoading ? (
        <SkeletonCard />
      ) : !b ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No bank account on file.</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href="mailto:support@offloadusa.com?subject=Setup%20Banking%20Info">
              <Mail className="w-4 h-4 mr-1" />
              Set Up Direct Deposit
            </a>
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Direct Deposit</p>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">{b.bankName} &#8226;&#8226;&#8226;&#8226;{b.lastFour}</span>
              </div>
            </div>
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Last Payout</p>
              {lastPayout ? (
                <div>
                  <p className="font-semibold">{formatCents(lastPayout.amount_cents)}</p>
                  <p className="text-xs text-muted-foreground">{lastPayout.paid_at}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payouts yet</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Next Payout</p>
              <p className="font-semibold text-sm">{getNextFriday()}</p>
            </div>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href="mailto:support@offloadusa.com?subject=Update%20Banking%20Info">
              <Mail className="w-4 h-4 mr-1" />
              Update Banking Info
            </a>
          </Button>
        </div>
      )}

      {/* ─── Transaction History ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Transaction History" />
        {txLoading ? (
          <SkeletonList count={4} />
        ) : txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-0">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{tx.order_number}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-green-400">{formatCents(tx.amount_cents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Weekly Payouts Roll-up ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Weekly Payouts" />
        {wkPayouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payouts yet.</p>
        ) : (
          <div className="space-y-0">
            {wkPayouts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{p.week_label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.orders_count} orders</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{formatCents(p.amount_cents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.paid_at ? (
                      <span className="text-green-400">
                        <DollarSign className="w-3 h-3 inline" /> Paid
                      </span>
                    ) : (
                      "Pending"
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
