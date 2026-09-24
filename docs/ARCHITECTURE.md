# Architecture and conventions

This document is the contract every part of the site is built against. Read it
before adding a tool or touching the engine.

## 1. Principles

1. **Everything runs in the browser.** The site is prerendered static HTML plus
   client-side Svelte 5. No backend, no network calls, no analytics.
2. **Engine and UI are separate.** Algorithms and data live in
   `src/lib/theory/` as pure, framework-free TypeScript with unit tests. Svelte
   components only render and orchestrate.
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
  app.css                     design tokens (light/dark), base element styles
  lib/
    site.ts                   site name, nav links, toolHref()
    lectures.ts               deck catalog + formatCitation()
    theory/                   pure TS engine (no Svelte, no DOM)
      diagnostics.ts          Diagnostic, Span
      search/                 SearchProblem, strategies, frontier, step trace
      graphs/                 weighted graphs, lecture graphs, text format, heuristic analysis, layout
      puzzle/                 8-puzzle boards, moves, h1/h2, solvability
      grid/                   grid path finding problems
      agents/                 vacuum world simulation, task environments (PEAS, environment types)
    components/
      layout/                 header, footer, theme toggle, course map
      ui/                     generic UI kit (buttons, panels, tabs, inputs, stepper…)
      search/                 StateGraph, SearchTree, FrontierView, step descriptions
    tools/
      types.ts                ToolMeta, Topic
      registry.ts             glob-imports catalog/*.ts; topics
      links.ts                cross-tool links (LinkStates, toolLink)
      catalog/<slug>.ts       one file per tool: `export const tool: ToolMeta`
      <slug>/                 tool-specific components, presets, logic
    url-state.ts              share-link state in the URL hash
  routes/
    +page.svelte              home: course map and tools grouped by topic
    notation/+page.svelte     notation and conventions reference
    lectures/+page.svelte     lecture decks with the tools that cite them
    <slug>/+page.svelte       one route per tool
docs/
  ARCHITECTURE.md             this file
  DEPLOYMENT.md               Cloudflare Pages (Git integration)
```

A tool owns `src/routes/<slug>/`, `src/lib/tools/catalog/<slug>.ts`, and (if
needed) `src/lib/tools/<slug>/` for tool-specific components, presets and
logic. Tools never edit each other's folders. Anything two tools need goes into
`theory/` or `components/`.

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

Symbols (Uninformed Search slides 30, 45; Informed Search slides 5, 16, 25, 38):
`b` maximum branching factor, `d` depth of the optimal solution, `m` maximum
length of any path in the state space, `C*` cost of the optimal solution, `ε`
a positive lower bound on step costs, `g(n)` cost of the path from the start
state to node n, `h(n)` heuristic estimate of the cost from n to a goal,
`h*(n)` true cost from n to the goal, `f(n) = g(n) + h(n)`, `α` the weighted A*
inflation factor (`f(n) = g(n) + α·h(n)`), `h1`/`h2` misplaced tiles /
Manhattan distance (8-puzzle). Complexity uses `O(b^d)` with superscripts in
the UI (`O(bᵈ)`, `O(bᵐ)`, `O(bd)`, `O(bm)`, `O(b^(C*/ε))`).

Strategy names and short forms: breadth-first search (BFS), depth-first search
(DFS), depth-limited search (DLS, used by IDS), iterative deepening search
(IDS), uniform-cost search (UCS), greedy best-first search (Greedy), A* search
(A\*), weighted A* search. Queues: "FIFO queue" (BFS), "LIFO queue" (DFS),
"priority queue ordered by g(n)" / "h(n)" / "f(n)".

### 3.2 Search trees and state-space diagrams

- Search tree: root at the top, children left to right in successor order.
  Each node shows its state name. Under it, per strategy, as on the slides:
  UCS `g` (e.g. `140`), greedy `h` (`253`), A\* `f=g+h` (`393=140+253`),
  weighted A\* `f` with the weighted sum, BFS/DFS/IDS nothing.
- Node status colors: being expanded `--active`; on the frontier `--info`
  (outlined); expanded `--explored` (filled soft); dropped as a repeated state
  or cut off at the depth limit `--reject`, drawn dashed with a cross (the
  slides cross out repeated states); goal node and solution path `--accept`
  (the goal gets a double outline).
- State-space graph: circles for states (squares with outside labels for the
  Romania map, as drawn on the slide), costs on edges, arrows on directed
  edges. The start state has an arrow in from nowhere labelled `start`; goal
  states have a double outline. The same status colors apply to states
  (current, frontier, explored, solution path).

### 3.3 Step descriptions

One sentence per step, in the lecture's words: "Initialize the frontier with
Arad." / "Take Sibiu off the frontier (f = 393). Not a goal; expand it: Arad,
Fagaras, Oradea, Rimnicu Vilcea." / "Take Bucharest off the frontier. It
contains the goal state: return the solution Arad → Sibiu → Rimnicu Vilcea →
Pitesti → Bucharest (cost 418)." Repeated states: "Arad is in the explored
set; not added." Depth limit: "E is at the depth limit 1; not expanded."

### 3.4 Defaults where the decks are silent

- **Successor order**: alphabetical by state name ("name order":
  case-insensitive, digit runs by value). This reproduces every slide trace:
  BFS `S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G`, DFS
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
  children). IDS stops at the first limit with a solution, or when an
  iteration cuts nothing off (no solution), or at the largest limit.
- **Counts**: _generated_ counts every node created, including the root and
  children that were not added; _expanded_ counts nodes whose successors were
  generated; the slides' "time" is nodes generated, "space" is the largest
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

- **PEAS**: Performance measure, Environment, Actuators, Sensors (slide 6).
- Environment types (slides 9–16, review on slide 20), in this order and with
  these value names: Observable — Fully / Partially; Deterministic —
  Deterministic / Stochastic / Strategic; Episodic — Episodic / Sequential;
  Static — Static / Dynamic / Semidynamic; Discrete — Discrete / Continuous;
  Agents — Single / Multi; Known — Known / Unknown. The slide 17 table uses
  the short values ("Fully", "Multi").
- Expected utility: `EU(action) = Σ_outcomes P(outcome | action) U(outcome)`
  (slide 4).

### 3.6 8-puzzle

- Boards are written row by row; the blank is shown as an empty tile (text:
  `_` or `0`). Slide start state `7 2 4 / 5 _ 6 / 8 3 1`, goal
  `_ 1 2 / 3 4 5 / 6 7 8` (Informed Search, slide 32). In URL state a board is
  nine digits with `0` for the blank: `724506831`.
- Actions move the blank: `Left`, `Right`, `Up`, `Down` (successor order),
  step cost 1 (Solving Problems by Searching, slide 10).
- `h1(n)` = number of misplaced tiles (the blank does not count); `h2(n)` =
  total Manhattan distance of the tiles. Slide values for the start state:
  `h1 = 8`, `h2 = 3+1+2+2+2+3+3+2 = 18` (tiles 1–8 in order).
- 181,440 reachable states (9!/2); a board is reachable from the goal iff the
  inversion parities match.

### 3.7 Grid path finding

Cells `(column, row)` from the top-left; walls block; 4-connected (step cost 1)
or 8-connected (diagonal cost √2, no corner cutting past walls). Heuristics:
Manhattan, Euclidean, octile, Chebyshev, zero; weighted A\* multiplies h by α
(Informed Search, slides 23–24, 38–40). Successor order is clockwise from up
(`Up, Right, Down, Left`; with diagonals `Up, Up-Right, Right, …, Up-Left`).

### 3.8 Citations

Presets cite the deck and slide with `formatCitation({ deck: 'uninformed', slide: 4 })`
→ "Uninformed Search · slide 4". Deck ids: `intro`, `agents`, `search`,
`uninformed`, `informed` (see `lectures.ts`). Never name the instructor or
university, and never link to the slide files.

## 4. Engine API (src/lib/theory)

All functions are pure; inputs are never mutated. Errors in user input are
reported as `Diagnostic`s, never thrown. Programming errors may throw.

```ts
// diagnostics.ts
interface Span {
	start: number;
	end: number;
	source: string | null;
}
interface Diagnostic {
	severity: 'error' | 'warning' | 'info';
	message: string;
	span?: Span;
}
function hasErrors(ds): boolean;
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
	record?: 'full' | 'nodes' | 'summary';
}
function search<S>(problem: SearchProblem<S>, options: SearchOptions): SearchResult;
// SearchResult: { strategy, mode, options, nodes: SearchNode[], steps: SearchStep[],
//   solution: Solution | null, failure: 'exhausted' | 'cutoff' | 'limit' | null,
//   order: string[] /* expansion order incl. goal */, iterations: IterationInfo[], stats }
// SearchNode: { id, parent, key, label, action, depth, g, h, priority, iteration,
//   outcome: 'added' | 'replaced' | 'explored' | 'frontier' | 'on-path' | 'goal' | null,
//   created, closed, replacedAt }   (created/closed/replacedAt are step indices)
// SearchStep: { kind: 'init' | 'expand' | 'cutoff' | 'goal' | 'fail', node, children,
//   iteration, reason?, expanded, generated, frontier? /* pop order */, explored? }
// Solution: { node, path /* node ids */, actions, states /* labels */, cost, depth }
// stats: { popped, expanded, generated, maxFrontier, explored }
function pathTo(nodes, id): number[];
function frontierAfter(result, stepIndex): number[]; // for record 'nodes' (unordered)
function frontierKind(s): 'fifo' | 'lifo' | 'priority';
function usesPriority(s): boolean;
function usesHeuristic(s): boolean;
function priorityOf(s, g, h, weight?): number | null;
function normalizeOptions(o): Required<SearchOptions>;
function createFrontier(kind): Frontier; // push, pop, remove, size, snapshot
```

`record: 'full'` stores a frontier snapshot (pop order) and explored set per
step and a node for every generated child; use it for problems with up to a
few thousand steps. `'nodes'` drops the snapshots (grids). `'summary'` keeps no
steps and only nodes that entered the frontier (8-puzzle solvers).

Golden tests (search.spec.ts) reproduce the slide traces listed in §3.4, the
greedy and A\* Romania trees (Informed Search slides 8–11, 17–22, including
every `f=g+h` label), the IDS binary tree (Uninformed Search slides 34–37:
`A | ABC | ABDECFG | ABDHIEJKCFLM`), and "A\* gone wrong" (slides 27–29: tree
search cost 5, graph search cost 6).

### 4.2 Graphs (`theory/graphs/`)

```ts
interface GraphNode { id: string; x?: number; y?: number }   // id = display name
interface GraphEdge { from: string; to: string; cost: number }
interface WeightedGraph { directed: boolean; nodes: GraphNode[]; edges: GraphEdge[] }
interface GraphProblemSpec {
	graph: WeightedGraph; start: string; goals: string[];
	h?: Record<string, number>; hLabel?: string;
}
type SuccessorOrder = 'alphabetical' | 'listed';
function compareNames(x, y): number;                  // name order (§3.4)
function adjacency(graph, order?): Map<string, Neighbor[]>;
function graphProblem(spec, { order? }): SearchProblem<string>;
function layoutGraph(graph): Map<string, Point>;       // keeps x/y, lays out the rest
function boundsOf(points): { minX, minY, maxX, maxY };
// builtins.ts: ROMANIA, SLD_BUCHAREST, SLD_FAGARAS, ROMANIA_PROBLEM, ROMANIA_IASI_FAGARAS,
//   TINY_GRAPH, TINY_PROBLEM, ASTAR_WRONG_GRAPH, ASTAR_WRONG_PROBLEM,
//   GREEDY_TRAP_GRAPH, GREEDY_TRAP_PROBLEM, BINARY_TREE, BINARY_TREE_PROBLEM

// text.ts — the graph text format (§4.2.1)
function parseGraphText(text: string): { spec: GraphProblemSpec | null; diagnostics: Diagnostic[] };
function formatGraphText(spec: GraphProblemSpec, opts?: { positions?: boolean }): string;
function highlightGraphText(text: string): HighlightToken[];   // hl-* classes for CodeEditor

// analysis.ts
function trueCosts(spec): Map<string, number>;   // h*(n): cheapest cost from n to a goal (Infinity if none)
function shortestPath(spec): { cost: number; states: string[] } | null;
interface HeuristicReport {
	admissible: boolean; consistent: boolean; goalsZero: boolean;
	nodes: { id: string; h: number; hStar: number; admissible: boolean }[];
	edges: { from: string; to: string; cost: number; hFrom: number; hTo: number; consistent: boolean }[];
	// consistency is checked per direction: h(n) ≤ c(n, n') + h(n'); undirected edges both ways
}
function checkHeuristic(spec, h?: Record<string, number>): HeuristicReport;
function compareHeuristics(spec, h1, h2): { dominates: boolean /* h2 ≥ h1 everywhere */; equal: boolean; nodes: … };
function maxHeuristic(...hs: Record<string, number>[]): Record<string, number>;
```

#### 4.2.1 Graph text format

One directive or edge per line; `#` starts a comment. Names are words
(letters, digits, `_`, `'`, `.`) or double-quoted strings (`"Rimnicu Vilcea"`).

```
undirected                 # or: directed. Default: undirected, unless some edge uses ->
start: Arad
goal: Bucharest            # several goals: "goal: G1, G2" (also "goals:")
Arad - Sibiu 140           # an undirected edge with its cost (cost defaults to 1)
S -> d 3                   # a directed edge; the graph becomes directed
Arad Sibiu 140             # no arrow: the graph's direction
h: Arad=366, Sibiu=253     # heuristic values; several h: lines allowed
at: Arad 26 233            # a drawing position (optional)
node: Lonely               # a state with no edges
```

In a directed graph, `-` and arrowless edges add both directions; in a graph
declared `undirected`, `->` is an error. Costs must be finite and ≥ 0.
Diagnostics (with spans): unknown directive, bad cost, missing or unknown
start/goal, heuristic for an unknown state, negative h, duplicate edge (the
later one wins, warning), self-loop (info).

### 4.3 8-puzzle (`theory/puzzle/`)

```ts
type Board = string;   // nine digits row by row, '0' = blank
const SLIDE_START = '724506831', SLIDE_GOAL = '012345678';
type PuzzleAction = 'Left' | 'Right' | 'Up' | 'Down';   // blank moves, successor order
function parseBoard(text): { board: Board | null; diagnostics: Diagnostic[] };
function formatBoard(board, { blank?: string; rows?: 'slash' | 'lines' }): string;
function moves(board): { action: PuzzleAction; board: Board; tile: number }[];
function applyMove(board, action): Board | null;
function misplacedTiles(board, goal): number;         // h1
function manhattanDistance(board, goal): number;       // h2
function tileDistances(board, goal): { tile: number; distance: number }[]; // tiles 1–8
function inversions(board): number;
function isSolvable(start, goal): boolean;
function puzzleProblem(start, goal, h: 'h1' | 'h2' | 'max' | 'zero'): SearchProblem<Board>;
function scramble(goal, moves: number, seed: number): Board;   // random walk, reproducible
const REACHABLE_STATES = 181_440;
```

### 4.4 Grids (`theory/grid/`)

```ts
interface Grid { width: number; height: number; walls: boolean[]; start: number; goal: number }
// cell index = row * width + column
type GridHeuristic = 'manhattan' | 'euclidean' | 'octile' | 'chebyshev' | 'zero';
function gridProblem(grid, { diagonal?: boolean; heuristic?: GridHeuristic }): SearchProblem<number>;
function encodeGrid(grid): string;                 // compact text for URL state
function decodeGrid(text): { grid: Grid | null; diagnostics: Diagnostic[] };
function emptyGrid(width, height): Grid;
```

### 4.5 Agents (`theory/agents/`)

```ts
// vacuum.ts
type Square = 'A' | 'B'; type Status = 'Clean' | 'Dirty';
type VacuumAction = 'Left' | 'Right' | 'Suck' | 'NoOp';
interface VacuumWorld { location: Square; dirt: Record<Square, boolean> }
type Percept = [Square, Status];
function perceive(world): Percept;
function reflexVacuumAgent(percept): VacuumAction;    // the slide 3 program
function simulate(config): VacuumRun;                 // seeded, reproducible
function vacuumStateSpace(squares: number): WeightedGraph;   // n·2ⁿ states, actions Left/Right/Suck
// environments.ts
type Dimension = 'observable' | 'deterministic' | 'episodic' | 'static' | 'discrete' | 'agents' | 'known';
const DIMENSIONS; const ENVIRONMENT_EXAMPLES; const PEAS_EXAMPLES;
function courseMethods(profile): …   // rows of "Preview of the course" (slide 18) that apply
```

## 5. UI contracts

### 5.1 Tool pages

Every tool page renders inside `ToolPage` (`$lib/components/ui/ToolPage.svelte`)
with its `ToolMeta`, and keeps its user-editable state in the URL hash through
`$lib/url-state.ts` so the "Copy link" button reproduces the exact view:

```ts
let state = $state({ graph: '…', strategy: 'astar' }); // JSON-serializable
syncToHash(() => state, { onLoad: (v) => Object.assign(state, v), validate });
```

The hash is read on mount and on `hashchange`, and written (debounced, hash
only) when the state changes; an untouched page keeps a clean URL. One
`syncToHash` per page. Link to a tool with `toolHref(slug)` from `$lib/site`.

### 5.2 Cross-tool links

`$lib/tools/links.ts` lists the state each tool accepts in its URL hash
(`LinkStates`). Build a link with `toolLink('search', { graph })`; it returns
`null` when the target tool is not registered, so hide the link in that case
(prerendering fails on links to pages that do not exist). A tool's own saved
state must accept its `LinkStates` shape (extra fields are allowed).

### 5.3 Search components (`$lib/components/search/`)

- `StateGraph.svelte` — draws a `WeightedGraph` per §3.2 with `start`,
  `goals`, optional `heuristic` values under the nodes, and
  `highlight?: { current?, frontier?, explored?, path?, dropped? }` (state
  names; `path` lists states in order and highlights the edges between them).
  Nodes without positions are placed by `layoutGraph`. Props also include
  `nodeShape?: 'circle' | 'square'`, `showCosts?`, `onnodeclick?(id)`,
  `ariaLabel`, `height`. Zoom buttons and "fit"; scrolls rather than overflow
  the page.
- `SearchTree.svelte` — draws the search tree of a `SearchResult` up to a step
  (`result`, `step`), per §3.2: stable positions (the final tree is laid out
  once with `tree-layout.ts`), nodes created after `step` hidden, the current
  IDS iteration only, `annotation?: 'none' | 'g' | 'h' | 'f' | 'fgh'`.
- `FrontierView.svelte` — the frontier after a step in pop order, with
  priorities, the queue name (§3.1), and the explored set (graph search).
- `describe.ts` — `describeStep(result, index, opts)`: the sentence for a step
  (§3.3). Unit-tested.
- `tree-layout.ts` — pure tidy-tree layout: `layoutTree(nodes, rootId)`. Unit-tested.

### 5.4 UI kit (`$lib/components/ui/`)

`Button`, `IconButton`, `Toggle`, `SegmentedControl`, `Tabs`, `Panel`,
`Callout`, `Badge`, `Kbd`, `Select`, `NumberField`, `TextField`, `CodeEditor`
(monospace textarea with line numbers, highlighting, and diagnostic markers),
`ProblemStatus`, `StepControls` + `Stepper` class (`stepper.svelte.ts`),
`PresetMenu` (grouped presets with citations), `CitationTag`,
`CopyLinkButton`, `ToolPage`, `Disclosure` (answers to slide questions),
`Icon` (see its list for names). Tones (`toneStyle`, `Tone`): `active`,
`accept`, `reject`, `info`, `explored`, `heuristic`, `muted`, `accent`, or a
number for the categorical palette `--tok-0…5`.

## 6. Quality bar

- `npm run lint`, `npm run check`, `npm test`, `npm run build` all pass.
- Engine: unit tests for every exported function, including golden tests that
  reproduce the slide artifacts exactly.
- UI: works at 360 px wide and on desktop, in light and dark themes, with
  keyboard only. No console errors.
- Prerendering: every route must prerender (no `window` access at module top
  level; read the URL hash in `onMount`/`$effect`).
- Heavy computation (8-puzzle solvers) runs off the main thread or under a
  node budget so the page never freezes.
