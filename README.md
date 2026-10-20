# metis-app

Web app of **Metis Campus**: teachers create assessments with AI, assign them to their classes, and students
answer with Metis, an assistant that guides them without giving away the answers.

Front-end in Next.js for [`metis-api`](https://github.com/metis-org-app/metis-api). Working on this repo (humans or
AI agents)? Read [`CLAUDE.md`](./CLAUDE.md).

## Run it locally

Requirements: Node 22.22.2+ (see `.nvmrc`; jsdom needs it) and npm 11.

```bash
npm install
cp .env.example .env.local      # METIS_API_URL=http://localhost:5151
npm run mock:api                # until metis-api implements auth; otherwise run metis-api
npm run dev                     # http://localhost:3000
```

## Scripts

| Script                        | What it does                                      |
| ----------------------------- | ------------------------------------------------- |
| `npm run dev`                 | Development server                                |
| `npm run build` / `npm start` | Production build and server                       |
| `npm run check`               | Typecheck, lint, tests and format check           |
| `npm test`                    | Unit and component tests (Vitest)                 |
| `npm run mock:api`            | In-memory stand-in for metis-api (auth endpoints) |

## Status

| Area                                          | Status                                            |
| --------------------------------------------- | ------------------------------------------------- |
| Sign-up, sign-in, sign-out, session           | Done (against the mock; pending metis-api step 1) |
| App shell, home                               | Done                                              |
| Classes and students                          | Next                                              |
| Assessments and AI assistant                  | Planned                                           |
| Assignments, student flow with Metis, results | Planned                                           |

`index.html` and `avatar.png` are the original landing prototype, kept for reference.
