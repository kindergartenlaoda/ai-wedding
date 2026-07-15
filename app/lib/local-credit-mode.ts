export function isLocalAdminCreditBypass(userId: string): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true' && userId === 'local-admin';
}

export function normalizeLocalCreditAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}
