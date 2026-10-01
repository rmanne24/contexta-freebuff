import { NextResponse } from 'next/server';
import { requireOwnedWorkflow } from '@/lib/guard';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Ownership is verified against the signed session before anything is returned.
  const { w, res } = await requireOwnedWorkflow(req, id);
  if (!w) return res;
  return NextResponse.json(w);
}
