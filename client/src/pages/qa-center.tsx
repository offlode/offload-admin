import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  ExternalLink,
  Globe,
  ShoppingCart,
  UserPlus,
  Package,
  LayoutDashboard,
  ListOrdered,
  ClipboardList,
  Truck,
  DollarSign,
  Tag,
  AlertTriangle,
  Sparkles,
  Bell,
  MapPin,
  Mic,
  Video,
  Figma,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";

type Status = "working" | "needs_review" | "external_blocker";
type Reality = "real" | "sandbox" | "manual" | "simulated" | "not_built";

interface QAItem {
  title: string;
  description: string;
  href: string;
  status: Status;
  reality: Reality;
  icon: React.ElementType;
  note?: string;
  external?: boolean;
}

const STATUS_CONFIG: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; emoji: string }> = {
  working: { label: "Working", variant: "outline", emoji: "✅" },
  needs_review: { label: "Needs review", variant: "secondary", emoji: "⚠" },
  external_blocker: { label: "External blocker", variant: "destructive", emoji: "🔒" },
};

const REALITY_CONFIG: Record<Reality, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; emoji: string }> = {
  real: { label: "Production-real", variant: "default", emoji: "🟢" },
  sandbox: { label: "Sandbox-only", variant: "secondary", emoji: "🟡" },
  manual: { label: "Manual", variant: "outline", emoji: "✋" },
  simulated: { label: "Simulated", variant: "outline", emoji: "🎭" },
  not_built: { label: "Not built", variant: "destructive", emoji: "🚫" },
};

type DecisionStatus = "done" | "owner_manual" | "external_blocker";

interface OwnerDecision {
  id: string;
  label: string;
  status: DecisionStatus;
  note?: string;
}

const OWNER_DECISIONS: OwnerDecision[] = [
  { id: "D1", label: "Figma anonymous-link retry", status: "owner_manual", note: "35-frame discrepancy doc captured; needs your local Comet" },
  { id: "D2", label: "Signature Wash card → wash_fold preselect", status: "done", note: "Commit 2ec6796 — site verified" },
  { id: "D3", label: "Same Day card → speed +$12.99 (no dup add-on)", status: "done", note: "Commit 2ec6796 — site verified" },
  { id: "D4", label: "Real customer dashboard/checkout/track/order-detail/support", status: "done", note: "Commit 3917c25 — no 404s" },
  { id: "D5", label: "Sign-in aligned to dark brand (#1C1C1C + Montserrat)", status: "done", note: "Commits a6263089 + 40e7814" },
  { id: "D6", label: "Admin design polish — clean, professional, branded", status: "done", note: "Commit a6263089" },
  { id: "D7", label: "Remove Virginia badge; NYC + 6–12mo copy", status: "done", note: "Commit eec2cfb — site verified 0 Virginia hits" },
  { id: "D8", label: "iOS popup non-intrusive / config-flag gated", status: "done", note: "window.__OFFLOAD_SHOW_IOS_POPUP__" },
  { id: "D9", label: "NJ checkout-gated copy (no date estimate)", status: "done", note: "Verified: 07030 returns correct copy" },
  { id: "D10", label: "Prod API deploy at f8285ea (non-live parity)", status: "done", note: "Superseded by 2ef70d9c (incl. schema migration)" },
  { id: "V1", label: "Voice UI honesty — BETA badge + missing-key disclaimer", status: "done", note: "Commit cf2a249" },
  { id: "V2", label: "Voice live mode (OpenAI key)", status: "external_blocker", note: "OWNER ACTION: add OPENAI_API_KEY on Render sandbox env" },
  { id: "M1", label: "Google Cloud Maps allowlist verification", status: "owner_manual", note: "30-sec visual check in Cloud Console" },
  { id: "L1", label: "Loom 1 re-record (NOT PRESS-READY)", status: "owner_manual", note: "Only owner can record" },
  { id: "L2", label: "Loom 2 — keep private (DO NOT SEND)", status: "done", note: "Marked private in this QA Center" },
];

const DECISION_STATUS_CONFIG: Record<DecisionStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; emoji: string }> = {
  done: { label: "Done", variant: "default", emoji: "✅" },
  owner_manual: { label: "Owner manual", variant: "outline", emoji: "✋" },
  external_blocker: { label: "External blocker", variant: "destructive", emoji: "🔒" },
};

const QA_ITEMS: QAItem[] = [
  {
    title: "Public Site",
    description: "Marketing homepage — Signature Wash, Same Day, NYC expansion copy, lead capture.",
    href: "https://offloadusa.com",
    status: "working",
    reality: "real",
    icon: Globe,
    external: true,
  },
  {
    title: "Quote / Checkout Flow",
    description: "Full funnel from address entry → bag count → card capture → order placed.",
    href: "https://offloadusa.com/order",
    status: "needs_review",
    reality: "simulated",
    icon: ShoppingCart,
    note: "Stripe test mode only — no sk_live, no live payments",
    external: true,
  },
  {
    title: "Customer Signup / Login",
    description: "New account creation and returning-user authentication on the customer app.",
    href: "https://offloadusa.com/login",
    status: "working",
    reality: "real",
    icon: UserPlus,
    external: true,
  },
  {
    title: "Customer Dashboard",
    description: "Logged-in customer home — orders, status, account.",
    href: "https://offloadusa.com/dashboard",
    status: "working",
    reality: "real",
    icon: LayoutDashboard,
    external: true,
  },
  {
    title: "Customer Order Tracking",
    description: "Live status page customers see after placing an order.",
    href: "https://offloadusa.com/track",
    status: "working",
    reality: "real",
    icon: Package,
    external: true,
  },
  {
    title: "Customer Support",
    description: "Support / help center for customer-facing issues.",
    href: "https://offloadusa.com/support",
    status: "working",
    reality: "real",
    icon: ClipboardCheck,
    external: true,
  },
  {
    title: "Admin Dashboard",
    description: "Top-level KPI snapshot — revenue, orders, customers, drivers.",
    href: "#/",
    status: "working",
    reality: "real",
    icon: LayoutDashboard,
  },
  {
    title: "Orders List / Detail",
    description: "Full order table with status filters and per-order detail view.",
    href: "#/orders",
    status: "working",
    reality: "real",
    icon: ListOrdered,
  },
  {
    title: "Vendor Applications",
    description: "Driver and laundromat partner sign-ups requiring review and auto-screen scores.",
    href: "#/applications",
    status: "working",
    reality: "real",
    icon: ClipboardList,
  },
  {
    title: "Driver List",
    description: "All active and inactive drivers, assignment history, and ratings.",
    href: "#/drivers",
    status: "working",
    reality: "real",
    icon: Truck,
  },
  {
    title: "Pricing Config",
    description: "Base service pricing, per-bag rates, and zone multipliers.",
    href: "#/pricing-config",
    status: "working",
    reality: "real",
    icon: DollarSign,
  },
  {
    title: "Promos",
    description: "Promo codes, loyalty rewards, and referral program rules.",
    href: "#/promos",
    status: "working",
    reality: "real",
    icon: Tag,
  },
  {
    title: "Disputes",
    description: "Open and resolved customer/driver disputes with resolution workflow.",
    href: "#/disputes",
    status: "working",
    reality: "real",
    icon: AlertTriangle,
  },
  {
    title: "Add-on Pricing",
    description: "Special handling fees — delicates, comforters, rush, etc.",
    href: "#/add-ons",
    status: "working",
    reality: "real",
    icon: Sparkles,
  },
  {
    title: "Notification Rules",
    description: "Trigger conditions and templates for SMS/email/push notifications.",
    href: "#/notification-rules",
    status: "needs_review",
    reality: "sandbox",
    icon: Bell,
    note: "UI live; APNs/FCM not wired to production",
  },
  {
    title: "Service Area Requests (D4 Leads)",
    description: "ZIP-code interest submissions and demand heat-map for expansion planning.",
    href: "#/service-area-requests",
    status: "working",
    reality: "real",
    icon: MapPin,
  },
  {
    title: "Voice Order (Sandbox)",
    description: "End-to-end voice ordering — BETA. Parser passes EN+ES; live mode blocked on OpenAI key.",
    href: "https://offloadusa.com/voice-order",
    status: "external_blocker",
    reality: "sandbox",
    icon: Mic,
    external: true,
    note: "Add OPENAI_API_KEY to Render env to enable live mode",
  },
];

const MEDIA_ITEMS = [
  {
    title: "Loom 1 — Product Walkthrough",
    description: "Full end-to-end product demo recorded for internal review.",
    href: "https://www.loom.com/share/177b8d1edc624c368d12c5056b7fa8ce",
    note: "⚠ NOT PRESS-READY — needs a clean re-record",
    noteVariant: "secondary" as const,
    icon: Video,
  },
  {
    title: "Loom 2 — Investor Deck Walkthrough",
    description: "Narrated walkthrough of the investor deck and key metrics.",
    href: "https://www.loom.com/share/7dcc9f51d3f1431d8fa9684d933f9b4f",
    note: "🔒 PRIVATE — DO NOT SEND",
    noteVariant: "destructive" as const,
    icon: Video,
  },
  {
    title: "Figma — Design System & Flows",
    description: "Anonymous link currently renders blank canvas in cloud browser.",
    href: "https://www.figma.com/design/WAUxqr93Hus4v4mm1c8yrq/Offload-new-version",
    note: "Owner manual — view from your local browser",
    noteVariant: "outline" as const,
    icon: Figma,
  },
];

function DecisionIcon({ status }: { status: DecisionStatus }) {
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  if (status === "owner_manual") return <Circle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
}

export default function QACenterPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Owner QA Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every QA-worthy surface in one place — admin-only, sandbox-safe. No secrets shown.
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">Admin only</Badge>
      </div>

      {/* Final Status Banner */}
      <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="p-4 text-xs">
          <p className="font-medium mb-1">Current owner-ready status</p>
          <p className="text-muted-foreground">
            Ready for owner manual sandbox walkthrough, not production-final because live Stripe /
            Apple / Google / OpenAI-key remain external blockers, and not press-ready because Loom 1
            needs a clean re-record and Loom 2 must stay private.
          </p>
        </CardContent>
      </Card>

      {/* Owner Decisions */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Owner Decisions (D1–D10 + voice/maps/Loom)
        </h2>
        <Card>
          <CardContent className="p-4 space-y-2">
            {OWNER_DECISIONS.map((d) => {
              const cfg = DECISION_STATUS_CONFIG[d.status];
              return (
                <div key={d.id} className="flex items-start gap-3 text-xs">
                  <DecisionIcon status={d.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold">{d.id}</span>
                      <span className="font-medium">{d.label}</span>
                      <Badge variant={cfg.variant} className="text-[10px]">
                        {cfg.emoji} {cfg.label}
                      </Badge>
                    </div>
                    {d.note && (
                      <p className="text-muted-foreground mt-0.5">{d.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Reality-tag legend */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Legend
        </h2>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Status</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
                <span key={cfg.label} className="flex items-center gap-1.5">
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Reality</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(REALITY_CONFIG).map(([, cfg]) => (
                <span key={cfg.label} className="flex items-center gap-1.5">
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QA Surface Cards */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Live Surfaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QA_ITEMS.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const rcfg = REALITY_CONFIG[item.reality];
            const Icon = item.icon;
            return (
              <Card key={item.title} className="flex flex-col">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {item.title}
                    </CardTitle>
                    <Badge
                      variant={cfg.variant}
                      className="text-[10px] shrink-0 whitespace-nowrap"
                    >
                      {cfg.emoji} {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Badge variant={rcfg.variant} className="text-[10px]">
                      {rcfg.emoji} {rcfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-3 px-4 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground flex-1">
                    {item.description}
                  </p>
                  {item.note && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      {item.note}
                    </p>
                  )}
                  <a
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="inline-block"
                  >
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs w-full">
                      {item.external ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : (
                        <LayoutDashboard className="h-3.5 w-3.5" />
                      )}
                      {item.external ? "Open" : "Go to"}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Media & Design Links */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Media & Design (Private)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MEDIA_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="flex flex-col border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-3 px-4 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground flex-1">
                    {item.description}
                  </p>
                  <Badge variant={item.noteVariant} className="text-[10px] w-fit">
                    {item.note}
                  </Badge>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs w-full">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open link
                    </Button>
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground pb-2">
        This page is admin-only and does not expose any API keys, passwords, or Stripe secrets.
        All external links open in a new tab. Sandbox surfaces are clearly marked. Reality tags
        reflect production vs sandbox truth.
      </p>
    </div>
  );
}
