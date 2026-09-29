import { NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/pipeline';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const w = await getWorkflow(id);
  if (!w) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  return NextResponse.json(w);
}
