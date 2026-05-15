import { useQuery } from "@tanstack/react-query";

export interface PricingConfigRow {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedAt: string;
  updatedBy: number | null;
}

export interface AuditEntry {
  id: number;
  action: string;
  details: string;
  actorId: number | null;
  actorRole: string | null;
  timestamp: string;
}

export const CANONICAL_DEFAULTS: Record<string, { flatPrice: number; overageRate: number; maxWeight: number }> = {
  bag_small: { flatPrice: 24.99, overageRate: 2.50, maxWeight: 10 },
  bag_medium: { flatPrice: 44.99, overageRate: 2.50, maxWeight: 20 },
  bag_large: { flatPrice: 59.99, overageRate: 2.50, maxWeight: 30 },
  bag_xl: { flatPrice: 89.99, overageRate: 2.50, maxWeight: 50 },
  small_bag: { flatPrice: 24.99, overageRate: 2.50, maxWeight: 10 },
  medium_bag: { flatPrice: 44.99, overageRate: 2.50, maxWeight: 20 },
  large_bag: { flatPrice: 59.99, overageRate: 2.50, maxWeight: 30 },
  xl_bag: { flatPrice: 89.99, overageRate: 2.50, maxWeight: 50 },
};

export function formatKey(key: string): string {
  return key
    .replace(/^(bag_|multiplier_|delivery_fee_|loyalty_)/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function validatePrice(val: string, max = 10000): string | null {
  const n = parseFloat(val);
  if (val === "" || isNaN(n)) return "Price is required";
  if (n < 0) return "Price cannot be negative";
  if (n > max) return `Price too high (max ${max})`;
  return null;
}

export function usePricingConfig() {
  const { data: allConfig = [], isLoading } = useQuery<PricingConfigRow[]>({
    queryKey: ["/api/admin/pricing-config"],
  });

  const { data: auditLog = [] } = useQuery<AuditEntry[]>({
    queryKey: ["/api/admin/pricing-audit-log"],
  });

  const serviceTiers = allConfig.filter(c => c.category === "service_tiers");
  const deliveryFees = allConfig.filter(c => c.category === "delivery_fees");
  const taxConfig = allConfig.filter(c => c.category === "tax");
  const commissions = allConfig.filter(c => c.category === "commissions" || c.category === "logistics");
  const serviceMultipliers = allConfig.filter(c => c.category === "service_multipliers");
  const loyaltyConfig = allConfig.filter(c => c.category === "loyalty");

  return {
    allConfig,
    isLoading,
    auditLog,
    serviceTiers,
    deliveryFees,
    taxConfig,
    commissions,
    serviceMultipliers,
    loyaltyConfig,
  };
}
