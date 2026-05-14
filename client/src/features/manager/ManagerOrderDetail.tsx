import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Phone,
  Droplets,
  Thermometer,
  Wind,
  Sparkles,
  RotateCw,
  ShieldCheck,
  Layers,
  FileText,
  ChevronRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  StatusPill,
  OrderTimeline,
  SectionHeader,
  CertifiedBadge,
  SkeletonCard,
} from "@/features/shared/components";
import type { OrderProgressKey, WashPreferences } from "@/features/shared/types";
import { ORDER_PROGRESS_STATES } from "@/features/shared/types";
import { Button } from "@/components/ui/button";

// ─── Types ───
interface BagItem {
  type: string;
  count: number;
  weight_lbs?: number;
}

interface OrderDetail {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_certified: boolean;
  customer_id: number;
  status: OrderProgressKey;
  display_status: string;
  bags: string;
  wash_preferences: WashPreferences | string | null;
  add_ons: string[] | string | null;
  special_instructions: string | null;
  separate_loads: SeparateLoad[] | string | null;
  created_at: string;
  scheduled_pickup: string | null;
  vendor_id: number | null;
  driver_id: number | null;
}

interface SeparateLoad {
  label: string;
  temperature: string;
}

// ─── Helpers ───
function parseBags(bagsJson: string): BagItem[] {
  try {
    return JSON.parse(bagsJson) as BagItem[];
  } catch {
    return [];
  }
}

function parseWashPreferences(prefs: WashPreferences | string | null): WashPreferences | null {
  if (!prefs) return null;
  if (typeof prefs === "string") {
    try {
      return JSON.parse(prefs);
    } catch {
      return null;
    }
  }
  return prefs;
}

function parseAddOns(addOns: string[] | string | null): string[] {
  if (!addOns) return [];
  if (typeof addOns === "string") {
    try {
      return JSON.parse(addOns);
    } catch {
      return [];
    }
  }
  return addOns;
}

function parseSeparateLoads(loads: SeparateLoad[] | string | null): SeparateLoad[] {
  if (!loads) return [];
  if (typeof loads === "string") {
    try {
      return JSON.parse(loads);
    } catch {
      return [];
    }
  }
  return loads;
}

function getNextStatus(current: OrderProgressKey): OrderProgressKey | null {
  const idx = ORDER_PROGRESS_STATES.findIndex((s) => s.key === current);
  if (idx < 0 || idx >= ORDER_PROGRESS_STATES.length - 1) return null;
  return ORDER_PROGRESS_STATES[idx + 1].key;
}

function getNextStatusLabel(current: OrderProgressKey): string | null {
  const next = getNextStatus(current);
  if (!next) return null;
  const state = ORDER_PROGRESS_STATES.find((s) => s.key === next);
  return state?.label ?? null;
}

export default function ManagerOrderDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const orderId = params.id;

  const { data: order, isLoading, isError } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", orderId],
    retry: false,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders/${orderId}`);
      return await res.json();
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status: nextStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status advanced." });
    },
    onError: () => {
      toast({ title: "Failed to advance status.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/manager/orders")}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Button>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Unable to load order — refresh to retry.</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/manager/orders")}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Button>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">No order found.</p>
        </div>
      </div>
    );
  }

  const o = order;
  const bags = parseBags(o.bags);
  const prefs = parseWashPreferences(o.wash_preferences);
  const addOns = parseAddOns(o.add_ons);
  const loads = parseSeparateLoads(o.separate_loads);
  const nextStatusKey = getNextStatus(o.status);
  const nextStatusLabel = getNextStatusLabel(o.status);

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      {/* ─── Back Nav ─── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/manager/orders")}
        className="gap-1 -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Button>

      {/* ─── Customer Card ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold">{o.customer_name}</h2>
              {o.customer_certified && <CertifiedBadge />}
            </div>
            <p className="text-sm text-muted-foreground">{o.order_number}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(o.created_at).toLocaleString()}
            </p>
          </div>
          {o.customer_phone && (
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${o.customer_phone}`}>
                <Phone className="w-4 h-4 mr-1" />
                Call
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* ─── Current Status + Action ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Status</p>
            <StatusPill status={o.status} label={o.display_status} />
          </div>
          {nextStatusKey && nextStatusLabel && (
            <Button
              size="sm"
              disabled={advanceMutation.isPending}
              onClick={() => advanceMutation.mutate(nextStatusKey)}
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              {advanceMutation.isPending ? "Advancing..." : `Mark ${nextStatusLabel}`}
            </Button>
          )}
        </div>
      </div>

      {/* ─── Timeline ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Order Timeline" />
        <OrderTimeline currentStatus={o.status} />
      </div>

      {/* ─── Bags Information ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Bags Information" />
        {bags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bag information available.</p>
        ) : (
          <div className="space-y-2">
            {bags.map((bag, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span>{bag.type}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>x{bag.count}</span>
                  {bag.weight_lbs !== undefined && <span>{bag.weight_lbs} lbs</span>}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm font-medium pt-2">
              <span>Total</span>
              <span>
                {bags.reduce((s, b) => s + b.count, 0)} bags
                {bags.some((b) => b.weight_lbs !== undefined) &&
                  ` / ${bags.reduce((s, b) => s + (b.weight_lbs ?? 0), 0).toFixed(1)} lbs`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Wash Preferences ─── */}
      {prefs && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Customer Wash Preferences" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-muted-foreground">Detergent:</span>
              <span className="font-medium">{prefs.detergent}</span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-muted-foreground">Water Temp:</span>
              <span className="font-medium">{prefs.water_temp}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-muted-foreground">Drying:</span>
              <span className="font-medium">{prefs.drying}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-muted-foreground">Stain Treatment:</span>
              <span className="font-medium">{prefs.stain_treatment ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-green-400" />
              <span className="text-muted-foreground">Extra Rinse:</span>
              <span className="font-medium">{prefs.extra_rinse ? "Yes" : "No"}</span>
            </div>
          </div>

          {/* Delicate Wash Flag */}
          {prefs.delicate_wash && (
            <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">Delicate Wash Required</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Separate Loads ─── */}
      {prefs?.separated && loads.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Separate Loads Required" />
          <div className="space-y-2">
            {loads.map((load, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <span className="font-medium">{load.label}</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>{load.temperature}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Add-ons ─── */}
      {addOns.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Add-ons" />
          <div className="flex flex-wrap gap-2">
            {addOns.map((addon, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {addon}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Special Instructions ─── */}
      {(o.special_instructions || prefs?.special_instructions) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Special Instructions" />
          <div className="flex items-start gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              {o.special_instructions}
              {o.special_instructions && prefs?.special_instructions && <br />}
              {prefs?.special_instructions}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
