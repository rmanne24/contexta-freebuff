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
}

export interface AlignmentFinding {
  id: string;
  level: AlignmentLevel;
  area: string;
  statement: string;
  evidenceIds: string[];
  why: string;
}

export interface GapFinding {
  id: string;
  severity: 'critical' | 'moderate';
  area: string;
  statement: string;
  evidenceIds: string[];
  why: string;
}

export interface Recommendation {
  id: string;
  index: number;
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
  'id' | 'updatedAt' | 'state' | 'sources' | 'evidence' | 'alignment' | 'gaps' | 'recommendations' | 'action' | 'approval' | 'execution'
> & { summary: string | null; presentation?: PresentationData };
