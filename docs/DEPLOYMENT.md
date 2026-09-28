# Deployment: Cloudflare Pages with the GitHub integration

The site is static: `npm run build` writes plain HTML, CSS, and JS into `build/`. Cloudflare
Pages builds and hosts it straight from this GitHub repository, so there is no deploy script
and no Cloudflare token in the repo or in CI.

## How this differs from CS435

The CS435 site uses **Direct Upload**: `wrangler pages deploy` builds locally and uploads
`build/` to a Pages project configured by `wrangler.jsonc`. This site has no `wrangler`
dependency, no `wrangler.jsonc`, and no `deploy` scripts; Cloudflare clones the repo and runs
the build itself.

A Pages project created with Direct Upload cannot be switched to the Git integration later (nor
the other way round). If a Direct Upload project for this site already exists, create a new
project connected to Git and move any custom domain to it.

## One-time setup

1. In the Cloudflare dashboard, open **Workers & Pages → Create application → Pages → Connect
   to Git** (labelled "Import an existing Git repository" in newer dashboards).
2. Authorize the Cloudflare GitHub app for this repository, select it, and **Begin
   setup**.
3. Build settings:

   | Setting                | Value           |
   | ---------------------- | --------------- |
   | Production branch      | `main`          |
   | Framework preset       | None            |
   | Build command          | `npm run build` |
   | Build output directory | `build`         |
   | Root directory         | (leave empty)   |

   Do not pick the "SvelteKit" preset: it expects `@sveltejs/adapter-cloudflare` and the
   `.svelte-kit/cloudflare` output directory. This site uses `adapter-static`.

4. Node version: the build image reads `.nvmrc` (Node 22). The v3 build image already defaults
   to Node 22; to pin a version in the dashboard instead, add the environment variable
   `NODE_VERSION` (e.g. `22`) for Production and Preview.
5. Save and deploy. The first build publishes `https://<project>.pages.dev`.

Optional: under **Settings → Builds → Build watch paths**, exclude `docs/*` and `*.md` so
documentation-only commits do not trigger builds. Add a custom domain under **Custom
domains**.

## What happens on each push

- `main` → production deployment.
- Any other branch → preview deployment with a per-commit URL and a branch alias,
  `https://<branch>.<project>.pages.dev`. The alias is lowercased with other characters
  replaced by `-` (`feat/grid` → `feat-grid.<project>.pages.dev`; long names are shortened).
  The Cloudflare app reports the build as a GitHub check and comments both URLs on the pull
  request (not for pull requests from forks). Which branches build is set under **Settings →
  Builds → Branch control**.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, type-check, tests, and a build on pull
  requests and on pushes to `main`, independently of Cloudflare. Require it in branch
  protection so broken builds do not reach `main`.

## Files Cloudflare uses from the build

- `build/404.html` — served with status 404 for any unknown path. It is SvelteKit's fallback
  page (`adapter({ fallback: '404.html' })` in `vite.config.ts`), which renders
  `src/routes/+error.svelte` in the browser. A top-level `404.html` also turns off Pages'
  single-page-app mode (without one, unknown paths would serve `index.html` with status 200).
- `build/_headers` (copied from `static/_headers`) — long-lived caching for hashed assets under
  `/_app/immutable/*`, plus basic security headers on every path. Pages allows at most 100
  rules in this file.
- Pages are prerendered as `name.html` (`trailingSlash = 'never'` in `src/routes/+layout.ts`).
  Pages serves `/name` from `name.html` and redirects `/name.html` to `/name`, so URLs have no
  extension and no trailing slash.

## Checking a build locally

`npm run build && npm run preview` serves the production build locally. `_headers` and the
404 handling above only take effect on Pages; check them on a preview deployment.
