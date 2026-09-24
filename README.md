# CMSC450 AI Tools

Interactive, browser-only tools for CMSC450 (artificial intelligence): rational agents and
task environments, search problems, uninformed and informed search, and later topics as the
course goes on.

The site is a fully static [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5) app, prerendered
with `@sveltejs/adapter-static` and deployed to Cloudflare Pages through its GitHub integration.

## Tools

| Topic                         | Tools                                                     |
| ----------------------------- | --------------------------------------------------------- |
| Introduction                  | Approaches to AI, AI history                              |
| Rational agents               | Vacuum agent, task environments (PEAS, environment types) |
| Solving problems by searching | State spaces, tree and graph search, comparing strategies |
| Informed search               | Heuristics, 8-puzzle, grid path finding                   |

Reference pages: notation and conventions, and a lecture index listing the tools and examples
that cite each deck.

## Development

```sh
npm install
npm run dev          # local dev server
npm run check        # svelte-check / TypeScript
npm run lint         # prettier + eslint
npm test             # vitest unit tests
npm run build        # static build into ./build
npm run preview      # serve the production build locally
```

Node 22 or later (`.nvmrc`).

## Deployment

Cloudflare Pages is connected to this repository: every push builds `npm run build` and
publishes `build/`. `main` goes to production; other branches get preview URLs. Setup and
settings are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Workflow

- Work happens on feature branches (`feat/…`, `fix/…`, `chore/…`) and lands on `main` through pull
  requests.
- CI (`.github/workflows/ci.yml`) runs lint, type-check, unit tests, and a production build on every
  PR.
- Cloudflare posts each branch's preview URL on its PR; `main` is deployed after merge.

## Project layout

```
src/
  app.css                 design tokens (light/dark), base styles
  lib/
    site.ts               site metadata and navigation
    lectures.ts           lecture decks and citations
    theory/               search engine, graphs, puzzles, agents (pure TS + tests)
    components/           layout, UI kit, search visualizations
    tools/                tool registry, catalog, tool-specific code
  routes/                 pages (all prerendered)
static/_headers           Cloudflare Pages response headers
docs/                     architecture and deployment notes
```
