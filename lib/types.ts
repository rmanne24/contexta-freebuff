export type OpportunityKind =
  | 'hackathon'
  | 'internship'
  | 'research'
  | 'competition'
  | 'grant'
  | 'job'
  | 'investor'
  | 'collaboration'
  | 'other';

export type AlignmentLevel = 'strong' | 'partial' | 'attention';

/** How strongly the source material backs a statement. */
export type VerificationStatus = 'verified' | 'inferred' | 'unverified';

/** What kind of fact an evidence item establishes. */
export type EvidenceType =
  | 'explicit_requirement'
  | 'explicit_benefit'
  | 'eligibility'
  | 'application_material'
  | 'deadline'
  | 'selection_criterion'
  | 'organizer_priority'
  /** Workshops, blog posts, marketing copy, event navigation — background only, never a requirement. */
  | 'organizer_content'
  | 'project_evidence'
  | 'inference'
  | 'unknown';

/** Source quality tiers shown in the UI. */
export type SourceQuality = 'official' | 'project' | 'third_party';

export interface ProjectProfile {
  name: string;
  description: string;
  problem?: string;
  audience?: string;
  stage?: string;
  repoUrl?: string;
}

export interface Opportunity {
  kind: OpportunityKind;
  title: string;
  url?: string;
  description: string;
  organization?: string;
  goal?: string;
}

export interface Source {
  id: string;
  index: number;
  title: string;
  domain: string;
  url: string;
  kind: 'official' | 'community' | 'news' | 'reference' | 'project';
  quality?: SourceQuality;
  why: string;
  excerpt: string;
  wordCount: number;
  retrieved: boolean;
  error?: string;
  fetchedAt: string;
}

export interface EvidenceItem {
  id: string;
  index: number;
  sourceId: string;
  sourceIndex: number;
  quote: string;
  claim: string;
  confidence: 'high' | 'medium' | 'low';
  /** What kind of fact the quote establishes (requirement, deadline, …). */
  type?: EvidenceType;
  /** Whether the quote itself states the fact or Contexta inferred it. */
  status?: VerificationStatus;
}

/** Evidence read from the user's own repository (code/docs), not the web. */
export interface ProjectEvidence {
  id: string;
  index: number;
  claim: string;
  repository: string;
  file: string;
  excerpt: string;
  whyItMatters: string;
}

export type RequirementCategory =
  | 'requirement'
  | 'eligibility'
  | 'benefit'
  | 'application_material'
  | 'selection_criterion'
  | 'deadline'
  | 'organizer_priority'
  /** Workshops, marketing, event navigation — background context, never a requirement. */
  | 'organizer_content';

/** A structured fact extracted from real evidence (never invented). */
export interface RequirementItem {
  id: string;
  category: RequirementCategory;
  /** Concise statement — a faithful compression of the supporting quote. */
  statement: string;
  evidenceIds: string[];
  /** verified = quote on an official source states it; unverified = could not determine. */
  status: VerificationStatus;
}

export interface OpportunityIntel {
  /** 2–3 sentence synthesis written from verified findings only. */
  summary: string;
  /** How much Contexta could actually verify, derived from retrieval quality. */
  researchConfidence: 'high' | 'medium' | 'low';
  items: RequirementItem[];
  /** Categories the sources did not answer — shown, never guessed. */
  unknowns: string[];
}

export interface AlignmentFinding {
  id: string;
  level: AlignmentLevel;
  area: string;
  statement: string;
  evidenceIds: string[];
  why: string;
  /** What the opportunity explicitly expects (from evidence, when available). */
  expects?: string;
  /** What the user's project demonstrates (or a clear “not found”). */
  projectShows?: string;
  /** How the two sides compare. */
  relationship?: 'aligned' | 'partially_aligned' | 'gap' | 'unknown';
  projectEvidenceIds?: string[];
}

export interface GapFinding {
  id: string;
  severity: 'critical' | 'moderate';
  area: string;
  statement: string;
  evidenceIds: string[];
  why: string;
  /** Precise missing item. */
  whatIsMissing?: string;
  /** Connection to the opportunity — or an explicit “strategic” framing. */
  whyItMatters?: string;
  /** True when the opportunity's own sources require this. */
  requiredByOpportunity?: boolean;
  /** Specific, concrete recommended action. */
  recommendedAction?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface Recommendation {
  id: string;
  index: number;
  /** Plan phase, e.g. “Verify eligibility” — used as the row label. */
  phase?: string;
  title: string;
  rationale: string;
  evidenceIds: string[];
  action: {
    kind: 'create_github_issue';
    repository?: string;
    title: string;
    body: string;
  } | null;
}

export interface WorkflowAction {
  id: string;
  recommendationId: string;
  kind: 'create_github_issue';
  repository: string;
  title: string;
  body: string;
}

export interface ExecutionStep {
  index: number;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
  detail?: string;
}

export interface ExecutionResult {
  verified: boolean;
  reference?: string;
  url?: string;
  integrityHash: string;
  timestamp: string;
  detail?: string;
  steps: ExecutionStep[];
}

export interface WorkflowState {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  state:
    | 'IDLE'
    | 'RESEARCHING'
    | 'RESEARCH_COMPLETE'
    | 'ANALYZING'
    | 'ANALYSIS_COMPLETE'
    | 'ACTION_PROPOSED'
    | 'AWAITING_APPROVAL'
    | 'EXECUTING'
    | 'VERIFYING'
    | 'VERIFIED'
    | 'FAILED'
    | 'REJECTED';
  project: ProjectProfile;
  opportunity: Opportunity;
  sources: Source[];
  evidence: EvidenceItem[];
  /** Structured opportunity requirements, extracted from evidence. */
  intel?: OpportunityIntel;
  /** Evidence read from the user's own repository. */
  projectEvidence?: ProjectEvidence[];
  alignment: AlignmentFinding[];
  gaps: GapFinding[];
  recommendations: Recommendation[];
  action: WorkflowAction | null;
  approval: 'pending' | 'approved' | 'rejected' | null;
  execution: ExecutionResult | null;
  error?: { phase: string; message: string };
  presentation?: PresentationData;
}

export interface PresentationMistake {
  id: string;
  slideNumber?: number;
  category: 'structure' | 'readability' | 'rubric' | 'evidence' | 'delivery';
  severity: 'critical' | 'warning' | 'tip';
  title: string;
  explanation: string;
  fix: string;
}

export interface SlideAnalysis {
  slideNumber: number;
  title: string;
  detectedType: 'title' | 'problem' | 'solution' | 'architecture' | 'demo' | 'market' | 'metrics' | 'team' | 'conclusion' | 'general';
  wordCount: number;
  status: 'good' | 'warning' | 'critical';
  feedback: string[];
}

export interface PresentationReview {
  filename: string;
  uploadedAt: string;
  slideCount: number;
  totalWords: number;
  avgWordsPerSlide: number;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'Needs Work';
  categoryScores: {
    structure: number;
    readability: number;
    rubricAlignment: number;
    evidenceAndDemo: number;
  };
  summary: string;
  criticalMistakes: PresentationMistake[];
  warnings: PresentationMistake[];
  strengths: string[];
  slideBreakdown: SlideAnalysis[];
  opportunityMatches: {
    matchedCriteria: string[];
    missingCriteria: string[];
  };
  /** True when verified opportunity criteria (a real rubric) were available to check against. */
  rubricAvailable?: boolean;
}

export interface PresentationData {
  filename: string;
  uploadedAt: string;
  slideCount: number;
  rawOutline?: string;
  review: PresentationReview;
}

export type WorkflowSnapshot = Pick<
  WorkflowState,
  | 'id'
  | 'updatedAt'
  | 'state'
  | 'sources'
  | 'evidence'
  | 'intel'
  | 'projectEvidence'
  | 'alignment'
  | 'gaps'
  | 'recommendations'
  | 'action'
  | 'approval'
  | 'execution'
> & { summary: string | null; presentation?: PresentationData };
