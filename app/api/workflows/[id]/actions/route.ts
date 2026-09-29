import { NextResponse } from 'next/server';
import { proposeAction, approveAction, rejectAction, executeAction } from '@/lib/pipeline';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { op?: string; recommendationId?: string };

    switch (body.op) {
      case 'propose': {
        if (!body.recommendationId) {
          return NextResponse.json({ error: 'recommendationId is required.' }, { status: 400 });
        }
        const w = await proposeAction(id, body.recommendationId);
        return NextResponse.json(w);
      }
      case 'approve': {
        await approveAction(id);
        // Execution runs asynchronously; the UI polls /api/workflows/[id].
        void executeAction(id).catch(() => undefined);
        const w = await getWorkflow2(id);
        return NextResponse.json(w);
      }
      case 'reject': {
        const w = await rejectAction(id);
        return NextResponse.json(w);
      }
      default:
        return NextResponse.json({ error: 'Unknown op. Use propose | approve | reject.' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Action failed.' },
      { status: 400 }
    );
  }
}

async function getWorkflow2(id: string) {
  const { getWorkflow } = await import('@/lib/pipeline');
  return getWorkflow(id);
}
