import { NextResponse } from 'next/server';
import { startWorkflow, runResearch } from '@/lib/pipeline';
import { listWorkflows } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      project?: { name?: string; description?: string; repoUrl?: string; audience?: string; stage?: string; problem?: string };
      opportunity?: { kind?: string; title?: string; url?: string; description?: string; organization?: string; goal?: string };
    };
    if (!body.project?.description && !body.project?.name) {
      return NextResponse.json({ error: 'Describe your project first.' }, { status: 400 });
    }
    if (!body.opportunity?.url && !body.opportunity?.description) {
      return NextResponse.json({ error: 'Provide an opportunity URL or description.' }, { status: 400 });
    }
    const w = await startWorkflow({
      project: {
        name: body.project.name || '',
        description: body.project.description || '',
        repoUrl: body.project.repoUrl,
        audience: body.project.audience,
        stage: body.project.stage,
        problem: body.project.problem,
      },
      opportunity: {
        kind: body.opportunity.kind,
        title: body.opportunity.title,
        url: body.opportunity.url,
        description: body.opportunity.description,
        organization: body.opportunity.organization,
        goal: body.opportunity.goal,
      },
    });
    // Fire-and-forget: research runs in-process while the UI polls state.
    void runResearch(w.id).catch(() => undefined);
    return NextResponse.json({ id: w.id, state: w.state }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not start the workflow.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const workflows = await listWorkflows();
  return NextResponse.json({ workflows });
}
