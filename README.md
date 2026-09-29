# Contexta

**Your AI Opportunity Operating System.**

Contexta takes an opportunity — a hackathon, internship, grant, investor meeting — and runs a full
intelligence loop on it:

**Research → Evidence → Reasoning → Action → Verification**

- **Research** — live sources behind the opportunity are fetched and read (real pages, no mock data).
- **Evidence** — every finding quotes the exact sentence it came from, linked to its source.
- **Reasoning** — alignment, gaps, and next moves are explained, each with a "Why?" evidence trail.
- **Action** — Contexta proposes a concrete action (e.g. open a GitHub issue) and **waits for approval**.
- **Verification** — approved actions are executed, then re-verified at the source, with an integrity-hash receipt.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS 4
- Framer Motion–free micro-interactions (CSS transitions, 150–300ms)
- JSON file store (`.data/workflows`) — swap for Supabase/FastAPI later
- GitHub REST API for verified actions

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment

```bash
# Optional — enables real GitHub issue execution:
GITHUB_TOKEN=github_pat_...
```

Without a token, everything works except the final "Approve & execute" step, which explains
what it would do. Research and analysis are fully functional without any keys.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing — what Contexta is, the loop it runs |
| `/start` | Conversational 3-step opportunity setup |
| `/workspace/[id]` | The intelligence workspace (polls live state) |

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/workflows` | Create a workflow; research starts immediately |
| `GET /api/workflows` | List workflows |
| `GET /api/workflows/[id]` | Full workflow state |
| `POST /api/workflows/[id]/actions` | `propose` / `approve` / `reject` |
| `GET /api/capabilities` | Which external actions are configured |
