const SERVICE_LABELS: Record<string, string> = {
  wash_fold: "Standard Wash",
  wash_fold_signature: "Signature Wash",
  dry_cleaning: "Dry Cleaning",
  comforters: "Comforters",
  mixed: "Mixed",
  alterations: "Alterations",
  commercial: "Commercial",
};

export function humanizeService(svc: string | null | undefined): string {
  if (!svc) return "—";
  return SERVICE_LABELS[svc] ?? svc.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
