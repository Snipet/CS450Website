# Deployment: Cloudflare Pages with the GitHub integration

The site is static: `npm run build` writes plain HTML, CSS, and JS into `build/`. Cloudflare
Pages builds and hosts it straight from this GitHub repository, so there is no deploy script
and no Cloudflare token in the repo or in CI.

## How this differs from CS435

The CS435 site uses **Direct Upload**: `wrangler pages deploy` builds locally and uploads
`build/` to a Pages project configured by `wrangler.jsonc`. This site has no `wrangler`
dependency, no `wrangler.jsonc`, and no `deploy` scripts; Cloudflare clones the repo and runs
the build itself.

A Pages project created with Direct Upload cannot be switched to Git integration later. If a
Direct Upload project for this site already exists, create a new project connected to Git
(and move any custom domain to it).

## One-time setup

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize the Cloudflare GitHub app for this repository and select it.
3. Build settings:

   | Setting                | Value           |
   | ---------------------- | --------------- |
   | Production branch      | `main`          |
   | Framework preset       | None            |
   | Build command          | `npm run build` |
   | Build output directory | `build`         |
   | Root directory         | (leave empty)   |

   Do not pick the "SvelteKit" preset: it expects `@sveltejs/adapter-cloudflare` and a
   `.svelte-kit/cloudflare` output directory. This site uses `adapter-static`.

4. Node version: the build reads `.nvmrc` (Node 22). To pin it in the dashboard instead, add
   the environment variable `NODE_VERSION = 22` for Production and Preview.
5. Save and deploy. The first build publishes `https://<project>.pages.dev`.

Optional: under **Settings → Builds → Build watch paths**, exclude `docs/*` and `*.md` so
documentation-only commits do not trigger builds. Add a custom domain under
**Custom domains**.

## What happens on each push

- `main` → production deployment.
- Any other branch → preview deployment at `https://<branch>.<project>.pages.dev`; the
  Cloudflare app comments the URL on the branch's pull request. Preview branch rules are under
  **Settings → Builds → Branch control**.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, type-check, tests, and a build on pull
  requests independently of Cloudflare; require it in branch protection so broken builds do not
  reach `main`.

## Files Cloudflare uses from the build

- `build/404.html` — served with status 404 for unknown paths (rendered from
  `src/routes/+error.svelte`). Its presence also turns off Pages' single-page-app fallback.
- `build/_headers` (from `static/_headers`) — long-lived caching for hashed assets under
  `/_app/immutable/`, plus basic security headers.
- Pages are prerendered as `name.html`; Pages serves `/name` from `name.html` and redirects
  `/name.html` to `/name`, matching `trailingSlash = 'never'` in `src/routes/+layout.ts`.
