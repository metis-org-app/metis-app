# CLAUDE.md

Guidance for AI agents and developers working in this repository. Read it fully before changing code.
**Respecting the architecture below is mandatory** — when a request conflicts with it, point out the conflict instead of silently breaking a rule.

## Project

metis-app is the web app of **Metis Campus** for teachers and students. It is a Next.js front-end for
[`metis-api`](https://github.com/metis-org-app/metis-api), which owns all data and business rules.
The API contract and domain model live in `metis-api/docs/domain-model.md` (section "API contract"); this app
consumes that contract and never re-implements domain rules beyond input validation for good error messages.

The UI is in **Spanish (Chile)**. Code, comments and docs are in English.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict, `noUncheckedIndexedAccess`) · Tailwind CSS 4 ·
Radix primitives (`radix-ui`) · Zod 4 · lucide-react · Vitest + Testing Library · ESLint (next config) · Prettier.
Fonts are self-hosted with Fontsource (no requests to Google). Dependencies are pinned to exact versions.

## Commands

```bash
npm install            # npm 11 (see packageManager); npm 10 fails resolving vitest's optional peers
cp .env.example .env.local
npm run mock:api       # optional: in-memory stand-in for metis-api on :5151 (auth only)
npm run dev            # http://localhost:3000
npm run check          # typecheck + lint + tests + format check — must pass before every commit
npm run build          # production build
```

## Architecture

```
src/
├── app/                       Routes only: layouts, pages, route handlers. Thin; compose features.
│   ├── (auth)/                Guest pages: /ingresar, /registro (shared two-column layout)
│   ├── (app)/                 Signed-in pages inside AppShell: /inicio, /cursos, /evaluaciones, ...
│   ├── (preview)/             Signed-in pages without the shell: /evaluaciones/[id]/vista-previa (student view)
│   ├── api/[...path]/route.ts BFF proxy to metis-api (see "Talking to metis-api")
│   ├── salir/route.ts         Clears an expired session and redirects to sign-in
│   ├── unirse/[codigo]/       Public page where students join a course with its code (no account)
│   └── globals.css            Design tokens (@theme) and base styles
├── features/<feature>/        One folder per domain area (auth, workspaces, assessments, ...)
│   ├── index.ts               Public entry for client and server components (components, actions)
│   ├── server.ts              Server-only public entry (DAL, session helpers)
│   ├── api.ts                 Calls to metis-api + Zod schemas of the responses (server-only)
│   ├── actions.ts             Server actions ('use server') — mutations from forms
│   ├── schemas.ts             Zod input schemas and form state types (shared client/server)
│   ├── contract.ts            Optional: response schemas client components also validate (no server-only)
│   └── components/            Feature UI
├── components/
│   ├── ui/                    Design-system primitives (Button, Input, Field, Alert, ...). No feature logic.
│   ├── brand/                 Logo and brand mark
│   └── shell/                 AppShell, navigation (NAV_ITEMS), user menu
├── lib/                       Cross-cutting helpers: cn, env, safe-redirect, api/ (server client, problem details, proxy paths)
└── proxy.ts                   Next.js proxy: CSP nonce + optimistic auth redirects
```

Rules:

- Import a feature only through `@/features/<name>` or `@/features/<name>/server` (enforced by ESLint).
  Inside a feature, use relative imports.
- `components/ui` never imports from `features`. Features may import `components/ui` and `lib`.
- Server-only modules start with `import 'server-only'`. Never import them from a `'use client'` file.
- Pages are Server Components by default. Add `'use client'` only to the leaf that needs state, effects or
  browser APIs.

### Talking to metis-api

- **Server components and server actions** call metis-api with `apiRequest()` (`lib/api/server.ts`) through a
  feature's `api.ts`. Every response is validated with a Zod schema, so contract drift fails loudly at the edge.
- **Client components** call `/api/<path>` on this origin (e.g. `fetch('/api/workspaces')`). The route handler
  forwards to metis-api adding the session token. It only accepts plain path segments, blocks `/api/auth/*`, and
  rejects cross-origin unsafe methods (CSRF). They validate responses with Zod too: put the schemas in the feature's
  `contract.ts` (shared with `api.ts`). The assessment editor works this way (`features/assessments/client-api.ts`).
- **The /api proxy** streams request bodies to metis-api (never reads them) and propagates the browser's abort.
  `proxy.ts` must keep excluding `/api/*` from its matcher: where the Next.js proxy runs, it buffers the request body in
  memory and truncates it beyond `proxyClientMaxBodySize` (10 MB). The proxy waits 60 s for metis-api, except the
  routes in `SLOW_ROUTES` (`lib/api/upstream-path.ts`): `/api/assessments/generate` waits 150 s.
- **Autosave** (`features/assessments/use-autosave.ts`): debounced (~800 ms), never two saves of one value at once, a
  change made while saving is saved right after, failures keep the changes and offer "Reintentar", and nothing is
  sent while the value is incomplete on the client. Reuse it for any editor that saves as you type.
- Errors from metis-api are RFC 9457 Problem Details: use `parseProblem` / `fieldErrorsFrom` to map them to form
  errors. Map status codes to Spanish messages in the action; never show raw API messages that may be in English.
- `METIS_API_URL` is server-only. The browser never talks to metis-api directly and never sees the token.
- `APP_URL` (server-only, validated in `lib/env.ts`) is the public origin of this app. Links rendered on the server,
  like the `/unirse/<code>` link of a course, are built from it so they work from the first render.

### Authentication

- Sign-in/sign-up are server actions that call metis-api and store the access token in the **httpOnly**
  `metis_session` cookie (`SameSite=Lax`, `Secure` in production, expires with the token).
- `proxy.ts` does only an **optimistic** check (cookie present → allow, else redirect to `/ingresar?desde=…`).
- The real check is the DAL: every signed-in page calls `requireUser()` (`@/features/auth/server`), which
  validates the token with `GET /api/auth/me` (memoized per request). An invalid token redirects to `/salir`.
- Redirect targets from the query string go through `safeRedirect()` (no open redirects).

### Security headers

`proxy.ts` sets a strict CSP with a per-request nonce (`script-src 'nonce-…' 'strict-dynamic'`), which is why every
page renders dynamically (`connection()` in the root layout). Other headers live in `next.config.ts`.
Do not add third-party scripts, fonts or images from other origins without updating the CSP deliberately.

**Client IP forwarded to metis-api.** metis-api rate-limits its public endpoints (`/api/public/*`, used by
`/unirse`) per client IP, and every request reaches it from this server. So `apiRequest()` and the `/api/*` proxy send
`X-Forwarded-For` with the IP Next.js received: the incoming `x-forwarded-for` header, which Next.js fills with the
connection address when the request brings none (`lib/api/client-ip.ts`). metis-api trusts that header only from the
addresses in its `ForwardedHeaders:KnownProxies` (this server). **If Next.js is exposed directly, without a proxy in
front that overwrites `X-Forwarded-For`, a client can forge the header and choose its own rate-limit bucket. Review
this when the deployment is defined** (put a reverse proxy in front that sets the header, or read the address from the
platform's own trusted header).

## Design system

The brand comes from the public landing (`index.html`): cream, ink and gold; Fraunces for display and
Plus Jakarta Sans for UI. Tokens are defined once in `src/app/globals.css` (`@theme`) — use them, never raw hex.

| Token                  | Use                                                              |
| ---------------------- | ---------------------------------------------------------------- |
| `cream` / `cream-deep` | Page background / hover and subtle fills                         |
| `paper`                | Surfaces: forms, panels, lists                                   |
| `ink` / `ink-soft`     | Text, the sidebar / secondary text                               |
| `gold`                 | Brand fills and the offset shadow only — not for text (contrast) |
| `gold-ink`             | Gold-colored text and links (AA on cream and paper)              |
| `line`                 | Borders and dividers                                             |
| `danger`, `success`    | States                                                           |

Principles:

- **One signature:** the gold offset shadow (`shadow-offset`) is reserved for the primary action of a screen and
  the brand mark. Every other element stays quiet.
- **Destructive confirmations use `danger`, never the gold shadow.** The shadow marks constructive actions (create,
  publish, restore). Confirming an action that removes, archives, deletes or invalidates something (remove a
  student, archive, regenerate a join code, delete a question or a draft) uses the `danger` button variant:
  `<AlertDialogContent destructive …>`. The button that opens the confirmation stays `secondary` or `ghost`.
- `font-display` (Fraunces) only for page titles and brand moments; everything else is Plus Jakarta Sans.
- Sentence case everywhere. No all-caps labels, no eyebrow labels above headings, no decorative numbering
  (numbers only for real sequences).
- Copy: plain Chilean Spanish, tuteo, active verbs. Buttons say what happens ("Crear cuenta", "Publicar").
  Errors say what happened and how to fix it, without apologizing.
- Motion only in response to an action. `prefers-reduced-motion` is respected globally.
- Accessibility floor: labels wired with `Field`, visible focus, keyboard-operable controls, `role="alert"` for
  form errors, skip link, `aria-current` in navigation, responsive down to 360 px.

## Conventions

- Forms: `useActionState` + a server action returning `{ message?, fieldErrors?, values? }`; validate with the
  feature's Zod schema on the server; use `noValidate` and show server messages (consistent Spanish copy).
  Never echo passwords back.
- **Exception: operations that must be cancellable, stream files, or autosave** use `fetch` from a client component to
  the `/api/*` proxy instead of a server action (a server action cannot be aborted, receives the whole body at once, and
  re-renders the route on every call). Examples: the editor's autosave (step 3, `features/assessments/client-api.ts`)
  and the AI draft generator (step 4, `features/assessments/generator/request.ts`, `FormData` + `AbortController`).
  They validate responses with Zod (`contract.ts`) and map errors to Spanish messages like the actions do. Everything
  else, including saving the generated draft (`createAssessmentFromDraftAction`), stays a server action.
- Routes are typed (`typedRoutes`). User-facing URLs are in Spanish (`/ingresar`, `/inicio`, `/evaluaciones`).
- New signed-in sections: add the page under `app/(app)/`, call `requireUser()`, and add an entry to
  `components/shell/nav-items.ts`.
- Tests sit next to the code (`*.test.ts(x)`). Test schemas, helpers and interactive components; mock nothing
  you can run.

## Definition of done

1. `npm run check` passes (types, lint, tests, formatting) and `npm run build` succeeds.
2. The flow was exercised in the browser against metis-api (or `npm run mock:api` while the endpoint does not
   exist), including the error states, on desktop and at 390 px wide.
3. New calls to metis-api validate their response with Zod and follow the contract in `domain-model.md`. If the
   contract needs to change, change it in metis-api first.
4. If you used the mock, extend `scripts/mock-api.mjs` with the same contract.

## Things to never do

- Expose the access token to client code (no `localStorage`, no non-httpOnly cookies, no token in props).
- Call metis-api from the browser directly, or add `NEXT_PUBLIC_` variables with backend URLs or secrets.
- Put business rules (grading, help levels, state transitions) in the front; metis-api decides.
- Use raw colors or fonts outside the tokens, or the offset shadow on secondary elements.
- Bypass `safeRedirect()` for user-provided redirect targets.
