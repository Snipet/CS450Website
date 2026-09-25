# CMSC450 AI Tools

Interactive, browser-only tools for CMSC450 (artificial intelligence): definitions and history
of AI, rational agents and task environments, search problems, and uninformed and informed
search. Later topics are added as the course goes on.

The site is a fully static [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5) app, prerendered
with `@sveltejs/adapter-static` and deployed to Cloudflare Pages through its GitHub integration.

## Tools

| Topic                         | Tool (route)                                | What it does                                                                                                                        |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Introduction                  | Approaches to AI (`/approaches`)            | The four definitions of AI, the Winograd schema questions, and a board that sorts AI applications into the approaches.              |
| Introduction                  | AI history (`/history`)                     | The eras of AI from 1943 to the present on one timeline, with the AI winters and dated events from the lecture.                     |
| Rational agents               | Vacuum-cleaner agent (`/vacuum`)            | Runs the reflex vacuum agent and other agent programs step by step, scores them, and compares their average scores.                 |
| Rational agents               | Task environments (`/environments`)         | Compares environments along the seven environment types, with PEAS descriptions and the matching course methods.                    |
| Solving problems by searching | State spaces (`/state-spaces`)              | The example problems as search problems: state spaces, successor functions, and a BFS or UCS grown from the start.                  |
| Solving problems by searching | Tree and graph search (`/search`)           | Runs BFS, DFS, DLS, IDS, UCS, greedy, A\*, and weighted A\* on a graph step by step, with the tree and the frontier.                |
| Solving problems by searching | Comparing search strategies (`/strategies`) | The properties table of the slides, BFS, DFS, IDS, UCS, greedy, A\*, and weighted A\* side by side on one problem, and node counts. |
| Informed search               | Heuristics (`/heuristics`)                  | Checks a heuristic against h\*(n), every edge for consistency, dominance and max, and the paths A\* returns with it.                |
| Informed search               | 8-puzzle (`/eight-puzzle`)                  | Slides tiles, computes h1 and h2, checks solvability, and solves any board with BFS, IDS, greedy, A\*, and weighted A\*.            |
| Informed search               | Path finding on a grid (`/grid`)            | Runs BFS, DFS, UCS, greedy, A\*, and weighted A\* on a grid with drawn walls, one expansion at a time or side by side.              |

Reference pages: notation and conventions (`/notation`), and lectures (`/lectures`), which lists
each deck with the tools that cite it and the slides they cite. Each tool is registered by a
file in `src/lib/tools/catalog/`.

## Development

```sh
npm install
npm run dev          # local dev server
npm run check        # svelte-check / TypeScript
npm run lint         # prettier --check + eslint
npm run format       # fix Prettier issues
npm test             # vitest unit tests
npm run build        # static build into ./build
npm run preview      # serve the production build locally
```

Node 22 or later (`.nvmrc`). Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing
code: it defines the notation, the engine API, the UI contracts, and the quality bar.

## Workflow and deployment

- Work happens on feature branches (`feat/…`, `fix/…`, `chore/…`, `docs/…`) and lands on `main`
  through pull requests (squash merge).
- CI (`.github/workflows/ci.yml`) runs lint, type-check, unit tests, and a production build on
  every pull request and on pushes to `main`.
- Cloudflare Pages is connected to this repository: every push runs `npm run build` and
  publishes `build/`. `main` goes to production; other branches get preview URLs, which
  Cloudflare posts on their pull requests. There are no deploy scripts. Setup and settings are
  in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Project layout

```
src/
  app.css                 design tokens (light/dark), base styles
  lib/
    site.ts               site metadata and navigation
    lectures.ts           lecture decks and citations
    url-state.ts          share-link state in the URL hash
    theory/               engine: search, graphs, 8-puzzle, grids, agents (pure TS + tests)
    components/           layout, UI kit, search visualizations
    tools/                tool registry, catalog, cross-tool links, tool-specific code
  routes/                 home, notation, lectures, one page per tool (all prerendered)
static/                   _headers (Cloudflare Pages response headers), robots.txt
docs/                     architecture and deployment notes
vite.config.ts            SvelteKit and Vitest configuration
```
