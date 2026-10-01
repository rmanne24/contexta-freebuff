import { NextResponse } from 'next/server';
import { sessionFromRequest, type SessionUser } from './auth';

/**
 * Shared server-side authorization helpers for API routes.
 *
 * The authenticated user is always derived from the signed session cookie —
 * never from anything the client sends. Every workflow route funnels through
 * these guards so ownership is checked uniformly.
 */

/** 401 response for missing/invalid sessions. */
export function unauthorized() {
  return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
}

/** 404 response used for resources that exist but belong to someone else. */
export function notFoundWorkflow() {
  return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
}

/**
 * Require a valid session. Returns the session user, or a 401 NextResponse
 * that the route should return immediately.
 */
export function requireSession(req: Request): { session: SessionUser; res: null } | { session: null; res: NextResponse } {
  const session = sessionFromRequest(req);
  if (!session) return { session: null, res: unauthorized() };
  return { session, res: null };
}

/**
 * Load a workflow and verify it belongs to the signed-in user.
 *
 * Returns the workflow, or the error response the route should return:
 *   - 404 when the workflow does not exist
 *   - 404 when it exists but is owned by someone else (existence is not disclosed)
 *   - 401 when there is no valid session
 */
export async function requireOwnedWorkflow(
  req: Request,
  id: string
): Promise<{ w: null; res: NextResponse } | { w: import('./types').WorkflowState; res: null }> {
  const auth = requireSession(req);
  if (!auth.session) return { w: null, res: auth.res };

  const { getWorkflow } = await import('./pipeline');
  const w = await getWorkflow(id);
  if (!w) return { w: null, res: notFoundWorkflow() };
  // Strict ownership: every workflow must have an owner, and it must be the caller.
  if (w.userId !== auth.session.id) return { w: null, res: notFoundWorkflow() };
  return { w, res: null };
}
