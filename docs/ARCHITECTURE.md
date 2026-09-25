# Architecture and conventions

This document is the contract every part of the site is built against. Read it
before adding a tool or touching the engine. Where it and the code disagree,
the code wins and this file is updated.

## 1. Principles

1. **Everything runs in the browser.** The site is prerendered static HTML plus
   client-side Svelte 5. No backend, no network calls, no analytics.
2. **Engine and UI are separate.** Algorithms and data live in
   `src/lib/theory/` as pure, framework-free TypeScript with unit tests. Svelte
   components only render and orchestrate; their non-trivial logic lives in
   pure `.ts` helpers next to them, also unit-tested.
3. **Lecture fidelity.** Terms, notation, example problems and their numbers
   follow the CMSC450 lecture decks exactly (see §3). Where the decks are
   silent we pick one documented default (§3.4) and apply it everywhere.
4. **Algorithms expose their steps.** Every search returns the final result
   _and_ a step trace, so any tool can play it forward and backward.
5. **Plain copy.** Pages say what a tool does and what the controls do. Copy
   never describes the site's teaching purpose or how it "helps" anyone. Avoid
   phrases like "helps you understand", "build intuition", "learn by
   exploring", "self-exploration", and labels like "common mistake" or
   "misconception". Questions from the slides may be posed as-is (answers go
   in a `Disclosure`).
6. **Accessible and responsive.** Keyboard reachable controls, visible focus,
   labels on inputs, `aria-live` for step announcements, no horizontal page
   scroll at 360 px, light and dark themes via tokens in `src/app.css`.

## 2. Layout of the code

```
src/
  app.css                     design tokens (light/dark), base element styles, hl-* classes
  app.html                    page shell; applies the saved theme before first paint
  lib/
    site.ts                   site name, nav links, pageTitle(), toolHref()
    lectures.ts               deck catalog, Citation, formatCitation()
    url-state.ts              share-link state in the URL hash (re-exports url-state.svelte.ts)
    assets/                   favicon.svg
    theory/                   pure TS engine (no Svelte, no DOM); *.spec.ts next to each module
      diagnostics.ts          Diagnostic, Span, hasErrors()
      search/                 SearchProblem, search(), frontiers, strategy properties (§4.1)
      graphs/                 weighted graphs, lecture graphs, text format, heuristic analysis, layout (§4.2)
      puzzle/                 8-puzzle boards, moves, h1/h2, solvability, scrambles (§4.3)
      grid/                   grid problems, URL encoding, edits, preset layouts (§4.4)
      agents/                 vacuum world, its state space, task environments (§4.5)
    components/
      layout/                 SiteHeader, SiteFooter, ThemeToggle, CourseMap
      ui/                     UI kit (§5.4) plus pure helpers: stepper.svelte.ts, tones.ts,
                              editor-lines.ts, diagnostic-summary.ts, types.ts
      search/                 StateGraph, SearchTree, FrontierView, StatusLegend (§5.3) plus pure
                              helpers: describe.ts, tree-view.ts, tree-layout.ts, tree-scene.ts,
                              graph-scene.ts, geometry.ts, legend.ts
    tools/
      types.ts                ToolMeta, Topic
      registry.ts             glob-imports catalog/*.ts: tools, topics, toolBySlug(), toolsForTopic()
      links.ts                cross-tool links (LinkStates, toolLink) (§5.2)
      lecture-index.ts        each deck with the tools citing it (lectures page)
      catalog/<slug>.ts       one file per tool: `export const tool: ToolMeta`
      <slug>/                 tool-specific components, presets and logic (table below)
  routes/
    +layout.ts                prerender = true, trailingSlash = 'never'
    +layout.svelte            skip link, header, main, footer
    +error.svelte             error page (build/404.html renders it)
    +page.svelte              home: course map and tools grouped by topic
    notation/                 notation reference: +page.svelte, notation.ts (page data computed
                              with the engine and describe.ts, tested) and glyph components
    lectures/+page.svelte     lecture decks with the tools that cite them
    <slug>/+page.svelte       one route per tool
static/                       _headers (Cloudflare Pages response headers), robots.txt
docs/                         ARCHITECTURE.md (this file), DEPLOYMENT.md
vite.config.ts                SvelteKit (adapter-static, prerender options) and Vitest config;
                              there is no svelte.config.js
.github/workflows/ci.yml      lint, check, test, build on pull requests and pushes to main
```

Tool folders (`src/lib/tools/<slug>/`, route `/<slug>`):

| Slug           | Tool                        | Folder contents besides components                                                                                                            |
| -------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `approaches`   | Approaches to AI            | `content.ts` (Introduction to AI slides 2–18), `board.ts` (application board), `state.ts`                                                     |
| `history`      | AI history                  | `content.ts` (Introduction to AI slides 19–27), `timeline.ts` (timeline layout), `state.ts`                                                   |
| `vacuum`       | Vacuum-cleaner agent        | `presets.ts`, `describe.ts`, `pseudocode.ts`, `chart.ts`, `state.ts`                                                                          |
| `environments` | Task environments           | `presets.ts`, `questions.ts`, `view.ts`, `state.ts`                                                                                           |
| `state-spaces` | State spaces                | `content.ts`, `space.ts` (problems as state spaces, BFS/UCS growth), `presets.ts`, `state.ts`                                                 |
| `search`       | Tree and graph search       | `presets.ts`, `view.ts` (run, expansion order, IDS iterations), `state.ts`                                                                    |
| `strategies`   | Comparing search strategies | `problems.ts`, `compare.ts`, `counts.ts`, `chart.ts`, `problem-view.ts`, `properties-view.ts`, `state.ts`                                     |
| `heuristics`   | Heuristics                  | `analysis.ts`, `second.ts` (the compared heuristic), `edit.ts`, `presets.ts`, `state.ts`                                                      |
| `eight-puzzle` | 8-puzzle                    | `solvers.ts`, `solver.worker.ts` + `worker.ts` + `queue.ts` (Web Worker), `describe.ts`, `chart.ts`, `presets.ts`, `reference.ts`, `state.ts` |
| `grid`         | Path finding on a grid      | `view.ts` (per-step cell states), `describe.ts`, `presets.ts`, `state.ts`                                                                     |

A tool owns `src/routes/<slug>/`, `src/lib/tools/catalog/<slug>.ts`, and (if
needed) `src/lib/tools/<slug>/`. Tools never edit each other's folders.
Anything two tools need goes into `theory/` or `components/`. A route folder
may hold helpers only its page uses (as `notation/` does); files without a `+`
prefix are not routes.

## 3. Notation canon

### 3.1 Search problems (Solving Problems by Searching)

| Term                  | Meaning / rendering                                                                                        | Source       |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| Search problem        | Initial state, actions, transition model (**successor**), goal state, path cost                            | slide 5      |
| State space           | All states reachable from the initial state; a directed graph (nodes = states, links = actions)            | slide 7      |
| Successor function    | Given a state, apply all applicable actions and list the resulting (successor) states                      | slide 14     |
| Frontier              | The list of unexpanded nodes (always "frontier", never "fringe" or "open list")                            | slide 13     |
| Expand                | Generate a node's children with the successor function                                                     | slide 13     |
| Node vs. state        | A state represents the world; a node is a search-tree data structure with a parent pointer and a path cost | slide 27     |
| Explored set          | States already expanded (graph search)                                                                     | slide 36     |
| Tree search           | The outline on slide 28 (no repeated-state handling)                                                       | slide 28     |
| Graph search          | Tree search plus the explored set and frontier check of slide 36 ("search without repeated states")        | slides 36–43 |
| Step cost / path cost | Path cost is a sum of nonnegative step costs                                                               | slide 5      |
| Optimal solution      | The action sequence with the lowest path cost to the goal                                                  | slide 5      |

Symbols (Uninformed Search slides 30, 44, 45; Informed Search slides 5, 16,
25, 38): `b` maximum branching factor, `d` depth of the optimal solution, `m`
maximum length of any path in the state space, `C*` cost of the optimal
solution, `ε` a positive lower bound on step costs, `g(n)` cost of the path
from the start state to node n, `h(n)` heuristic estimate of the cost from n
to a goal, `h*(n)` true cost from n to the goal, `f(n) = g(n) + h(n)`, `α` the
weighted A* inflation factor (`f(n) = g(n) + α·h(n)`), `h1`/`h2` misplaced
tiles / Manhattan distance (8-puzzle). Complexity uses `O(b^d)` with
superscripts in the UI (`O(bᵈ)`, `O(bᵐ)`, `O(bd)`, `O(bm)`, `O(b^(C*/ε))`).

Strategy names and short forms (`strategyName`, `strategyShort`):
breadth-first search (BFS), depth-first search (DFS), depth-limited search
(DLS, used by IDS), iterative deepening search (IDS), uniform-cost search
(UCS), greedy best-first search (Greedy), A* search (A\*), weighted A* search
(Weighted A\*). Queues (`queueName`): "FIFO queue" (BFS), "LIFO queue" (DFS,
DLS, IDS), "Priority queue ordered by g(n)" / "h(n)" / "f(n) = g(n) + h(n)" /
"g(n) + α·h(n)".

### 3.2 Search trees and state-space diagrams

- Search tree: root at the top, children left to right in successor order.
  Each node shows its state name. Under it, per strategy, as on the slides
  (`defaultAnnotation`): UCS `g` (e.g. `140`), greedy `h` (`253`), A\*
  `f=g+h` (`393=140+253`), weighted A\* the weighted sum (`646=140+2·253`),
  BFS/DFS/DLS/IDS nothing. The current node has the slides' arrow marker at
  its left.
- Node status colors: being expanded `--active`; on the frontier `--info`
  (outlined); expanded `--explored` (filled soft); dropped as a repeated state
  `--reject`, dashed with a cross (the slides cross out repeated states); cut
  off at the depth limit `--reject`, dashed; replaced on the frontier by a
  cheaper node: faded, `--dead` dashed, name struck through; goal node and
  solution path `--accept` (goal states get a double outline). Statuses are
  computed by `statusesAt` (§5.3); the legend (`StatusLegend`) lists only the
  statuses on screen.
- State-space graph: circles for states (small squares with outside labels
  for the Romania map, as drawn on the slide; boxes with pictures via
  `nodeBox`), costs on edges, arrows on directed edges. The start state has an
  arrow in from nowhere labelled `start`; goal states have a double outline.
  The same status colors apply to states (current, frontier, explored,
  solution path); dropped and cut-off states get a dashed `--reject` ring.

### 3.3 Step descriptions

One sentence per step, in the lecture's words (`describeStep`, golden-tested
in `describe.spec.ts`). A node taken off the frontier shows the strategy's
priority in parentheses (`g = …` UCS, `h = …` greedy, `f = …` A\* and
weighted A\*; nothing for BFS, DFS, DLS, IDS):

| Step                       | Sentence                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| init                       | "Initialize the frontier with Arad." DLS: "Initialize the frontier with A (depth limit 1)." IDS: "Start iteration with depth limit 1: initialize the frontier with A."                                                   |
| expand                     | "Take Sibiu off the frontier (f = 393). Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea."                                                                                                                   |
| expand, no successors      | "Take q off the frontier. Not a goal, and it has no successors."                                                                                                                                                         |
| cutoff                     | "Take B off the frontier. Not a goal. B is at the depth limit 1; not expanded."                                                                                                                                          |
| goal                       | "Take Bucharest off the frontier. It contains the goal state: return the solution Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418)."                                                                       |
| goal, tested at generation | "G contains the goal state (tested when generated): return the solution S → e → r → f → G (cost 14)."                                                                                                                    |
| fail                       | "The frontier is empty: return failure (no solution)." DLS/IDS: "The frontier is empty and no node was cut off at the depth limit 3: return failure (no solution)."                                                      |
| fail after cutoffs         | DLS: "The frontier is empty and nodes were cut off at the depth limit 1: no solution within the limit." IDS: "…: start again with depth limit 2.", at the largest limit "…, the largest limit: stop without a solution." |
| fail at the run's limit    | "Stop after taking 500 nodes off the frontier (the limit for this run); no solution found yet." or "Stop after generating 50,000 nodes (the limit for this run); no solution found yet."                                 |

An expand sentence is followed by one note per child that was not simply
added, grouped by reason in order of first appearance: "Arad is in the
explored set; not added." / "Sibiu and Zerind are in the explored set; not
added." / "S is already on this path; not added." (path check) / "e is
already on the frontier; not added." (BFS, DFS) / "Craiova is already on the
frontier with a lower path cost (366); not added." (or "the same path cost";
priority strategies) / "Bucharest (path cost 418) replaces Bucharest (path
cost 450) on the frontier." / "G contains the goal state." (goal test at
generation). `describeResult` gives the closing summary: "Solution: Arad →
… → Bucharest (cost 418)." (IDS adds the iteration it was found in) or why
there is none, then "N nodes taken off the frontier, N expanded, N
generated."

### 3.4 Defaults where the decks are silent

- **Successor order**: alphabetical by state name ("name order",
  `compareNames`: case-insensitive, digit runs by value). This reproduces
  every slide trace: BFS `S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G`, DFS
  `(S,)d,b,a,c,a,e,h,p,q,q,r,f,c,a,G`, UCS `S,p,d,b,e,a,r,f,e,G` (Uninformed
  Search slides 4, 6, 41), and the Romania trees (Arad → Sibiu, Timisoara,
  Zerind). Typed-in graphs can switch to "listed" (edge order).
- **DFS** pushes children so the first successor is expanded first.
- **Goal test** when a node is taken off the frontier (Tree Search Algorithm
  Outline, slide 28); an option tests at generation instead (the root is then
  tested when the frontier is initialized).
- **Expansion order** lists every node taken off the frontier, including the
  goal node (the slides end their orders with `G`).
- **Ties** in a priority queue go to the node added first (FIFO).
- **Graph search** (slide 36): a node's state enters the explored set when the
  node is expanded; a child whose state is explored is not added. A child whose
  state is already on the frontier replaces that frontier node only for
  priority-queue strategies (UCS, greedy, A\*, weighted A\*) and only when its
  path cost is lower; otherwise it is not added. The replacing node is a new
  frontier entry (it takes its place in the tie order as a new node).
- **Path check** ("avoid repeated states along path", Uninformed Search slide
  32): a child whose state already appears on the path from the root to it is
  not added. Offered for every strategy; it is how DFS and IDS are made
  complete in finite spaces.
- **Depth limit** (DLS, and each IDS iteration): a node at depth = limit is
  goal-tested but not expanded (it is _cut off_, even when it has no
  children). IDS tries limits 0, 1, 2, … and stops at the first limit with a
  solution, or when an iteration cuts nothing off (no solution), or at the
  largest limit.
- **Counts**: _generated_ counts every node created, including the root and
  children that were not added; _expanded_ counts nodes whose successors were
  generated; _popped_ counts nodes taken off the frontier (expanded, cut off,
  or the goal). The slides' "time" is nodes generated, "space" is the largest
  frontier (plus the explored set in graph search).
- **Informed search without a heuristic**: h = 0 for states with no value.
- **Weighted A\***: `α` defaults to 2.

### 3.5 Rational agents

- An agent perceives its environment through **sensors** and acts on it
  through **actuators** (Rational Agents, slide 2).
- Vacuum world: squares `A` and `B`; percepts `[A, Dirty]` (location and
  status); actions `Left`, `Right`, `Suck`, `NoOp` (slide 3). The reflex agent
  program is exactly:

  ```
  function Vacuum-Agent([location, status]) returns an action
    if status = Dirty then return Suck
    else if location = A then return Right
    else if location = B then return Left
  ```

- **Vacuum state names**: the agent's square, a space, then `D` (dirty) or
  `C` (clean) for each square from left to right. `A DD` is the slide 3
  picture (agent in A, both squares dirty); `B CD` has the agent in B with
  only B dirty. The two-square states in the order of the state-space diagram
  (Solving Problems by Searching, slide 9): `A DD`, `B DD`, `A CD`, `B CD`,
  `A DC`, `B DC`, `A CC`, `B CC`. The n-square world (2–5 squares, lettered
  A–E, n·2ⁿ states; slide 8) uses the same names (`C DCD`). Its actions are
  `Left`, `Right`, `Suck`, each with cost 1; an action with no effect is a
  self-loop, as on the slide 9 diagram.
- **PEAS**: Performance measure, Environment, Actuators, Sensors (slide 6).
- Environment types (slides 9–16, review on slide 20), in this order, with
  the slide 17 row labels and value names: Observable — Fully / Partially;
  Deterministic — Deterministic / Stochastic / Strategic; Episodic — Episodic
  / Sequential; Static — Static / Dynamic / Semidynamic; Discrete — Discrete /
  Continuous; Single agent — Single / Multi; Known — Known / Unknown. Full
  names ("Fully observable", "Multi-agent") are used in sentences.
- Expected utility: `EU(action) = Σ_outcomes P(outcome | action) U(outcome)`
  (slide 4).

### 3.6 8-puzzle

- Boards are written row by row; the blank is shown as an empty tile (text:
  `_`, formatted `7 2 4 / 5 _ 6 / 8 3 1`). Slide start state
  `7 2 4 / 5 _ 6 / 8 3 1`, goal `_ 1 2 / 3 4 5 / 6 7 8` (Informed Search,
  slide 32). In URL state and in the engine a board is nine digits with `0`
  for the blank: `724506831`.
- Typed boards (`parseBoard`): one character per square, `1`–`8` for tiles
  and `_` or `0` for the blank; spaces, commas, semicolons, slashes, `|`,
  brackets and line breaks are ignored, so `7 2 4 / 5 _ 6 / 8 3 1`,
  `724506831` and one row per line read the same. Unknown characters, a
  wrong number of squares, repeated or missing tiles, and a missing blank are
  errors.
- Actions move the blank: `Left`, `Right`, `Up`, `Down` (successor order),
  step cost 1 (Solving Problems by Searching, slide 10).
- `h1(n)` = number of misplaced tiles (the blank does not count); `h2(n)` =
  total Manhattan distance of the tiles. Slide values for the start state:
  `h1 = 8`, `h2 = 3+1+2+2+2+3+3+2 = 18` (tiles 1–8 in order).
- 181,440 reachable states (9!/2); a board is reachable from the goal iff the
  inversion parities match.

### 3.7 Grid path finding

Cells `(column, row)` from the top-left (cell index `row · width + column`);
walls block; 4-connected (step cost 1) or 8-connected (diagonal cost √2, no
corner cutting past walls). Heuristics: Manhattan, Euclidean, octile,
Chebyshev, zero; the default is the open-grid distance (Manhattan, or octile
with diagonals), and every heuristic is admissible except Manhattan with
diagonal moves. Weighted A\* multiplies h by α (Informed Search, slides
23–24, 38–40). Successor order is clockwise from up (`Up, Right, Down, Left`;
with diagonals `Up, Up-Right, Right, …, Up-Left`).

Grid text (`encodeGrid`/`decodeGrid`, the `grid` field of the grid tool's
URL state) is URL-safe: `<columns>x<rows>~s<column>.<row>~g<column>.<row>`
then, when there are walls, one wall field, whichever is shorter: `r` run
lengths in base 36 separated by `.` (alternating open and wall cells row by
row from the top-left, starting with open; a trailing open run is left out)
or `b` a base64url bitmap (six cells per character, first cell in the high
bit, trailing `A`s left out). Example, the concave obstacle of slide 23:
`32x22~s7.18~g23.2~r5m.a.m.a.u.2.u.2.u.2.u.2.u.2`. Sides are 1–100 cells;
problems are diagnostics with spans (a start or goal on a wall is a warning
and the wall is removed).

### 3.8 Citations

Presets cite the deck and slide with `formatCitation({ deck: 'uninformed', slide: 4 })`
→ "Uninformed Search · slide 4" (a range `[6, 8]` → "slides 6–8"). Deck ids:
`intro`, `agents`, `search`, `uninformed`, `informed` (see `lectures.ts`).
Never name the instructor or university, and never link to the slide files.

## 4. Engine API (src/lib/theory)

All functions are pure; inputs are never mutated. Errors in user input are
reported as `Diagnostic`s, never thrown. Programming errors may throw.
`search`, `graphs`, `puzzle` and `grid` have an `index.ts`; import agents
modules by file (`$lib/theory/agents/vacuum`).

```ts
// diagnostics.ts
interface Span {
	start: number; // [start, end) string offsets
	end: number;
	source: string | null; // null: the tool's main text
}
interface Diagnostic {
	severity: 'error' | 'warning' | 'info';
	message: string;
	span?: Span;
}
function hasErrors(ds: readonly Diagnostic[]): boolean;
```

### 4.1 Search (`theory/search/`)

```ts
interface Successor<S> {
	action: string;
	state: S;
	cost: number;
}
interface SearchProblem<S> {
	initial: S;
	key(state: S): string; // identity for repeated-state checks
	label?(state: S): string; // display name (defaults to key)
	successors(state: S): readonly Successor<S>[]; // fixed order
	isGoal(state: S): boolean;
	h?(state: S): number;
}
type StrategyId = 'bfs' | 'dfs' | 'dls' | 'ids' | 'ucs' | 'greedy' | 'astar' | 'wastar';
type RepeatMode = 'tree' | 'path' | 'graph';
interface SearchOptions {
	strategy: StrategyId;
	mode?: RepeatMode; // default 'tree'
	depthLimit?: number; // dls: limit (default 3); ids: largest limit (default 50)
	weight?: number; // wastar α (default 2)
	goalTest?: 'expand' | 'generate'; // default 'expand'
	maxExpansions?: number; // nodes taken off the frontier (default 10 000)
	maxNodes?: number; // nodes generated (default 200 000)
	record?: 'full' | 'nodes' | 'summary'; // default 'full'
}
function search<S>(problem: SearchProblem<S>, options: SearchOptions): SearchResult;
// SearchResult: { strategy, mode, options: Required<SearchOptions>, nodes: SearchNode[],
//   steps: SearchStep[], solution: Solution | null, failure: 'exhausted' | 'cutoff' | 'limit' | null,
//   order: string[] /* labels taken off the frontier, incl. goal */, iterations: IterationInfo[], stats }
// SearchNode: { id, parent, key, label, action, depth, g, h, priority, iteration,
//   outcome: 'added' | 'replaced' | 'explored' | 'frontier' | 'on-path' | 'goal' | null,
//   created, closed, replacedAt }   (created/closed/replacedAt are step indices)
// SearchStep: { kind: 'init' | 'expand' | 'cutoff' | 'goal' | 'fail', node, children,
//   iteration, reason?, expanded, generated, frontier? /* pop order */, explored? }
// Solution: { node, path /* node ids */, actions, states /* labels */, cost, depth }
// IterationInfo (DLS, IDS): { limit, firstStep, lastStep, order, found, cutoff }
// stats: { popped, expanded, generated, maxFrontier, explored }
function pathTo(nodes, id): number[]; // node ids from the root to id
function frontierAfter(result, stepIndex): number[]; // recorded snapshot, else ids ascending
function frontierKind(s): 'fifo' | 'lifo' | 'priority';
function usesPriority(s): boolean;
function usesHeuristic(s): boolean; // greedy, astar, wastar
function priorityOf(s, g, h, weight?): number | null;
function normalizeOptions(o): Required<SearchOptions>;
function createFrontier(kind): Frontier; // push, pop, remove, size, snapshot (pop order)
// DEFAULT_MAX_EXPANSIONS, DEFAULT_MAX_NODES, DEFAULT_DLS_LIMIT, DEFAULT_IDS_MAX_LIMIT, DEFAULT_WEIGHT

// properties.ts — the strategy table (Uninformed Search slide 45, Informed Search slide 42)
const STRATEGY_PROPERTIES: readonly StrategyProperties[]; // { strategy, name, complete, optimal, time, space, notes, cite }
const COMPLEXITY_SYMBOLS: readonly { symbol: string; meaning: string }[];
function treeNodes(b, d): bigint; // 1 + b + … + bᵈ
function idsNodes(b, d): bigint; // (d+1)b⁰ + d b¹ + … + bᵈ
function dfsSpace(b, m): bigint; // b·m + 1
function hanoiMoves(n): bigint; // 2ⁿ − 1
const EIGHT_PUZZLE_COSTS; // Informed Search slide 36
function formatCount(n: bigint | number): string; // "1,234,567"
function formatLarge(n: bigint, maxDigits = 15): string; // "1.2 × 10²⁵"
function superscript(n: number): string;
```

`record: 'full'` stores a frontier snapshot (pop order) and explored set per
step and a node for every generated child; use it for problems with up to a
few thousand steps. `'nodes'` drops the snapshots (grids; `frontierOrder`
rebuilds the pop order). `'summary'` keeps no steps and only nodes that
entered the frontier (8-puzzle solvers, `optimalCost`,
`optimalSolutionLength`).

Golden tests (search.spec.ts) reproduce the slide traces listed in §3.4, the
greedy and A\* Romania trees (Informed Search slides 8–11, 17–22, including
every `f=g+h` label), the IDS binary tree (Uninformed Search slides 34–37:
`A | ABC | ABDECFG | ABDHIEJKCFLM`), and "A\* gone wrong" (slides 27–29: tree
search cost 5, graph search cost 6). `search.invariants.spec.ts` checks the
engine's invariants on seeded random graphs (parallel edges, self-loops,
zero-cost edges, unreachable goals) for every strategy and option.

### 4.2 Graphs (`theory/graphs/`)

```ts
interface GraphNode { id: string; x?: number; y?: number }   // id = display name
interface GraphEdge { from: string; to: string; cost: number }
interface WeightedGraph { directed: boolean; nodes: GraphNode[]; edges: GraphEdge[] }
// undirected edges are listed once and can be taken both ways
interface GraphProblemSpec {
	graph: WeightedGraph; start: string; goals: string[];
	h?: Readonly<Record<string, number>>; hLabel?: string;   // missing h values are 0
}
type SuccessorOrder = 'alphabetical' | 'listed';
function compareNames(x, y): number;                          // name order (§3.4)
function adjacency(graph, order = 'alphabetical'): Map<string, Neighbor[]>; // Neighbor { to, cost, edge }
function graphProblem(spec, { order? } = {}): SearchProblem<string>; // actions named after the target
function layoutGraph(graph): Map<string, Point>;              // keeps x/y, lays out the rest (deterministic)
function boundsOf(points): { minX, minY, maxX, maxY };
// LAYOUT_SPACING = 120 (drawing units between neighbors)
// builtins.ts: ROMANIA, SLD_BUCHAREST, SLD_FAGARAS, ROMANIA_PROBLEM, ROMANIA_IASI_FAGARAS,
//   TINY_GRAPH, TINY_PROBLEM, ASTAR_WRONG_GRAPH, ASTAR_WRONG_PROBLEM,
//   GREEDY_TRAP_GRAPH, GREEDY_TRAP_PROBLEM, BINARY_TREE, BINARY_TREE_PROBLEM

// text.ts — the graph text format (§4.2.1)
function parseGraphText(text: string): { spec: GraphProblemSpec | null; diagnostics: Diagnostic[] };
function formatGraphText(spec: GraphProblemSpec, opts?: { positions?: boolean }): string;
function highlightGraphText(text: string): HighlightToken[];   // hl-* classes for CodeEditor
// MAX_STATES = 300, MAX_EDGES = 3000

// analysis.ts
function trueCosts(spec): Map<string, number>;   // h*(n): cheapest cost from n to a goal (Infinity if none)
function shortestPath(spec): { cost: number; states: string[] } | null; // ties: name order from the start
interface HeuristicReport {
	admissible: boolean; consistent: boolean; goalsZero: boolean;
	nodes: { id: string; h: number; hStar: number; admissible: boolean }[];
	edges: { from: string; to: string; cost: number; hFrom: number; hTo: number; consistent: boolean }[];
	// consistency is checked per direction: h(n) ≤ c(n, n') + h(n'); undirected edges both ways
}
function checkHeuristic(spec, h = spec.h ?? {}): HeuristicReport;
interface HeuristicComparison {
	dominates: boolean; // h2 ≥ h1 everywhere
	equal: boolean;
	nodes: { id: string; h1: number; h2: number }[];
}
function compareHeuristics(spec, h1, h2): HeuristicComparison;
function maxHeuristic(...hs: Record<string, number>[]): Record<string, number>;
```

#### 4.2.1 Graph text format

One directive or edge per line; `#` starts a comment. Directive words are
case-insensitive. Names are words (letters of any script, digits, `_`, `'`,
`.`) or double-quoted strings (`"Rimnicu Vilcea"`, with `\"` and `\\` as
escapes).

```
# h: Straight-line distance to Bucharest   ← first non-blank line only: the heuristic's label
undirected                 # or: directed. Default: undirected, unless some edge uses ->
start: Arad
goal: Bucharest            # several goals: "goal: G1, G2" (also "goals:")
Arad - Sibiu 140           # an undirected edge with its cost (cost defaults to 1)
S -> d 3                   # a directed edge; the graph becomes directed
Arad Sibiu 140             # no arrow: the graph's direction
A - B: 5                   # the cost may follow a colon
h: Arad=366, Sibiu=253     # heuristic values; several h: lines allowed
at: Arad 26 233            # a drawing position (optional)
node: Lonely               # a state with no edges (also "nodes:"; a list declares several)
```

- Edge operators: `-`, `--`, `->`, `→`, or none. Costs are decimal numbers
  ≥ 0 (`5`, `2.5`, `.5`; no exponents). In a directed graph, `-`, `--` and
  arrowless edges add both directions; in a graph declared `undirected`, an
  arrow is an error. `directed` and `undirected` may be written with or
  without a colon (followed by `-` or `->` they are state names).
- `start`, `goal`, `goals`, `at`, `node`, `nodes` need their colon
  (`start A` is an error, not an edge). `goal:` and `node:` lists are
  separated by commas or spaces.
- Node order is the order in which states first appear on start, goal, node,
  edge and at lines (`h:` lines never create states).
- A duplicate edge (the same pair; in an undirected graph `A - B` and `B - A`
  are the same edge) replaces the earlier one (warning). A later `h:` value
  or `at:` position for the same state wins (warning).
- Limits: `MAX_STATES` (300) states and `MAX_EDGES` (3000) edges, counting a
  two-way edge of a directed graph twice.
- Diagnostics carry spans. Errors: unknown directive, unexpected character,
  unclosed quote or empty name, bad or negative cost, negative h, missing
  colon, missing or second start, missing goal, arrow in an undirected graph,
  both `directed` and `undirected`, too many states or edges, malformed lines.
  Warnings: duplicate edge, repeated h or position, h for a state that is not
  in the graph (ignored), start or goal with no edges. Info: self-loop,
  repeated start line. `spec` is null when there is an error.

`formatGraphText` writes the canonical text: the `# h:` label, the direction,
a `node:` list first when needed to keep the node order, `start:`, `goal:`,
every edge with its cost (`->` or `-`), `node:` lines for states without
edges, `h:` lines (graph order, six per line), and with `positions` the
`at:` lines. `parseGraphText(formatGraphText(spec, { positions: true })).spec`
equals `spec` when its numbers have at most three decimals; tools keep graph
text in their URL state for that reason.

### 4.3 8-puzzle (`theory/puzzle/`)

```ts
type Board = string;   // nine digits row by row, '0' = blank
type PuzzleAction = 'Left' | 'Right' | 'Up' | 'Down';   // blank moves, successor order
type PuzzleHeuristic = 'h1' | 'h2' | 'max' | 'zero';
const SIZE = 3, CELLS = 9, SLIDE_START = '724506831', SLIDE_GOAL = '012345678';
const PUZZLE_ACTIONS, OPPOSITE, PUZZLE_HEURISTICS, REACHABLE_STATES = 181_440;
function isBoard(value: unknown): value is Board;
function rowOf(cell), colOf(cell), tileAt(board, cell), cellOf(board, tile), blankCell(board): number;
function parseBoard(text): { board: Board | null; diagnostics: Diagnostic[] };
function formatBoard(board, { blank?: string /* '_' */; rows?: 'slash' | 'lines' } = {}): string;
function moves(board): { action: PuzzleAction; board: Board; tile: number }[];
function applyMove(board, action): Board | null;
function actionForCell(board, cell): PuzzleAction | null;   // the move that slides the tile on cell
function playMoves(board, actions): Board[];                 // boards visited, starting with board
function misplacedTiles(board, goal): number;                // h1
function manhattanDistance(board, goal): number;             // h2
function tileDistances(board, goal): { tile: number; distance: number }[]; // tiles 1–8
function puzzleHeuristic(goal, h: PuzzleHeuristic): (board: Board) => number;
function inversions(board): number;
function isSolvable(start, goal): boolean;
function puzzleProblem(start, goal, h: PuzzleHeuristic = 'h2'): SearchProblem<Board>; // label: formatBoard
function optimalSolutionLength(start, goal): number | null;  // BFS graph search
const PUZZLE_GRAPH_LIMITS;                                   // maxExpansions/maxNodes that never stop a graph search early
function seededRandom(seed): () => number;                   // mulberry32
function scrambleMoves(goal, count, seed): PuzzleAction[];   // random walk that never undoes its last move
function scramble(goal, moves: number, seed: number): Board;  // reproducible
```

### 4.4 Grids (`theory/grid/`)

```ts
interface Grid { width: number; height: number; walls: boolean[]; start: number; goal: number }
// cell index = row * width + column
type GridHeuristic = 'manhattan' | 'euclidean' | 'octile' | 'chebyshev' | 'zero';
type GridMove = 'Up' | 'Up-Right' | 'Right' | … | 'Up-Left';   // clockwise from Up
const GRID_HEURISTICS, DIAGONAL_COST = Math.SQRT2, MAX_GRID_SIDE = 100;

// problem.ts
function gridProblem(grid, { diagonal?: boolean; heuristic?: GridHeuristic } = {}): SearchProblem<number>;
// key: the index as a string; label: "(column, row)"; h default: defaultHeuristic(diagonal)
function gridSuccessors(grid, cell, diagonal = false): Successor<number>[];
function gridMoves(diagonal): GridMove[];
function cellAt(grid, col, row): number;          // -1 outside the grid
function cellPosition(grid, cell): { col: number; row: number };
function cellLabel(grid, cell): string;           // "(3, 5)"
function isOpen(grid, cell): boolean;
function heuristicDistance(heuristic, dx, dy): number;
function gridHeuristic(grid, heuristic): (cell: number) => number;
function isAdmissible(heuristic, diagonal): boolean;
function defaultHeuristic(diagonal): GridHeuristic; // octile with diagonals, else manhattan
function optimalCost(grid, { diagonal? } = {}): number | null; // UCS graph search
function gridSearchLimits(grid): { maxExpansions: number; maxNodes: number }; // never stop early

// encode.ts — grid text (§3.7)
function encodeGrid(grid): string;
function decodeGrid(text): { grid: Grid | null; diagnostics: Diagnostic[] };

// edit.ts — every edit returns a new grid (or the same grid when nothing changes);
// walls never cover the start or goal, and start ≠ goal
function emptyGrid(width, height): Grid;          // start lower left, goal upper right
function setWall(grid, cell, wall), setWalls(grid, cells, wall), toggleWall(grid, cell): Grid;
function placeStart(grid, cell), placeGoal(grid, cell), clearWalls(grid): Grid;
function wallCount(grid): number;
function resizeGrid(grid, width, height): Grid;   // nearest-neighbor copy of the layout

// presets.ts — deterministic layouts at any size (random ones take a seed)
type GridPresetId = 'concave' | 'open' | 'wall-gap' | 'maze' | 'scattered';
type GridSizeId = 'small' | 'medium' | 'large';   // 16×11, 32×22, 60×40
const GRID_SIZES, GRID_PRESETS /* { id, label, description, random } */, DEFAULT_SEEDS;
function gridPreset(id, width, height, seed?): Grid;
function concaveGrid(w?, h?), openGrid(w?, h?), wallGapGrid(w?, h?), mazeGrid(w?, h?, seed?),
	scatteredGrid(w?, h?, seed?, density?): Grid;
function gridSizeId(width, height): GridSizeId | null;
function isConnected(grid): boolean;              // 4-connected reachability
function seededRandom(seed): () => number;
```

### 4.5 Agents (`theory/agents/`)

```ts
// vacuum.ts — the two-square world (Rational Agents, slides 3–5)
type Square = 'A' | 'B'; type Status = 'Clean' | 'Dirty';
type VacuumAction = 'Left' | 'Right' | 'Suck' | 'NoOp';
interface VacuumWorld { location: Square; dirt: Record<Square, boolean> }
type Percept = [Square, Status];
const SQUARES, VACUUM_ACTIONS, PERCEPTS /* table order */, INITIAL_WORLDS /* slide 9 order */;
function vacuumWorld(location, dirtA, dirtB): VacuumWorld;
function worldName(world): string; function parseWorldName(text): VacuumWorld | null; // "A DD"
function perceive(world): Percept; function formatPercept(p): string;   // "[A, Dirty]"
function perceptKey(p): PerceptKey /* "A,Dirty" */; function perceptIndex(p): number;
function applyAction(world, action): VacuumWorld; function cleanCount(world): number;
function reflexVacuumAgent(percept): VacuumAction;    // the slide 3 program
// Agent programs: { id, name, description, stochastic, rules, init(seed?), act(percept, memory) }
type ProgramId = 'reflex' | 'reflex-state' | 'random' | 'table';
const PROGRAM_IDS, reflexProgram, reflexStateProgram, randomProgram, REFLEX_TABLE;
function tableProgram(table: PerceptTable), agentProgram(id, table?): AgentProgram;
function tableActions(table), tableFromActions(actions);
type MeasureId = 'clean-squares' | 'clean-minus-moves';
const MEASURE_IDS, MEASURES;                          // PerformanceMeasure { id, name, description, reward }
function simulate(config: SimulationConfig): VacuumRun;
// { program, table?, initial, steps (0–MAX_STEPS = 1000), dirtProbability?, measure?, seed? };
// seeded (mulberry32), reproducible; bad numbers are clamped with diagnostics
function evaluate(programs, config: EvaluationConfig): ProgramEvaluation[]; // average over INITIAL_WORLDS
function bestEvaluations(evaluations): number[];
function mulberry32(seed), mulberry32Next(state), seedState(seed), agentSeed(seed);
function isProgramId(v), isVacuumAction(v), isMeasureId(v): boolean;

// vacuum-space.ts — the vacuum world as a search problem (Solving Problems by Searching, slides 8–9)
const MIN_SQUARES = 2, MAX_SQUARES = 5, SPACE_ACTIONS = ['Left', 'Right', 'Suck'], SPACE_SPACING;
interface VacuumState { location: number; dirt: readonly boolean[] }
function vacuumStateName(state): string; function squareLetter(i): string;
function parseVacuumState(text, squares?): { state: VacuumState | null; diagnostics: Diagnostic[] };
function vacuumStates(n): VacuumState[];              // layout order (slide 9 order for n = 2)
function vacuumStateCount(n): number;                 // n·2ⁿ
function vacuumResult(state, action): VacuumState; function isAllClean(state): boolean;
function vacuumTransitions(n): { from; to; action }[]; // edge i of vacuumStateSpace(n) is transition i
function vacuumPositions(n): Map<string, { x: number; y: number }>;
function vacuumStateSpace(n = 2): WeightedGraph;     // directed, cost 1, self-loops included
function vacuumGoals(n): string[];
function vacuumProblem(n, start, { selfLoops? } = {}): SearchProblem<string>; // throws on a bad start
function vacuumProblemSpec(n, start): GraphProblemSpec;

// environments.ts — task environments (Rational Agents, slides 6–20)
type Dimension = 'observable' | 'deterministic' | 'episodic' | 'static' | 'discrete' | 'agents' | 'known';
type EnvironmentProfile = { [D in Dimension]?: DimensionValues[D] };   // any dimension may be unset
const DIMENSION_IDS, DIMENSIONS /* DimensionInfo: label, title, question, details, values, cite */;
function dimension(id), valueInfo(d, v), valueIndex(d, v), isDimension(v), isDimensionValue(d, v);
function isEnvironmentProfile(v), normalizeProfile(p), sameProfile(a, b), profileDiagnostics(p);
const PEAS_PARTS, PEAS_EXAMPLES /* taxi, spam filter (slides 7–8), vacuum */; function emptyPeas(), peasExample(id);
const ENVIRONMENT_EXAMPLES /* slide 17 table first, then site examples */, SLIDE_17_IDS;
function environmentExample(id);
const COURSE_PREVIEW;                                 // "Preview of the course" rows (slide 18)
function matchCourseRow(row, profile): CourseRowMatch; // status 'applies' | 'depends' | 'no', missing, reason
function courseMethods(profile): CourseRowMatch[];    // rows that apply or depend, slide order
function courseRowTitle(row): string;
const SEARCH_SETTING;                                 // fully observable, deterministic, discrete, known
function compareProfile(profile, required): { matches; differs; missing };
// *_CITE constants hold the slide of each part (DIMENSIONS_CITE, PEAS_CITE, SLIDE_17, …)
```

## 5. UI contracts

### 5.1 Tool pages

Every tool page renders inside `ToolPage` (`$lib/components/ui/ToolPage.svelte`,
props `tool`, `actions?` snippet next to "Copy link", `shareable?`) with its
`ToolMeta` from `$lib/tools/catalog/<slug>`, and keeps its user-editable state
in the URL hash through `$lib/url-state` so the "Copy link" button reproduces
the exact view:

```ts
let state = $state({ graph: '…', strategy: 'astar' }); // JSON-serializable
syncToHash(() => state, { onLoad: (v) => Object.assign(state, v), validate }); // delay? (default 250)
```

- The hash is `v1.` plus lz-string compressed JSON (`encode`/`decode`).
  Anything else (plain anchors, other versions, corrupt text) decodes to
  null, and `validate` rejects values of the wrong shape; either way the page
  keeps its current state.
- The hash is read on mount and on `hashchange`, and written (debounced, hash
  only, no history entry) when the state changes; an untouched page keeps a
  clean URL. If an in-page anchor replaces the hash, the state is put back.
  `CopyLinkButton` calls `flushHash()` before copying. One `syncToHash` per
  page, called during component initialisation.
- Each tool's `state.ts` holds its hash state: the shape, a default, a
  validator passed as `validate` (`isSavedSearchState` and the like: every
  field optional except what a link must carry, each checked for type and
  range), and a `complete…` function that fills in the defaults. The saved
  state accepts the tool's `LinkStates` shape (§5.2).
- Prerendering: share links like `/search#v1.…` appear in page content, and
  the prerenderer would report `v1.…` as a missing element id. The
  `prerender.handleMissingId` hook in `vite.config.ts` ignores ids starting
  with `v1.`; any other missing anchor fails the build.

Link to a tool with `toolHref(slug)` from `$lib/site`.

### 5.2 Cross-tool links

`$lib/tools/links.ts` lists the state each tool accepts in its URL hash.
Build a link with `toolLink('search', { graph })`; it returns `null` when the
target tool is not registered, so hide the link in that case (prerendering
fails on links to pages that do not exist). A tool's own saved state must
accept its `LinkStates` shape (extra fields are allowed).

```ts
interface LinkStates {
	search: {
		graph: string; // graph text (formatGraphText)
		strategy?: StrategyId;
		mode?: RepeatMode;
		weight?: number; // weighted A* α
		depthLimit?: number; // DLS limit, or the largest IDS limit
		goalTest?: 'expand' | 'generate';
	};
	heuristics: { graph: string };
	strategies: { graph?: string; mode?: RepeatMode };
	'state-spaces': { problem?: 'vacuum' | 'romania' | 'puzzle' | 'robot'; squares?: number };
	'eight-puzzle': { start: string; goal?: string }; // nine digits, 0 = blank
	grid: {
		grid: string; // grid text (encodeGrid)
		algorithm?: GridAlgorithm; // 'bfs' | 'dfs' | 'ucs' | 'greedy' | 'astar' | 'wastar'
		compare?: GridAlgorithm | null;
		diagonal?: boolean;
		heuristic?: GridHeuristic;
		weight?: number;
	};
	environments: { preset?: string };
	vacuum: {
		program?: 'reflex' | 'reflex-state' | 'random' | 'table';
		initial?: string; // vacuum state name, e.g. "A DD"
		measure?: 'clean-squares' | 'clean-minus-moves';
	};
	approaches: { approach?: ApproachId };
	history: { era?: string | null };
}
```

### 5.3 Search components (`$lib/components/search/`)

- `StateGraph.svelte` draws a `WeightedGraph` per §3.2. Nodes without
  positions are placed by `layoutGraph`. Zoom with the buttons, Ctrl/⌘ +
  wheel, a pinch, or (focused) `+`/`-`; pan by dragging or with the arrow
  keys; "fit" or `0` refits. The view refits when the graph changes, not when
  only the highlight does. Props:
  - `graph`, `start?`, `goals?`, `heuristic?` (h by state name, drawn next to
    each state);
  - `highlight?: GraphHighlight`, state names by status: `current`,
    `frontier`, `explored`, `path` (states in order; the edges between them
    are highlighted), `dropped`, `cutoff`; `graphHighlightAt` builds it from a
    search step;
  - `nodeShape?` (`'circle'` or `'square'`), `showCosts?` (default true),
    `height?` (default 420), `autoHeight?` (default true: shrink to the
    graph's height on narrow screens), `legend?`, `class?`;
  - `onnodeclick?(id)` makes states focusable buttons; `selected?` draws a
    selection ring;
  - `edgeLabel?(edge, index)`: a label per edge instead of the cost (`null`
    for none); every edge is then drawn separately. `loopSide?(edge, index)`
    puts a self-loop on the `'top'`, `'right'`, `'bottom'` or `'left'`;
  - `nodeBox?: { width, height }` draws states as boxes, and the
    `nodePicture?` snippet draws inside each one (it receives a `NodeFrame`:
    `id`, `x`, `y`, `width`, `height` in px);
  - `ariaLabel?` (default: a generated summary); `describeNode?(id, words)`
    replaces a state's accessible name (default: name, h, and the status
    words such as "being expanded"); `statusText?` gives the page's own words
    per legend key, e.g. `{ dropped: 'Overestimates h*' }`, used in the legend
    and, lower-cased, in the states' names.
- `SearchTree.svelte` draws the search tree of a `SearchResult` up to a step,
  per §3.2. Positions are stable (the step's iteration is laid out once with
  `tree-layout.ts`), nodes created after `step` are hidden, and only the
  current IDS iteration is drawn. Props: `result`, `step`, `annotation?`
  (`'none'`, `'g'`, `'h'`, `'f'`, `'fgh'`; default
  `defaultAnnotation(strategy)`), `showCosts?`, `maxNodes?` (default 600, the
  first nodes by id), `goals?` (state keys drawn with a goal outline),
  `label?(node)`, `ariaLabel?`, `maxHeight?` (default 560), `legend?`,
  `class?`.
- `FrontierView.svelte` shows the frontier after a step in pop order with
  priorities (`priorityLabel`), the queue name (§3.1), and the explored set.
  Props: `result`, `step`, `label?(node)`, `maxChips?` (default 60, then
  "+N more"), `showExplored?` (default: graph search), `level?` (heading
  level, default 3), `class?`.
- `StatusLegend.svelte`: `items` (legend keys from `graphLegend` or
  `treeLegend`), `shape?` (`'circle'`, `'square'`, `'pill'`), `labels?`
  (caption overrides), `class?`.
- `describe.ts`: `describeStep(result, index, opts?)` (§3.3),
  `describeResult(result, opts?)`, `strategyName`, `strategyShort`,
  `queueName`, `prioritySymbol`, `priorityLabel`, `priorityPhrase`,
  `annotationText`, `defaultAnnotation`, `formatNumber` (up to two decimals,
  `∞`), `formatCount`. `opts.label` overrides node names.
- `tree-view.ts`: what the components show at a step. `clampStep`,
  `iterationAt`, `iterationNodes`, `frontierOrder` (pop order, rebuilt when
  no snapshot was recorded), `exploredAfter`, `labelsByKey`, `currentNode`,
  `solutionPathAt`, `statusesAt` (`TreeNodeStatus`: `current`, `goal`,
  `frontier`, `expanded`, `cutoff`, `dropped`, `replaced`, `generated`),
  `countStatuses`, and `graphHighlightAt(result, step)`.
- `legend.ts`: `LegendKey`, `LEGEND_ORDER`, `LEGEND_TEXT`, `graphLegend`,
  `treeLegend`, `GraphHighlight`, `GRAPH_STATUS_WORDS`, `statusWord`.
- `tree-layout.ts`: tidy-tree layout (Buchheim, Jünger and Leipert),
  `layoutTree(nodes, rootId, opts)` with `opts.width(id)` and optional gaps
  and row height; returns `{ pos, width, height, depth }`. Iterative and
  linear. `tree-scene.ts`, `graph-scene.ts` and `geometry.ts` compute the
  drawings in pixels so the components only render.

Every helper module has a spec. `index.ts` exports the components,
`describe.ts`, `tree-layout.ts`, `tree-view.ts`, `legend.ts`, and the types
`LoopSide`, `NodeFrame`, `NodeShape`.

### 5.4 UI kit (`$lib/components/ui/`)

`Button`, `IconButton`, `Toggle`, `SegmentedControl`, `Tabs`, `Panel`,
`Callout`, `Badge`, `Kbd`, `Select`, `NumberField`, `TextField`, `CodeEditor`
(monospace textarea with line numbers, highlighting, and diagnostic markers),
`ProblemStatus` (announces `summarizeDiagnostics` output), `StepControls` +
`Stepper` class (`stepper.svelte.ts`; `stepperKeys` attachment: ←/→ step,
Home/End, Space play/pause), `PresetMenu` (grouped `Preset<T>`s with
citations), `CitationTag`, `CopyLinkButton`, `ToolPage`, `Disclosure`
(answers to slide questions), `Icon` (see its list for names). Tones
(`toneStyle`, `Tone`): `active`, `accept`, `reject`, `info`, `explored`,
`heuristic`, `muted`, `accent`, or a number for the categorical palette
`--tok-0…5`. `index.ts` exports the components, the stepper, the tone
helpers and the shared types (`Preset`, `Tone`, `HighlightToken`, `Size`).

## 6. Quality bar

- `npm run lint`, `npm run check`, `npm test`, `npm run build` all pass (CI
  runs them on every pull request).
- Engine: unit tests for every exported function, including golden tests that
  reproduce the slide artifacts exactly. Logic in components lives in pure
  `.ts` modules with tests; a fixed bug gets a failing test first.
- UI: works at 360 px wide and on desktop, in light and dark themes, with
  keyboard only. No console errors or warnings.
- Prerendering: every route must prerender (no `window`/`document`/
  `localStorage` access at module top level; read the URL hash in
  `onMount`/`$effect`).
- URL state: "Copy link" reproduces the view, reloading restores it, and
  hashes that fail `validate` (garbage, old shapes) are ignored without
  errors.
- Heavy computation never freezes the page: 8-puzzle solvers run in a Web
  Worker (`eight-puzzle/solver.worker.ts`); every other search runs under a
  node budget (`maxExpansions`/`maxNodes`), and typed input is capped
  (`MAX_STATES`, `MAX_EDGES`, `MAX_GRID_SIDE`). A run is recomputed when its
  inputs change, not per step.
