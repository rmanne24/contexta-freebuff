import { promises as fs } from 'fs';
import path from 'path';
import type { WorkflowState, WorkflowSnapshot } from './types';

/**
 * JSON-file-backed store. One file per workflow under .data/workflows.
 * Swap this module for Supabase/FastAPI persistence later without
 * touching the pipeline or the UI (same function signatures).
 */

const DATA_DIR = path.join(process.cwd(), '.data', 'workflows');

function safeId(): string {
  return `wf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function fileFor(id: string): string {
  const safe = id.replace(/[^a-z0-9_-]/gi, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function saveWorkflow(state: WorkflowState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(fileFor(state.id), JSON.stringify(state, null, 2), 'utf8');
}

export async function loadWorkflow(id: string): Promise<WorkflowState | null> {
  try {
    const raw = await fs.readFile(fileFor(id), 'utf8');
    return JSON.parse(raw) as WorkflowState;
  } catch {
    return null;
  }
}

export async function listWorkflows(): Promise<WorkflowSnapshot[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }
  const snapshots: WorkflowSnapshot[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf8');
      const w = JSON.parse(raw) as WorkflowState;
      snapshots.push({
        id: w.id,
        updatedAt: w.updatedAt,
        state: w.state,
        summary: null,
        sources: w.sources,
        evidence: w.evidence,
        alignment: w.alignment,
        gaps: w.gaps,
        recommendations: w.recommendations,
        action: w.action,
        approval: w.approval,
        execution: w.execution,
      });
    } catch {
      /* skip corrupt files */
    }
  }
  return snapshots.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function newId(): string {
  return safeId();
}
