# AGENTS.md

Instructions for AI coding agents (GitHub Copilot, Codex, Cursor, Claude, etc.) working in this repository.

**The full guide is [`CLAUDE.md`](./CLAUDE.md). Read it before making any change.**

## Non-negotiable rules (summary)

- Next.js 16 App Router + TypeScript strict. Server Components by default; `'use client'` only on leaves.
- metis-api owns data and business rules. This app follows the contract in `metis-api/docs/domain-model.md`.
- The access token lives only in the httpOnly `metis_session` cookie. Server code calls metis-api with
  `apiRequest()`; client code calls the `/api/*` BFF proxy on this origin. Never expose the token or the API URL.
- Signed-in pages call `requireUser()`; `proxy.ts` only does optimistic redirects.
- Features are imported only through `@/features/<name>` or `@/features/<name>/server`.
- Use the design tokens in `src/app/globals.css`. The gold offset shadow is only for a screen's primary action.
- UI copy in Spanish (Chile), sentence case. Code and docs in English.
- `npm run check` and `npm run build` must pass.
