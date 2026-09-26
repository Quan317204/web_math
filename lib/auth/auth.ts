import { getSession } from './session';
import type { UserRole } from './session';

export async function requireRole(role: UserRole) {
  const session = await getSession();

  if (!session || session.role !== role) {
    return null;
  }

  return session;
}