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

# Project Presentation

## 🎥 Demo Video
[Watch the project demo on YouTube](https://youtu.be/sdVkVMy4YgU)
## 📊 Project Presentation
[View the PowerPoint presentation on Google Drive](https://drive.google.com/file/d/1nUvi-OuNXgOo02O-Rat9IrZYHQLYixco/view?usp=sharing)




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
  Sessions persist across refreshes, expire after 30 days, and sign-out clears the cookie.
- **Sign-in required** — `/home`, `/start`, `/workspace/*`, and `/settings` redirect unauthenticated
  visitors to `/signin`; every private API route returns `401` without a valid session
  (enforced in both the Next.js proxy gate and each route handler — the frontend is never
  the security boundary).
- **Strict per-user isolation** — every workflow is stamped with the owner's user id derived
  from the signed session (never from the client). List, read, update, and delete operations
  only ever touch the caller's own workflows; someone else's workflow id returns `404`,
  exactly like a missing one.
- **First sign-in** — the Google account is provisioned automatically with an empty personal
  workspace ("Welcome to Contexta"). No demo or anonymous data is ever assigned to new users.
- **Legacy anonymous workflows** — rows created before accounts existed (no `userId`) are
  development-only artifacts: no signed-in user can list or read them.
- **API key vault** — users connect their own GitHub / OpenAI / Anthropic / Gemini / SerpAPI keys
  in Settings. Keys are encrypted at rest (AES-256-GCM, scrypt-derived from `AUTH_SECRET`),
  shown only masked in the UI, and decrypted server-side only when an approved action needs them.
  Approved GitHub actions run as *the user*, with the server token as fallback.

### Deploying auth (e.g. Netlify)

1. Set these environment variables in the Netlify site settings (never in code):
   `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_URL` set to the
   production origin (e.g. `https://your-site.netlify.app`).
2. In Google Cloud Console → Credentials, add the production authorized redirect URI:
   `https://your-site.netlify.app/api/auth/google/callback`, and the production origin as an
   authorized JavaScript origin.
3. Cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production automatically; the
   callback derives its redirect URI from `APP_URL` when set, so the origin must match the
   Google Console configuration exactly.
4. No secrets are committed to the repository; `.env*` files are gitignored.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing — what Contexta is, the loop it runs |
| `/home` | Personal workspace — welcome empty state + your opportunity history (sign-in required) |
| `/start` | Conversational 3-step opportunity setup (sign-in required) |
| `/workspace/[id]` | The intelligence workspace (polls live state; owner-only) |
| `/settings` | Account & per-user API key vault (sign-in required) |

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/workflows` | Create a workflow; research starts immediately |
| `GET /api/workflows` | List the signed-in user's own workflows |
| `GET /api/workflows/[id]` | Full workflow state (owner-only) |
| `POST /api/workflows/[id]/actions` | `propose` / `approve` / `reject` |
| `GET /api/capabilities` | Which external actions are configured |
| `GET /api/me` | Signed-in user profile + masked key previews |
