import { NextResponse, after } from 'next/server';
import { proposeAction, approveAction, rejectAction, executeAction } from '@/lib/pipeline';
import { sessionFromRequest } from '@/lib/auth';
import { getWorkflow } from '@/lib/pipeline';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Ownership check: signed-in users act only on their own workflows.
  const w = await getWorkflow(id);
  if (!w) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  const session = sessionFromRequest(req);
  if (w.userId && (!session || session.id !== w.userId)) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

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
        // Execution runs in background; after() keeps Vercel Lambda alive until completion
        after(async () => {
          await executeAction(id).catch(() => undefined);
        });
        const w2 = await getWorkflow(id);
        return NextResponse.json(w2);
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

