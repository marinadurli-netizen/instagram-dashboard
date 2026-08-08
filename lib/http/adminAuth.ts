// Shared by every route that offers a browser-clickable GET fallback for
// manual testing (same stopgap as /api/instagram/connect and
// /api/cron/sync) — reuses ADMIN_SECRET rather than adding yet another env
// var, since it's the same "not the real auth gate, just enough to stop a
// random visitor" trust level.
export function isAdminAuthorized(secret: string | null): boolean {
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}
