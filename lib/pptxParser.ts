import JSZip from 'jszip';

export interface ParsedSlide {
  slideNumber: number;
  title: string;
  text: string;
  wordCount: number;
  bullets: string[];
}

export interface ParsedPresentation {
  filename: string;
  slideCount: number;
  totalWords: number;
  slides: ParsedSlide[];
  rawText: string;
}

function cleanXmlText(xml: string): string {
  // Extract all text inside <a:t>...</a:t>
  const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
  const textPieces: string[] = [];
  for (const m of matches) {
    const text = m.replace(/<[^>]+>/g, '').trim();
    if (text) textPieces.push(text);
  }
  return textPieces.join(' ');
}

function extractParagraphs(xml: string): string[] {
  // Split on paragraph blocks <a:p>...</a:p>
  const paragraphs = xml.match(/<a:p[^>]*>([\s\S]*?)<\/a:p>/gi) || [];
  const result: string[] = [];

  for (const p of paragraphs) {
    const textPieces = p.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
    const joined = textPieces
      .map((t) => t.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (joined) {
      result.push(joined);
    }
  }

  return result;
}

/**
 * Parses a PowerPoint presentation (.pptx) buffer.
 */
export async function parsePptxBuffer(buffer: Buffer, filename = 'presentation.pptx'): Promise<ParsedPresentation> {
  const zip = await JSZip.loadAsync(buffer);

  // Find all slide files: ppt/slides/slideX.xml
  const slideFiles: { name: string; num: number }[] = [];
  const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/i;

  zip.forEach((relativePath) => {
    const match = relativePath.match(slideRegex);
    if (match) {
      slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
    }
  });

  // Sort slides in natural numerical order: slide1, slide2, slide3...
  slideFiles.sort((a, b) => a.num - b.num);

  const slides: ParsedSlide[] = [];
  let totalWords = 0;

  for (let i = 0; i < slideFiles.length; i++) {
    const file = slideFiles[i];
    const xml = await zip.file(file.name)?.async('string');
    if (!xml) continue;

    const paras = extractParagraphs(xml);
    const title = paras.length > 0 ? paras[0].slice(0, 100) : `Slide ${i + 1}`;
    const bodyParas = paras.length > 1 ? paras.slice(1) : paras;
    const slideText = paras.join('\n');
    const wordCount = slideText.split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    slides.push({
      slideNumber: i + 1,
      title: title || `Slide ${i + 1}`,
      text: slideText,
      wordCount,
      bullets: bodyParas,
    });
  }

  const rawText = slides.map((s) => `[Slide ${s.slideNumber}: ${s.title}]\n${s.text}`).join('\n\n');

  return {
    filename,
    slideCount: slides.length,
    totalWords,
    slides,
    rawText,
  };
}

/**
 * Fallback parser for plain text or markdown presentation outlines (e.g., Slide 1: ...)
 */
export function parseTextPresentation(content: string, filename = 'outline.txt'): ParsedPresentation {
  const lines = content.split('\n');
  const slideChunks: { title: string; lines: string[] }[] = [];
  let currentChunk: { title: string; lines: string[] } = { title: 'Slide 1', lines: [] };

  for (const line of lines) {
    const isSlideHeader = /^#{1,3}\s+(.+)$/i.test(line) || /^Slide\s+\d+[:\s-]*(.*)$/i.test(line) || /^---$/.test(line.trim());
    if (isSlideHeader) {
      if (currentChunk.lines.length > 0 || currentChunk.title) {
        slideChunks.push(currentChunk);
      }
      const titleMatch = line.match(/^#{1,3}\s+(.+)$/i) || line.match(/^Slide\s+\d+[:\s-]*(.*)$/i);
      currentChunk = {
        title: titleMatch ? titleMatch[1].trim() : `Slide ${slideChunks.length + 1}`,
        lines: [],
      };
    } else if (line.trim()) {
      currentChunk.lines.push(line.trim());
    }
  }
  if (currentChunk.lines.length > 0 || currentChunk.title) {
    slideChunks.push(currentChunk);
  }

  const slides: ParsedSlide[] = slideChunks.map((chunk, idx) => {
    const text = [chunk.title, ...chunk.lines].join('\n');
    return {
      slideNumber: idx + 1,
      title: chunk.title || `Slide ${idx + 1}`,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      bullets: chunk.lines,
    };
  });

  return {
    filename,
    slideCount: slides.length,
    totalWords: slides.reduce((acc, s) => acc + s.wordCount, 0),
    slides,
    rawText: content,
  };
}
