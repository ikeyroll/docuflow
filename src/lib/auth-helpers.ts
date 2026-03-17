import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Throws AuthError if the session user's role is not in the allowed list.
 * Call this at the top of every Server Action and API route.
 */
export function requireRole(
  session: Session | null,
  roles: string[]
): asserts session is Session {
  if (!session?.user) {
    throw new AuthError("Not authenticated");
  }
  if (!roles.includes(session.user.role)) {
    throw new AuthError("Insufficient permissions");
  }
}

/**
 * Returns the current session user or null.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Returns the current session or null.
 */
export async function getCurrentSession() {
  return auth();
}
