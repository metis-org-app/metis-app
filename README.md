# metis-app

Web app of **Metis Campus**: teachers create assessments with AI, assign them to their classes, and students
answer with Metis, an assistant that guides them without giving away the answers.

Front-end in Next.js for [`metis-api`](https://github.com/metis-org-app/metis-api). Working on this repo (humans or
AI agents)? Read [`CLAUDE.md`](./CLAUDE.md).

## Run it locally

Requirements: Node 22.22.2+ (see `.nvmrc`; jsdom needs it) and npm 11.

```bash
npm install
cp .env.example .env.local      # METIS_API_URL, APP_URL and the COGNITO_* values of the development user pool
npm run mock:api                # optional (auth sync/me only); otherwise run metis-api
npm run dev                     # http://localhost:3000
```

## Scripts

| Script                        | What it does                                    |
| ----------------------------- | ----------------------------------------------- |
| `npm run dev`                 | Development server                              |
| `npm run build` / `npm start` | Production build and server                     |
| `npm run check`               | Typecheck, lint, tests and format check         |
| `npm test`                    | Unit and component tests (Vitest)               |
| `npm run mock:api`            | In-memory stand-in for metis-api (auth sync/me) |

## Status

| Area                                           | Status                                              |
| ---------------------------------------------- | --------------------------------------------------- |
| Sign-up, sign-in (Cognito email code), session | Done                                                |
| App shell, home                                | Done                                                |
| Classes and students                           | Done                                                |
| Assessments: editor with autosave, preview     | Done (publish, archive, duplicate; four item types) |
| AI assistant (draft from Metis)                | Done (topic and materials, review, create)          |
| Assignments, student flow with Metis, results  | Next                                                |

`index.html` and `avatar.png` are the original landing prototype, kept for reference.
