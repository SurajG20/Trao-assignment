# Trao-assignment — AI Interview Prep Kit

> **Take-home assessment** · Trao · 2025  
> Flagship AI project: [GraphMind](https://github.com/SurajG20/ai-repo-workspace)

Turn a pasted job description and company URL into a personalised interview kit: company brief, role breakdown, categorised questions, flashcards, and a day-by-day study schedule. Users can edit any part, regenerate individual sections, practise flashcards, and export the kit as PDF.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB (Mongoose) |
| LLM | [Groq](https://console.groq.com) — default model `openai/gpt-oss-20b` (override with `GROQ_MODEL`) |
| Scraping | `undici` fetch + Cheerio, `robots-parser`, ranked same-origin crawl |

The assignment’s preferred stack is used as-is.

## Local setup

### Prerequisites

- Node.js 20+
- MongoDB running locally, or a MongoDB Atlas URI

### Backend

```bash
cd backend && npm install
cp ../.env.example ../.env
# Set GROQ_API_KEY and SESSION_SECRET in .env
npm run dev
```

API listens on **http://localhost:4000**.

### Frontend

```bash
cd frontend && npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. The frontend calls the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

### Tests and batch evaluate

From the repo root:

```bash
npm test
npm run evaluate -- --input cases.json --output kits.json
```

Tests clear `GROQ_API_KEY` so the HTTP suite does not call Groq. With a key set, evaluate runs the full pipeline.

### Batch input format

`cases.json` is an array of objects:

```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for ...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5
  }
]
```

Output matches Appendix B: `{ version, generated_at, kits: [{ id, status, kit, error }] }`. One case failing does not stop the rest.

For local fixture URLs, set `ALLOW_PRIVATE_URLS=true` in `.env`. In production (`NODE_ENV=production`), private and loopback addresses are rejected.

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Signs the httpOnly session cookie |
| `GROQ_API_KEY` | Groq API key from [console.groq.com/keys](https://console.groq.com/keys) |
| `GROQ_MODEL` | Model slug; default `openai/gpt-oss-20b` (250K TPM / 1K RPM) |
| `ALLOW_PRIVATE_URLS` | Allow `localhost` targets for evaluate fixtures |
| `PORT` | API port (default 4000) |
| `NEXT_PUBLIC_API_URL` | Frontend → API base URL |

## Architecture

```
frontend/          Next.js UI (auth, kits, builder, practice)
backend/
  src/routes/      Express HTTP (auth, kits, practice)
  src/pipeline/    Shared generation orchestrator + evaluate CLI
  src/retrieval/   Fetch, robots.txt, link ranking, public discussion search
  src/llm/         Groq client with 429 backoff and JSON repair
  src/schemas/     Zod validation for Appendix A kit shape
  src/models/      Mongoose persistence
```

Both `POST /api/kits` and `npm run evaluate` call the same `runPipeline()` function — no parallel implementation.

Generation runs asynchronously after create (HTTP 202). Progress is stored on the kit document and exposed via polling.

## Retrieval approach

1. **Job description** — pasted text only; never fetched from job boards.
2. **Company site** — fetch homepage, collect same-origin links, rank by hiring/about signals (not a fixed `/careers` list), fetch top pages with rate limiting (`p-limit`, 150ms delay between fetches).
3. **Page cleaning** — text from `main`/`article`, meta description, and JSON-LD; navigation chrome stripped.
4. **robots.txt** — checked per URL; disallowed paths are skipped and recorded in provenance.
5. **Public discussion** — DuckDuckGo HTML search for `"{company} interview process"`; snippets attached to hiring context when found.
6. **Failures** — unreachable, 404, thin, or robots-blocked pages are recorded in `provenance.failures` and do not abort the run.

Company pages are fetched with a browser-like User-Agent because many sites block named bots.

Untrusted page text and the pasted JD are wrapped in delimiters before being sent to the model so they are treated as data, not instructions.

## Generation sequence

| Step | What happens | LLM? |
|---|---|---|
| 1. Extract | Requirements, title, seniority from JD | Yes (heuristic fallback if no key) |
| 2. Retrieve | Crawl company site + discussion snippets | No |
| 3. Brief | Company summary from retrieved pages | Yes |
| 4. Questions | One call per category: technical, behavioural, system-design, company-fit | Yes |
| 5. Coverage | Code finds must-haves with no linked question; gap-fill generation | Yes (gap pass) |
| 6. Flashcards | Generated from requirements + questions | Yes |
| 7. Schedule | Allocate questions across N days | **No — code only** |

Hiring-page content changes which categories run (e.g. system-design only for senior roles or when hiring notes mention design rounds).

### Coverage passes

After the first question draft, `uncoveredMustHaveIds()` runs in code. If any must-have has no question referencing its id, a targeted gap-fill LLM call runs. We cap at **one gap-fill pass** (`passes` in the kit is typically 2: initial + one fill). If must-haves remain uncovered after that (often due to rate limits), they stay in `coverage.uncovered_requirement_ids` rather than inventing questions.

### Schedule allocation

`allocateSchedule()` in code:

- Clamps days to 1–60.
- Sorts questions by must-have coverage and difficulty (harder earlier).
- Distributes question ids across days; ensures every must-have has a covering question scheduled on day 1 if missing elsewhere.
- Each day gets integer `minutes` (20–180), a `focus` label, and `question_ids`.

## Builder state (`itemState`)

Each question and flashcard id maps to:

| State | Meaning |
|---|---|
| `generated` | Produced by the pipeline |
| `edited` | User changed prompt, outline, or category |
| `pinned` | User-added question (or explicitly pinned) |

Regenerating a question category **keeps** `edited` and `pinned` rows and replaces only `generated` ones. Regenerating the brief or schedule does not touch questions. Edits are debounced (~450ms) on the frontend before `PATCH /api/kits/:id`.

## Practice mode

- One flashcard at a time; flip to reveal the answer.
- Rate confidence 1–5 after revealing (keyboard: Space/Enter to flip, 1–5 to rate).
- Next session order: unseen cards first, then lowest confidence — a simple confidence-weighted sort, not full spaced repetition.

## Creative feature: Export PDF

**Export PDF** on the kit page opens a print-ready document (brief, role, requirements, questions, flashcards, schedule) and triggers the browser print dialog so the user can save as PDF. Useful for offline revision without extra dependencies.

## Key design decisions

- **Same pipeline for API and evaluate** — batch grading uses identical code paths.
- **Deterministic schedule and coverage** — the model does not decide day allocation or gap detection.
- **Idempotent kits** — duplicate `(jd, company_url, days)` returns the existing kit for that user.
- **Honest thin kits** — missing company pages or thin JDs produce empty briefs and few requirements instead of fabrication.
- **Groq rate limits** — sequential LLM calls with 600ms gaps and exponential backoff on 429.

## Known limitations

- Groq rate limits can still throttle under heavy load; large JDs may leave coverage gaps.
- Public discussion search depends on DuckDuckGo HTML results and may return nothing.
- PDF export uses the browser print dialog, not a server-generated file.
- Deployment is not documented here yet; production requires `ALLOW_PRIVATE_URLS=false` and a hosted MongoDB URI.

## Deployment

_To be added: public frontend and API URLs._
