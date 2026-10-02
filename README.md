````markdown
# Contexta

## Your AI Opportunity Operating System

Contexta takes an opportunity such as a hackathon, internship, grant, or investor meeting and runs a complete intelligence loop:

**Research → Evidence → Reasoning → Action → Verification**

Research fetches and reads live sources behind the opportunity.

Evidence connects every finding to the exact source and supporting quote.

Reasoning explains project alignment, gaps, and recommended next steps with an evidence trail.

Action proposes concrete actions such as creating a GitHub issue and waits for explicit user approval before execution.

Verification checks approved actions against the source again and generates an integrity hash receipt.

## Project Overview

Contexta is an AI powered opportunity intelligence platform designed to help builders understand opportunities and turn research into concrete actions.

Instead of simply generating a summary, Contexta connects opportunity research with the user's own project and produces:

1. Evidence backed opportunity requirements
2. Project to opportunity alignment
3. Identified gaps
4. Prioritized next steps
5. Action proposals
6. Human approved external actions
7. Post action verification

## Features

1. Live opportunity research from real web sources
2. Evidence backed findings with source links and exact quotes
3. Requirement and eligibility analysis
4. Project and opportunity alignment analysis
5. Gap identification and prioritization
6. Action plan generation
7. Human approval before external actions
8. GitHub action integration
9. Post action verification
10. Integrity hash receipts
11. Google authentication
12. Per user workspaces
13. Per user workflow history
14. Encrypted per user API key storage
15. Pitch deck review

## Intelligence Loop

### 1. Research

Contexta researches the opportunity using live sources rather than mock data.

### 2. Evidence

Findings are connected to their source and supported with exact quotes.

### 3. Reasoning

Contexta compares the opportunity with the user's project and explains alignment, gaps, and recommended next moves.

### 4. Action

Contexta proposes concrete actions and waits for explicit user approval before executing them.

### 5. Verification

After an approved action is executed, Contexta verifies the result against the relevant source and generates an integrity hash receipt.

## Project Presentation

Repository:

https://github.com/rmanne24/contexta-production

Demo Video:

https://youtu.be/sdVkVMy4YgU

Project Presentation:

https://drive.google.com/file/d/1nUvi-OuNXgOo02O-Rat9IrZYHQLYixco/view?usp=sharing

## Technology Stack

1. Next.js 16 with App Router
2. React
3. TypeScript
4. Tailwind CSS 4
5. Framer Motion
6. Upstash Redis
7. GitHub REST API
8. Google OAuth
9. Next.js API Routes

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/rmanne24/contexta-production.git
cd contexta-production
````

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Add the required environment variables to `.env.local`.

Never commit `.env.local` or any secret values to the repository.

### 4. Start the development server

```bash
npm run dev
```

### 5. Open the application

Open the following URL in your browser:

```text
http://localhost:3000
```

## Environment Variables

The application uses environment variables for authentication, application configuration, external services, and API credentials.

Required authentication variables include:

```text
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APP_URL=
```

For Google OAuth, configure the authorized redirect URI as:

```text
<APP_URL>/api/auth/google/callback
```

Additional variables may be required for external services such as Upstash Redis and GitHub actions.

Never add real credentials or API keys to the repository.

## Authentication and Personalization

1. Users can sign in with Google.
2. Authentication uses signed cookie based sessions.
3. Sessions persist across page refreshes.
4. Users can sign out from their account.
5. Private application routes require authentication.
6. Each user's workflows are isolated from other users.
7. New users receive their own personal workspace.
8. Users can connect their own external API keys through Settings.
9. API keys are encrypted at rest.
10. External actions require explicit user approval.

## Security and Privacy

1. Authentication is handled server side.
2. Private API routes validate the user's session.
3. Workflows are associated with the authenticated user.
4. Users cannot access another user's workflows.
5. Authentication cookies use secure settings in production.
6. User API keys are encrypted before being stored.
7. Secrets are never committed to the repository.
8. `.env*` files are excluded through `.gitignore`.
9. External actions require explicit user approval.

## GitHub Integration

Contexta can connect project information from GitHub and use GitHub as an execution target for approved actions.

Examples include:

1. Reviewing project repository information
2. Using repository evidence during opportunity analysis
3. Preparing GitHub issues based on identified next steps
4. Executing approved GitHub actions
5. Verifying completed actions

External actions are not executed without user approval.

## Application Routes

| Route             | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `/`               | Landing page and Contexta overview         |
| `/home`           | Personal workspace and opportunity history |
| `/start`          | Opportunity setup                          |
| `/workspace/[id]` | Intelligence workspace                     |
| `/settings`       | Account and API key settings               |

## API Routes

| Endpoint                           | Purpose                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `POST /api/workflows`              | Create a workflow and start research                                 |
| `GET /api/workflows`               | List the signed in user's workflows                                  |
| `GET /api/workflows/[id]`          | Retrieve a specific workflow                                         |
| `POST /api/workflows/[id]/actions` | Propose, approve, or reject actions                                  |
| `GET /api/capabilities`            | Check configured external actions                                    |
| `GET /api/me`                      | Retrieve the signed in user's profile and masked API key information |

## Development

Run the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Start the production build:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

## Repository Structure

```text
contexta-production/
├── app/
│   ├── api/
│   ├── home/
│   ├── start/
│   ├── settings/
│   ├── workspace/
│   └── ...
├── lib/
├── public/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

For production deployment:

1. Configure the required environment variables in the hosting platform.
2. Set `APP_URL` to the production application URL.
3. Configure the production Google OAuth redirect URI.
4. Configure the required Redis environment variables.
5. Store production secrets only in the hosting platform's environment settings.
6. Deploy the `main` branch.
7. Verify Google sign in.
8. Verify workflow creation and persistence.
9. Verify external actions and approval flows.

## Production OAuth Configuration

Configure the following in Google Cloud Console:

```text
Authorized JavaScript origin:
https://your-production-domain

Authorized redirect URI:
https://your-production-domain/api/auth/google/callback
```

The production origin and callback URL must match the application's `APP_URL` configuration.

## Project Goal

Contexta is designed to move beyond simple AI chat and research by connecting research, evidence, reasoning, execution, and verification into one workflow.

The goal is to help users go from:

**Opportunity → Understanding → Alignment → Action → Verified Result**

## License

This project is currently intended as a hackathon project.

```
```
