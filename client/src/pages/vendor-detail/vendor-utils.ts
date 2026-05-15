// ── D7+D8 types ──
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = typeof DAYS[number];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
export interface DayHours { open: string; close: string; closed: boolean; }
export type OperatingHoursState = Record<DayKey, DayHours>;

export function defaultHours(): OperatingHoursState {
  return Object.fromEntries(
    DAYS.map(d => [d, { open: "08:00", close: "20:00", closed: false }])
  ) as OperatingHoursState;
}

export function parseOperatingHours(raw: unknown): OperatingHoursState {
  const base = defaultHours();
  if (!raw || typeof raw !== "string") return base;
  try {
    const parsed = JSON.parse(raw);
    for (const d of DAYS) {
      if (parsed[d]) {
        base[d] = {
          open: parsed[d].open ?? "08:00",
          close: parsed[d].close ?? "20:00",
          closed: !!parsed[d].closed,
        };
      }
    }
  } catch { /* use defaults */ }
  return base;
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function parseServiceZips(raw: unknown): string {
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      // not JSON, treat as-is
    }
    return raw;
  }
  return "";
}
