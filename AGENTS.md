# AGENTS.md

Instructions for AI coding agents (GitHub Copilot, Codex, Cursor, Claude, etc.) working in this repository.

**The full guide is [`CLAUDE.md`](./CLAUDE.md). Read it before making any change.**

## Non-negotiable rules (summary)

- Next.js 16 App Router + TypeScript strict. Server Components by default; `'use client'` only on leaves.
- metis-api owns data and business rules. This app follows the contract in `metis-api/docs/domain-model.md`.
- Authentication is Amazon Cognito's (one-time code by email, no passwords), driven from server actions. The
  Cognito access token lives only in the httpOnly `metis_session` cookie. Server code calls metis-api with
  `apiRequest()`; client code calls the `/api/*` BFF proxy on this origin. Never expose the tokens, the API URL or
  the Cognito settings, and never call metis-api or Cognito from the browser.
- Signed-in pages call `requireUser()`; `proxy.ts` only does optimistic redirects.
- Features are imported only through `@/features/<name>` or `@/features/<name>/server`.
- Use the design tokens in `src/app/globals.css`. The gold offset shadow is only for a screen's primary action.
- UI copy in Spanish (Chile), sentence case. Code and docs in English.
- `npm run check` and `npm run build` must pass.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
