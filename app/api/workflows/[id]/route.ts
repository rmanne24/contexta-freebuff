import { NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/pipeline';
import { sessionFromRequest } from '@/lib/auth';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const w = await getWorkflow(id);
  if (!w) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

  const session = sessionFromRequest(_req);
  if (w.userId && (!session || session.id !== w.userId)) {
    // Signed-in data is private to its owner.
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }
  return NextResponse.json(w);
}
