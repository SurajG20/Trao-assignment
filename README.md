# Trao-assignment

AI Interview Prep Kit — backend first (Express + TypeScript + MongoDB, OpenRouter).

## Install and run

```bash
cd backend && npm install
cp ../.env.example ../.env
# fill OPENROUTER_API_KEY and SESSION_SECRET in .env
npm run dev
```

Frontend (second terminal):

```bash
cd frontend && npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The API must already be running on port 4000.

From the repo root:

```bash
npm test
npm run evaluate -- --input cases.json --output kits.json
```
