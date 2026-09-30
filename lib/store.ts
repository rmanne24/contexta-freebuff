import { promises as fs } from 'fs';
import path from 'path';
import type { WorkflowState, WorkflowSnapshot } from './types';

/**
 * JSON-file-backed store. One file per workflow under .data/workflows.
 * Workflows may be owned by a user (userId) or anonymous (userId undefined)
 * so a visitor can run one research before signing in; on sign-in those
 * are adopted. Swap this module for Supabase/FastAPI persistence later
 * without touching the pipeline or the UI (same function signatures).
 */

import { getRedis } from './redis';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', '.data', 'workflows')
  : path.join(process.cwd(), '.data', 'workflows');

function safeId(): string {
  return `wf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function fileFor(id: string): string {
  const safe = id.replace(/[^a-z0-9_-]/gi, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function saveWorkflow(state: WorkflowState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`wf:${state.id}`, state);
      await redis.sadd('wf:all', state.id);
      if (state.userId) {
        await redis.sadd(`wf:user:${state.userId}`, state.id);
      } else {
        await redis.sadd('wf:anon', state.id);
      }
      return;
    } catch (e) {
      console.error('Redis saveWorkflow error:', e);
    }
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileFor(state.id), JSON.stringify(state, null, 2), 'utf8');
}

export async function loadWorkflow(id: string): Promise<WorkflowState | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const data = await redis.get<WorkflowState>(`wf:${id}`);
      return data || null;
    } catch (e) {
      console.error('Redis loadWorkflow error:', e);
    }
  }

  try {
    const raw = await fs.readFile(fileFor(id), 'utf8');
    return JSON.parse(raw) as WorkflowState;
  } catch {
    return null;
  }
}

async function readAll(): Promise<WorkflowState[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }
  const out: WorkflowState[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf8');
      out.push(JSON.parse(raw) as WorkflowState);
    } catch {
      /* skip corrupt files */
    }
  }
  return out;
}

function snapshot(w: WorkflowState): WorkflowSnapshot {
  return {
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
  };
}

/** Workflows owned by a user (newest first). */
export async function listWorkflows(userId: string): Promise<WorkflowSnapshot[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const ids = await redis.smembers(`wf:user:${userId}`);
      if (!ids || ids.length === 0) return [];
      const list: WorkflowState[] = [];
      for (const id of ids) {
        const item = await redis.get<WorkflowState>(`wf:${id}`);
        if (item) list.push(item);
      }
      return list
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(snapshot);
    } catch (e) {
      console.error('Redis listWorkflows error:', e);
    }
  }

  const all = await readAll();
  return all
    .filter((w) => w.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(snapshot);
}

/** Anonymous (pre-sign-in) workflows, newest first. */
export async function listAnonymousWorkflows(): Promise<WorkflowSnapshot[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const ids = await redis.smembers('wf:anon');
      if (!ids || ids.length === 0) return [];
      const list: WorkflowState[] = [];
      for (const id of ids) {
        const item = await redis.get<WorkflowState>(`wf:${id}`);
        if (item) list.push(item);
      }
      return list
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(snapshot);
    } catch (e) {
      console.error('Redis listAnonymousWorkflows error:', e);
    }
  }

  const all = await readAll();
  return all
    .filter((w) => !w.userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(snapshot);
}

/** On first sign-in, claim the anonymous workflows created in this browser session window. */
export async function adoptAnonymousWorkflows(userId: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const anonIds = await redis.smembers('wf:anon');
      let adopted = 0;
      for (const id of anonIds) {
        const item = await redis.get<WorkflowState>(`wf:${id}`);
        if (item) {
          item.userId = userId;
          await redis.set(`wf:${id}`, item);
          await redis.sadd(`wf:user:${userId}`, id);
          await redis.srem('wf:anon', id);
          adopted++;
        }
      }
      return adopted;
    } catch (e) {
      console.error('Redis adoptAnonymousWorkflows error:', e);
    }
  }

  const all = await readAll();
  const cutoff = Date.now() - 1000 * 60 * 60 * 24; // last 24h
  let adopted = 0;
  for (const w of all) {
    if (w.userId) continue;
    if (new Date(w.createdAt).getTime() < cutoff) continue;
    w.userId = userId;
    await saveWorkflow(w);
    adopted++;
  }
  return adopted;
}

export function newId(): string {
  return safeId();
}
