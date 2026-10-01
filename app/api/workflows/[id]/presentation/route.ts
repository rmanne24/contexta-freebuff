import { NextResponse } from 'next/server';
import { saveWorkflow } from '@/lib/store';
import { requireOwnedWorkflow } from '@/lib/guard';
import { parsePptxBuffer, parseTextPresentation } from '@/lib/pptxParser';
import { reviewPresentation } from '@/lib/deckReviewer';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Ownership check: only the owner can upload or replace a deck review.
  const owned = await requireOwnedWorkflow(req, id);
  if (!owned.w) return owned.res;
  const w = owned.w;

  try {
    const contentType = req.headers.get('content-type') || '';
    let parsedPresentation;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No presentation file was uploaded.' }, { status: 400 });
      }

      const filename = file.name || 'presentation.pptx';
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (filename.toLowerCase().endsWith('.pptx')) {
        parsedPresentation = await parsePptxBuffer(buffer, filename);
      } else {
        // Plain text / outline
        const text = buffer.toString('utf8');
        parsedPresentation = parseTextPresentation(text, filename);
      }
    } else {
      // JSON body with raw outline or text
      const body = (await req.json()) as { text?: string; filename?: string };
      if (!body.text || !body.text.trim()) {
        return NextResponse.json({ error: 'Presentation text or outline is empty.' }, { status: 400 });
      }
      parsedPresentation = parseTextPresentation(body.text, body.filename || 'presentation-outline.txt');
    }

    if (parsedPresentation.slides.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract any readable slides from the file. Please ensure it is a valid .pptx or text presentation.' },
        { status: 400 }
      );
    }

    // Run the in-depth review engine
    const review = reviewPresentation(
      parsedPresentation,
      w.opportunity,
      w.project,
      w.evidence,
      w.gaps,
      w.intel
    );

    w.presentation = {
      filename: parsedPresentation.filename,
      uploadedAt: new Date().toISOString(),
      slideCount: parsedPresentation.slideCount,
      rawOutline: parsedPresentation.rawText.slice(0, 15000),
      review,
    };
    w.updatedAt = new Date().toISOString();

    await saveWorkflow(w);

    return NextResponse.json({
      ok: true,
      presentation: w.presentation,
      workflow: w,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to analyze presentation.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Ownership check: only the owner can remove a deck review.
  const owned = await requireOwnedWorkflow(req, id);
  if (!owned.w) return owned.res;
  const w = owned.w;

  delete w.presentation;
  w.updatedAt = new Date().toISOString();
  await saveWorkflow(w);

  return NextResponse.json({ ok: true, workflow: w });
}
