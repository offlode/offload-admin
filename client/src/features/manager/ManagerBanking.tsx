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

// ─── Mock data ───
const MOCK_BANK: BankAccount = {
  id: 1,
  vendor_id: 1,
  bank_name: "Chase Business",
  last4: "4821",
  masked_routing: "****6789",
  status: "verified",
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 1, order_id: 1040, order_number: "OFF-1040", customer_name: "Alice Chen", amount_cents: 3200, date: "2026-05-14", type: "order" },
  { id: 2, order_id: 1038, order_number: "OFF-1038", customer_name: "Bob Martinez", amount_cents: 4550, date: "2026-05-13", type: "order" },
  { id: 3, order_id: 1035, order_number: "OFF-1035", customer_name: "Carol White", amount_cents: 2800, date: "2026-05-12", type: "order" },
  { id: 4, order_id: 1032, order_number: "OFF-1032", customer_name: "Dan Johnson", amount_cents: 5100, date: "2026-05-11", type: "order" },
  { id: 5, order_id: 1029, order_number: "OFF-1029", customer_name: "Eve Park", amount_cents: 3750, date: "2026-05-10", type: "order" },
];

const MOCK_PAYOUTS: WeeklyPayout[] = [
  { week_label: "May 5 - May 11", amount_cents: 18450, orders_count: 14, paid_at: "2026-05-12" },
  { week_label: "Apr 28 - May 4", amount_cents: 22100, orders_count: 18, paid_at: "2026-05-05" },
  { week_label: "Apr 21 - Apr 27", amount_cents: 15800, orders_count: 11, paid_at: "2026-04-28" },
];

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
  const { data: bank, isLoading: bankLoading } = useQuery<BankAccount>({
    queryKey: ["/api/vendors/me/bank-account"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/bank-account");
        return await res.json();
      } catch {
        return MOCK_BANK;
      }
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", "vendor_id=me"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/transactions?vendor_id=me");
        return await res.json();
      } catch {
        return MOCK_TRANSACTIONS;
      }
    },
  });

  const { data: payouts } = useQuery<WeeklyPayout[]>({
    queryKey: ["/api/vendors/me/payouts"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/payouts");
        return await res.json();
      } catch {
        return MOCK_PAYOUTS;
      }
    },
  });

  const b = bank ?? MOCK_BANK;
  const txs = transactions ?? MOCK_TRANSACTIONS;
  const wkPayouts = payouts ?? MOCK_PAYOUTS;
  const lastPayout = wkPayouts[0] ?? null;

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader title="Banking & Payouts" />

      {/* ─── Direct Deposit Info ─── */}
      {bankLoading ? (
        <SkeletonCard />
      ) : (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Direct Deposit</p>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">{b.bank_name}</span>
                <span className="text-muted-foreground">&bull;&bull;&bull;&bull; {b.last4}</span>
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
          <p className="text-sm text-muted-foreground">No weekly payouts available.</p>
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
