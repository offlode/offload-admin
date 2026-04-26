// Production seed disabled. The admin panel must use the main Offload API/database, not local synthetic data.
export function seedDatabase(): void {
  throw new Error("Admin seedDatabase is disabled; use the production API instead.");
}
export function ensureSuperAdmin(): void {
  throw new Error("Admin ensureSuperAdmin is disabled; create admins in the main app database.");
}
