import { AuthError } from './errors.ts';
export type Role = 'mentee'|'mentor'|'admin'|'moderator';
export type Account = {id:string;email:string;role:Role;emailVerified:boolean;adultAccessApproved:boolean};
export function requirePermission(account: Account|null, permission:'account:read'|'users:manage'|'reports:review'|'mentoring:start') {
  if (!account) throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  if (permission === 'account:read') return;
  if (permission === 'users:manage' && account.role === 'admin') return;
  if (permission === 'reports:review' && ['admin','moderator'].includes(account.role)) return;
  // Private mentoring remains disabled, even for a self-declared adult or a mentor.
  throw new AuthError(403,'forbidden','Cette action n’est pas autorisée.');
}
