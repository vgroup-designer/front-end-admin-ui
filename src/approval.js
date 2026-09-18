const AUTHORIZED_ROLES = new Set(['admin', 'staff']);

/**
 * Gate for destructive/write actions: the caller's role must be admin or
 * staff (never shopper) AND the action must be explicitly confirmed. Returns
 * a verdict rather than throwing, so callers can turn a rejection into a
 * clean tool error instead of an uncaught exception.
 */
export function requireApproval({ role, confirmed }) {
  if (!AUTHORIZED_ROLES.has(role)) {
    return { allowed: false, reason: `Role "${role}" is not authorized to perform this action; must be "admin" or "staff".` };
  }
  if (confirmed !== true) {
    return { allowed: false, reason: 'Action requires explicit confirmation (confirmed: true).' };
  }
  return { allowed: true };
}
