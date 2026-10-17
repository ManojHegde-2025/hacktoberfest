# API Hallucination Firewall: Frontend

Next.js 14 (App Router) + TypeScript (strict) + Tailwind 3. No UI libraries.

## Run (demo mode, no backend needed)
```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_USE_MOCK=true
npm run dev                    # http://localhost:3000
```
Click an example button, then VERIFY CODE.

## Connect the real backend
1. Set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local`.
2. Implement `POST /api/verify` (see `FRONTEND_INTEGRATION.md`).
3. If field names differ, edit only `normalizeResponse()` in `src/lib/api.ts`.

## Merging into an existing repo
Copy `src/` contents and `FRONTEND_INTEGRATION.md`. Do not overwrite existing `package.json`, `tsconfig.json` or `app/layout.tsx`; just make sure Tailwind scans `src/**/*.{ts,tsx}`, `@/*` maps to `src/*`, and `globals.css` has the Tailwind directives.

## Checks
`npm run typecheck && npm run lint && npm run build`
