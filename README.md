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
# Session signing + key-vault encryption (required for sign-in):
AUTH_SECRET=<openssl rand -base64 32>

# Google sign-in (https://console.cloud.google.com/apis/credentials):
#   Authorized redirect URI: <origin>/api/auth/google/callback
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional fallback for GitHub execution (each user can connect their own in Settings):
GITHUB_TOKEN=github_pat_...
```

Copy `.env.example` to `.env.local` and fill in what you need.

## Auth & personalization

- **Sign in with Google** — stateless signed-cookie sessions (HMAC-SHA256, no auth dependency).
- **Per-user workspaces** — every research trail is owned by the signed-in user; anonymous
  workflows created before signing in are adopted on first sign-in.
- **API key vault** — users connect their own GitHub / OpenAI / Anthropic / Gemini / SerpAPI keys
  in Settings. Keys are encrypted at rest (AES-256-GCM, scrypt-derived from `AUTH_SECRET`),
  shown only masked in the UI, and decrypted server-side only when an approved action needs them.
  Approved GitHub actions run as *the user*, with the server token as fallback.

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
