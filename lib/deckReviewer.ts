import type {
  EvidenceItem,
  GapFinding,
  Opportunity,
  PresentationMistake,
  PresentationReview,
  ProjectProfile,
  SlideAnalysis,
} from './types';
import type { ParsedPresentation, ParsedSlide } from './pptxParser';

function detectSlideType(
  slide: ParsedSlide,
  index: number,
  total: number
): SlideAnalysis['detectedType'] {
  const combined = `${slide.title} ${slide.text}`.toLowerCase();

  if (index === 0) return 'title';
  if (index === total - 1 && (/thank|contact|qa|questions|conclusion|next step|roadmap|ask/i.test(combined))) {
    return 'conclusion';
  }

  if (/\b(problem|pain point|challenge|why now|current struggle|the gap)\b/i.test(combined)) {
    return 'problem';
  }
  if (/\b(solution|introducing|our product|what we built|how it works|overview)\b/i.test(combined)) {
    return 'solution';
  }
  if (/\b(architecture|tech stack|system design|data flow|pipeline|infrastructure|engineering)\b/i.test(combined)) {
    return 'architecture';
  }
  if (/\b(demo|prototype|live demonstration|walkthrough|screenshot|interface|ui)\b/i.test(combined)) {
    return 'demo';
  }
  if (/\b(market|target audience|user persona|customer|tam|sam|som|industry)\b/i.test(combined)) {
    return 'market';
  }
  if (/\b(metric|result|benchmark|evaluation|accuracy|performance|traction|growth|kpi)\b/i.test(combined)) {
    return 'metrics';
  }
  if (/\b(team|founder|advisors|contributors|about us)\b/i.test(combined)) {
    return 'team';
  }
  if (/\b(roadmap|milestone|next step|the ask|future work|conclusion)\b/i.test(combined)) {
    return 'conclusion';
  }

  return 'general';
}

export function reviewPresentation(
  parsed: ParsedPresentation,
  opportunity: Opportunity,
  project: ProjectProfile,
  evidence: EvidenceItem[] = [],
  gaps: GapFinding[] = []
): PresentationReview {
  const { slides, filename, totalWords, slideCount } = parsed;
  const avgWordsPerSlide = slideCount > 0 ? Math.round(totalWords / slideCount) : 0;
  const fullDeckText = parsed.rawText.toLowerCase();

  const criticalMistakes: PresentationMistake[] = [];
  const warnings: PresentationMistake[] = [];
  const strengths: string[] = [];

  // 1. Analyze each slide individually
  const slideBreakdown: SlideAnalysis[] = slides.map((s, idx) => {
    const type = detectSlideType(s, idx, slideCount);
    const feedback: string[] = [];
    let status: SlideAnalysis['status'] = 'good';

    // Word count / cognitive load checks
    if (s.wordCount > 85) {
      status = 'warning';
      feedback.push(
        `High cognitive load (${s.wordCount} words). Audiences read slides instead of listening to the presenter.`
      );
      warnings.push({
        id: `warn_wordcount_${s.slideNumber}`,
        slideNumber: s.slideNumber,
        category: 'readability',
        severity: 'warning',
        title: `Slide ${s.slideNumber} has too much text (${s.wordCount} words)`,
        explanation: 'Slides packed with dense paragraphs cause cognitive overload. Judges cannot read and listen simultaneously.',
        fix: 'Cut body paragraphs down to 3–5 punchy bullet points (max 6–8 words per bullet). Move the rest to speaker notes.',
      });
    } else if (s.wordCount < 4 && idx !== 0 && type !== 'conclusion') {
      status = 'warning';
      feedback.push('Slide is nearly empty or missing descriptive takeaway.');
    }

    // Bullet point overload
    if (s.bullets.length > 6) {
      status = 'warning';
      feedback.push(`Contains ${s.bullets.length} bullet points. Consider splitting or grouping into 3 core takeaways.`);
    }

    if (feedback.length === 0) {
      feedback.push(`Effective ${type} slide with clean density.`);
    }

    return {
      slideNumber: s.slideNumber,
      title: s.title,
      detectedType: type,
      wordCount: s.wordCount,
      status,
      feedback,
    };
  });

  // 2. Structural Checks across the whole deck
  const detectedTypes = new Set(slideBreakdown.map((s) => s.detectedType));

  // Check: Problem
  const hasProblem = detectedTypes.has('problem') || /\b(problem|pain|frustration|struggle|challenge)\b/i.test(fullDeckText);
  if (!hasProblem) {
    criticalMistakes.push({
      id: 'crit_no_problem',
      category: 'structure',
      severity: 'critical',
      title: 'Missing Clear Problem Statement',
      explanation: 'No slide explicitly frames the specific user problem being solved. Reviewers may assume this is a technology looking for a problem.',
      fix: 'Add a dedicated slide near the beginning (Slide 2 or 3) stating: 1) Who suffers, 2) The exact friction/pain, 3) Why current solutions fail.',
    });
  } else {
    strengths.push('Identifies a clear problem statement early in the narrative.');
  }

  // Check: Demo / Proof of Work
  const hasDemo =
    detectedTypes.has('demo') ||
    /\b(demo|prototype|live link|github\.com|screens|walkthrough|deployed|try it)\b/i.test(fullDeckText);
  if (!hasDemo) {
    criticalMistakes.push({
      id: 'crit_no_demo',
      category: 'evidence',
      severity: 'critical',
      title: 'No Working Demo or Proof-of-Concept Mentioned',
      explanation: 'In technical hackathons and opportunity reviews, claims without proof receive significantly lower scores.',
      fix: 'Include a slide with a live product screenshot, GIF, or QR code / clickable demo link (e.g. deployed app or GitHub repository).',
    });
  } else {
    strengths.push('Demonstrates tangible proof-of-work / demo in the presentation.');
  }

  // Check: Technical Depth / Architecture
  const hasArchitecture =
    detectedTypes.has('architecture') ||
    /\b(architecture|tech stack|pipeline|agent|api|database|model|workflow)\b/i.test(fullDeckText);
  if (!hasArchitecture) {
    warnings.push({
      id: 'warn_no_architecture',
      category: 'structure',
      severity: 'warning',
      title: 'Missing Technical Architecture Overview',
      explanation: 'Evaluators want to see how the system works under the hood to assess technical feasibility and craftsmanship.',
      fix: 'Add a high-level system architecture diagram or pipeline flow showing inputs, agentic/processing stages, and outputs.',
    });
  } else {
    strengths.push('Covers technical architecture and system design.');
  }

  // Check: Metrics / Evaluation / Traction
  const hasMetrics =
    detectedTypes.has('metrics') ||
    /\b(metric|accuracy|benchmark|results|seconds|latency|users|tested on|evaluation)\b/i.test(fullDeckText);
  if (!hasMetrics) {
    warnings.push({
      id: 'warn_no_metrics',
      category: 'evidence',
      severity: 'warning',
      title: 'No Measured Results or Evaluation Benchmarks',
      explanation: 'Unmeasured claims like "fast", "accurate", or "seamless" carry little weight without numbers.',
      fix: 'Include at least 2 concrete metrics (e.g. latency, accuracy %, user test feedback, or benchmark comparisons).',
    });
  } else {
    strengths.push('Includes quantitative metrics or evaluation results.');
  }

  // Check: Conclusion / Call to Action
  const hasConclusion = detectedTypes.has('conclusion') || /\b(thank you|next step|future work|roadmap|contact)\b/i.test(fullDeckText);
  if (!hasConclusion) {
    warnings.push({
      id: 'warn_no_conclusion',
      category: 'structure',
      severity: 'warning',
      title: 'Presentation Ends Abruptly (No Next Steps / Ask)',
      explanation: 'Pitch decks should conclude with clear next milestones or a specific call to action.',
      fix: 'Add a closing slide outlining upcoming milestones, roadmap, and contact / demo links.',
    });
  }

  // Check: Deck Length
  if (slideCount > 15) {
    warnings.push({
      id: 'warn_too_long',
      category: 'delivery',
      severity: 'warning',
      title: `Deck is long for a pitch (${slideCount} slides)`,
      explanation: 'Most hackathon and competition presentations have a strict 3 to 5-minute limit (ideal is 6–10 slides).',
      fix: 'Condense into 8–10 core slides. Move supplementary details to an Appendix.',
    });
  } else if (slideCount > 0 && slideCount < 4) {
    warnings.push({
      id: 'warn_too_short',
      category: 'structure',
      severity: 'warning',
      title: `Deck is very brief (${slideCount} slides)`,
      explanation: 'A 3-slide deck often leaves critical questions unanswered regarding architecture, market, and evaluation.',
      fix: 'Expand to 6–8 slides covering Problem, Solution, Architecture, Demo, Evaluation, and Team/Roadmap.',
    });
  }

  // 3. Opportunity Rubric Alignment Checks
  const oppKeywords = [
    ...(opportunity.title || '').toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) || [],
    ...(opportunity.description || '').toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) || [],
    ...(opportunity.goal || '').toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) || [],
  ];

  // Specific high-value technical themes
  const rubricThemes = [
    { label: 'Autonomous Agents & Autonomy', terms: ['agent', 'autonomous', 'workflow', 'orchestrat'] },
    { label: 'Memory & State Persistence', terms: ['memory', 'persistent', 'state', 'qdrant', 'vector'] },
    { label: 'Evaluation & Benchmarks', terms: ['evaluation', 'benchmark', 'metric', 'accuracy', 'rubric'] },
    { label: 'Human Oversight / Approval', terms: ['human', 'approval', 'oversight', 'review', 'verify'] },
    { label: 'Open Source / Deployment', terms: ['deploy', 'open source', 'production', 'github', 'live'] },
    { label: 'Voice / Multimodal Interaction', terms: ['voice', 'speech', 'audio', 'hardware', 'omi'] },
  ];

  const matchedCriteria: string[] = [];
  const missingCriteria: string[] = [];

  for (const th of rubricThemes) {
    const oppMentions = th.terms.some((t) => oppKeywords.includes(t));
    if (!oppMentions) continue;

    const deckMentions = th.terms.some((t) => fullDeckText.includes(t));
    if (deckMentions) {
      matchedCriteria.push(th.label);
    } else {
      missingCriteria.push(th.label);
      criticalMistakes.push({
        id: `crit_rubric_${th.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        category: 'rubric',
        severity: 'critical',
        title: `Opportunity Rubric Mismatch: Missing "${th.label}"`,
        explanation: `The target opportunity explicitly emphasizes "${th.label}", but your presentation does not mention how your project addresses it.`,
        fix: `Add a bullet point or dedicated slide demonstrating how your project incorporates "${th.label}" to maximize judging points.`,
      });
    }
  }

  if (matchedCriteria.length > 0) {
    strengths.push(`Directly addresses opportunity requirements: ${matchedCriteria.join(', ')}.`);
  }

  // 4. Calculate Category and Overall Scores
  // Structure: 25 pts max
  let structureScore = 25;
  if (!hasProblem) structureScore -= 8;
  if (!detectedTypes.has('solution')) structureScore -= 6;
  if (!hasArchitecture) structureScore -= 4;
  if (!hasConclusion) structureScore -= 3;
  if (slideCount > 16 || slideCount < 4) structureScore -= 4;
  structureScore = Math.max(0, structureScore);

  // Readability: 25 pts max
  let readabilityScore = 25;
  const wordWarnings = slideBreakdown.filter((s) => s.wordCount > 85).length;
  readabilityScore -= Math.min(18, wordWarnings * 6);
  if (avgWordsPerSlide > 70) readabilityScore -= 4;
  readabilityScore = Math.max(0, readabilityScore);

  // Rubric Alignment: 25 pts max
  let rubricScore = 25;
  const totalRubricItems = matchedCriteria.length + missingCriteria.length;
  if (totalRubricItems > 0) {
    rubricScore = Math.round((matchedCriteria.length / totalRubricItems) * 25);
  }
  rubricScore = Math.max(5, rubricScore);

  // Evidence & Demo: 25 pts max
  let evidenceScore = 25;
  if (!hasDemo) evidenceScore -= 12;
  if (!hasMetrics) evidenceScore -= 8;
  if (gaps.length > 0 && gaps.some((g) => g.severity === 'critical')) evidenceScore -= 5;
  evidenceScore = Math.max(0, evidenceScore);

  const overallScore = structureScore + readabilityScore + rubricScore + evidenceScore;

  let grade: PresentationReview['grade'] = 'Needs Work';
  if (overallScore >= 88) grade = 'A';
  else if (overallScore >= 72) grade = 'B';
  else if (overallScore >= 55) grade = 'C';

  let summary = '';
  if (criticalMistakes.length === 0) {
    summary = `Strong presentation deck (${overallScore}/100, Grade ${grade}). Well-structured flow that hits key opportunity priorities.`;
  } else {
    summary = `Deck evaluated at ${overallScore}/100 (Grade ${grade}). Identified ${criticalMistakes.length} critical mistake${criticalMistakes.length === 1 ? '' : 's'} and ${warnings.length} warning${warnings.length === 1 ? '' : 's'} to address before pitching.`;
  }

  return {
    filename,
    uploadedAt: new Date().toISOString(),
    slideCount,
    totalWords,
    avgWordsPerSlide,
    overallScore,
    grade,
    categoryScores: {
      structure: structureScore,
      readability: readabilityScore,
      rubricAlignment: rubricScore,
      evidenceAndDemo: evidenceScore,
    },
    summary,
    criticalMistakes,
    warnings,
    strengths,
    slideBreakdown,
    opportunityMatches: {
      matchedCriteria,
      missingCriteria,
    },
  };
}
