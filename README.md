# JSON-Driven Dynamic Form POC

This app lets you build forms from a custom FormSpec, compile them to JSON Schema + UI Schema, publish immutable snapshots, generate share links, render public forms, and collect submissions.

It now uses Prisma with PostgreSQL (Json columns) for storage.

The app:
- Accepts a JSON Schema + optional UI Schema
- Saves it as a Form
- Publishes an immutable snapshot (Publication)
- Generates share links
- Renders a public form at `/f/{token}` using @rjsf/core
- Stores submissions and shows them to the owner

> **Auth:** Skipped for POC. A demo user (`demo@owner.local`) is auto-created.

## Tech
- Next.js 14 (App Router), React 18, TypeScript
- Prisma + PostgreSQL
- @rjsf/core (react-jsonschema-form)
- Tailwind

## Setup

```bash
npm i   # or pnpm i
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open http://localhost:3000

## Notes
- Database uses Postgres with Prisma `Json` columns for compiled schemas and submissions.
- If you prefer SQLite, change the Prisma `datasource` provider to `sqlite`, convert `Json` fields to `String` (TEXT) and stringify/parse at the API boundaries.
- Do not commit real API keys to `.env`.


---

## Run in GitHub Codespaces / VS Code Dev Containers

This repo includes a **.devcontainer**. Two ways:

### A) GitHub Codespaces
1. Push this project to a new GitHub repo.
2. Click **Code → Create codespace on main**.
3. Wait for the container to build (it will run Prisma and install deps).
4. Run: `npm run dev` (if not already running).
5. Open the forwarded port **3000**.

### B) VS Code Dev Containers (locally, with Docker)
1. Install Docker and the VS Code **Dev Containers** extension.
2. `File → Open Folder...` and select the project.
3. When prompted, **Reopen in Container**.
4. Terminal → `npm run dev`.

**Notes:**
- The devcontainer uses Node 22 image and auto-runs `prisma generate` + `prisma migrate dev` on first create.
- Ensure `DATABASE_URL` points to a reachable Postgres instance.
