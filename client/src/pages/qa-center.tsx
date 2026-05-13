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
} from "lucide-react";

type Status = "working" | "needs_review" | "external_blocker";

interface QAItem {
  title: string;
  description: string;
  href: string;
  status: Status;
  icon: React.ElementType;
  note?: string;
  external?: boolean;
}

const STATUS_CONFIG: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; emoji: string }> = {
  working: { label: "Working", variant: "outline", emoji: "✅" },
  needs_review: { label: "Needs review", variant: "secondary", emoji: "⚠" },
  external_blocker: { label: "External blocker", variant: "destructive", emoji: "🔒" },
};

const QA_ITEMS: QAItem[] = [
  {
    title: "Public Site",
    description: "Marketing homepage — pricing, how-it-works, service area coverage.",
    href: "https://offloadusa.com",
    status: "working",
    icon: Globe,
    external: true,
  },
  {
    title: "Quote / Checkout Flow",
    description: "Full funnel from address entry → bag count → card capture → order placed.",
    href: "https://offloadusa.com/order",
    status: "working",
    icon: ShoppingCart,
    external: true,
  },
  {
    title: "Customer Signup / Login",
    description: "New account creation and returning-user authentication on the customer app.",
    href: "https://offloadusa.com/login",
    status: "working",
    icon: UserPlus,
    external: true,
  },
  {
    title: "Customer Order Tracking",
    description: "Live status page customers see after placing an order.",
    href: "https://offloadusa.com/track",
    status: "working",
    icon: Package,
    external: true,
  },
  {
    title: "Admin Dashboard",
    description: "Top-level KPI snapshot — revenue, orders, customers, drivers.",
    href: "#/",
    status: "working",
    icon: LayoutDashboard,
  },
  {
    title: "Orders List / Detail",
    description: "Full order table with status filters and per-order detail view.",
    href: "#/orders",
    status: "working",
    icon: ListOrdered,
  },
  {
    title: "Vendor Applications",
    description: "Driver and laundromat partner sign-ups requiring review and auto-screen scores.",
    href: "#/applications",
    status: "working",
    icon: ClipboardList,
  },
  {
    title: "Driver List",
    description: "All active and inactive drivers, assignment history, and ratings.",
    href: "#/drivers",
    status: "working",
    icon: Truck,
  },
  {
    title: "Pricing Config",
    description: "Base service pricing, per-bag rates, and zone multipliers.",
    href: "#/pricing-config",
    status: "working",
    icon: DollarSign,
  },
  {
    title: "Promos",
    description: "Promo codes, loyalty rewards, and referral program rules.",
    href: "#/promos",
    status: "working",
    icon: Tag,
  },
  {
    title: "Disputes",
    description: "Open and resolved customer/driver disputes with resolution workflow.",
    href: "#/disputes",
    status: "working",
    icon: AlertTriangle,
  },
  {
    title: "Add-on Pricing",
    description: "Special handling fees — delicates, comforters, rush, etc.",
    href: "#/add-ons",
    status: "working",
    icon: Sparkles,
  },
  {
    title: "Notification Rules",
    description: "Trigger conditions and templates for SMS/email/push notifications.",
    href: "#/notification-rules",
    status: "working",
    icon: Bell,
  },
  {
    title: "Service Area Requests (D4 Leads)",
    description: "Zip-code interest submissions and demand heat-map for expansion planning.",
    href: "#/service-area-requests",
    status: "working",
    icon: MapPin,
  },
  {
    title: "Voice Order Test (Sandbox)",
    description: "End-to-end voice ordering flow — sandbox environment only, not production.",
    href: "https://offloadusa.com/voice-order",
    status: "needs_review",
    icon: Mic,
    external: true,
    note: "Sandbox only — do not use against live Stripe",
  },
];

const MEDIA_ITEMS = [
  {
    title: "Loom 1 — Product Walkthrough",
    description: "Full end-to-end product demo recorded for internal review.",
    href: "https://loom.com",
    note: "⚠ NOT PRESS-READY — internal only",
    noteVariant: "secondary" as const,
    icon: Video,
  },
  {
    title: "Loom 2 — Investor Deck Walkthrough",
    description: "Narrated walkthrough of the investor deck and key metrics.",
    href: "https://loom.com",
    note: "🔒 PRIVATE — DO NOT SHARE",
    noteVariant: "destructive" as const,
    icon: Video,
  },
  {
    title: "Figma — Design System & Flows",
    description: "Official design file: components, user flows, and brand assets.",
    href: "https://figma.com",
    note: "Access required — request from design team",
    noteVariant: "outline" as const,
    icon: Figma,
  },
];

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

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1.5">
            <span>{cfg.emoji}</span>
            <span>{cfg.label}</span>
          </span>
        ))}
      </div>

      {/* QA Surface Cards */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Live Surfaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QA_ITEMS.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
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
        All external links open in a new tab. Sandbox surfaces are clearly marked.
      </p>
    </div>
  );
}
