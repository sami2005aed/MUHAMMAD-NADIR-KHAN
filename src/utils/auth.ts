import { User } from '../types.ts';

/**
 * Robustly checks if a user is Master Admin across environments.
 * Handles case sensitivity, trimming, and object structure.
 */
export function isMasterAdmin(user: User | null | undefined): boolean {
  if (!user || !user.role) return false;
  const roleStr = String(user.role).trim().toLowerCase();
  return roleStr === 'master_admin';
}

/**
 * Logs role detection for debugging on preview and published domains.
 */
export function logRoleDetection(contextName: string, user: User | null | undefined): boolean {
  const isMaster = isMasterAdmin(user);
  if (typeof window !== 'undefined') {
    console.log(`[Role Check: ${contextName}] User: "${user?.name || 'anonymous'}", Role: "${user?.role}", isMasterAdmin: ${isMaster}`);
  }
  return isMaster;
}
