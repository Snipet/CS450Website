/**
 * Search engine contracts. See docs/ARCHITECTURE.md §4.2.
 *
 * A problem is given the way the lectures define one (Solving Problems by
 * Searching, slide 5): an initial state, a successor function that lists the
 * actions applicable in a state with their results and step costs, a goal
 * test, and optionally a heuristic h(n). States can be anything; `key` gives
 * each state a stable string identity.
 */

/** One result of the successor function: `action` leads to `state` at `cost` (≥ 0). */
export interface Successor<S> {
	action: string;
	state: S;
	cost: number;
}

export interface SearchProblem<S> {
	initial: S;
	/** Stable identity of a state, used for repeated-state checks. */
	key(state: S): string;
	/** Display name of a state (defaults to `key`). */
	label?(state: S): string;
	/**
	 * Successor function: every applicable action with the resulting state and
	 * step cost, in a fixed order. Strategies that break ties by order (BFS,
	 * DFS) expand successors in this order.
	 */
	successors(state: S): readonly Successor<S>[];
	isGoal(state: S): boolean;
	/** Heuristic h(n): estimated cost from the state to a goal. Required by greedy and A*. */
	h?(state: S): number;
}

/**
 * - `bfs` breadth-first (frontier is a FIFO queue)
 * - `dfs` depth-first (LIFO queue)
 * - `dls` depth-limited DFS (nodes at depth `depthLimit` are not expanded)
 * - `ids` iterative deepening (DLS with limits 0, 1, 2, … up to `depthLimit`)
 * - `ucs` uniform-cost (priority g(n))
 * - `greedy` greedy best-first (priority h(n))
 * - `astar` A* (priority f(n) = g(n) + h(n))
 * - `wastar` weighted A* (priority g(n) + α·h(n), α = `weight`)
 */
export type StrategyId = 'bfs' | 'dfs' | 'dls' | 'ids' | 'ucs' | 'greedy' | 'astar' | 'wastar';

/**
 * How repeated states are handled.
 * - `tree`: none; every child goes on the frontier (Tree Search Algorithm Outline).
 * - `path`: a child whose state is already on the path to it is dropped
 *   (the DFS fix, "avoid repeated states along path").
 * - `graph`: explored set plus frontier check (Handling repeated states).
 */
export type RepeatMode = 'tree' | 'path' | 'graph';

export interface SearchOptions {
	strategy: StrategyId;
	/** Default `tree`. */
	mode?: RepeatMode;
	/** `dls`: the depth limit (default 3). `ids`: the largest limit tried (default 50). */
	depthLimit?: number;
	/** `wastar`: the inflation factor α (default 2). */
	weight?: number;
	/**
	 * When the goal test runs. `expand` (default, as on the slides): when a node
	 * is taken off the frontier. `generate`: when a child is generated, before it
	 * is added (the root is tested when the frontier is initialized).
	 */
	goalTest?: 'expand' | 'generate';
	/** Stop after this many nodes are taken off the frontier (default 10 000). */
	maxExpansions?: number;
	/** Stop once this many nodes have been generated (default 200 000). */
	maxNodes?: number;
	/**
	 * `full` (default): record every step with frontier and explored snapshots,
	 * and create a node for every generated child, including dropped ones.
	 * `nodes`: record steps and every node but no snapshots (for large runs drawn
	 * cell by cell). `summary`: no steps; only nodes that entered the frontier.
	 */
	record?: 'full' | 'nodes' | 'summary';
}

/** What happened to a generated child. */
export type ChildOutcome =
	/** Added to the frontier. */
	| 'added'
	/** Added, replacing a frontier node for the same state with a higher path cost. */
	| 'replaced'
	/** Dropped: the state is in the explored set (graph mode). */
	| 'explored'
	/** Dropped: the state is already on the frontier at a path cost as low (graph mode). */
	| 'frontier'
	/** Dropped: the state is already on the path from the root (path mode). */
	| 'on-path'
	/** Passed the goal test at generation (`goalTest: 'generate'`). */
	| 'goal';

export interface SearchNode {
	/** Creation order; the root is the first node of each iteration. */
	id: number;
	parent: number | null;
	key: string;
	label: string;
	/** Action that produced the node from its parent (null for the root). */
	action: string | null;
	depth: number;
	/** Path cost g(n). */
	g: number;
	/** Heuristic h(n), when the problem has one. */
	h: number | null;
	/** Frontier priority: g for UCS, h for greedy, g + h for A*, g + α·h for weighted A*; null for BFS/DFS/DLS/IDS. */
	priority: number | null;
	/** IDS/DLS depth limit in force when the node was created (0 for other strategies). */
	iteration: number;
	/** Outcome when generated as a child; null for a root. */
	outcome: ChildOutcome | null;
	/** Index of the step that generated the node. */
	created: number;
	/** Index of the step that took it off the frontier, if any. */
	closed: number | null;
	/** Index of the step at which a cheaper node for the same state replaced it on the frontier. */
	replacedAt: number | null;
}

export type StepKind =
	/** The frontier is initialized with the root (again at the start of each IDS iteration). */
	| 'init'
	/** A node is taken off the frontier, fails the goal test, and is expanded. */
	| 'expand'
	/** A node at the depth limit is taken off the frontier, fails the goal test, and is not expanded. */
	| 'cutoff'
	/** A node passes the goal test; the search returns its path. */
	| 'goal'
	/** The search ends without a solution. */
	| 'fail';

export interface SearchStep {
	kind: StepKind;
	/** The node initialized, expanded, cut off, or found; null for `fail`. */
	node: number | null;
	/** Children generated by `expand`, in successor order (node ids). */
	children: number[];
	/** Depth limit of the IDS/DLS iteration (0 otherwise). */
	iteration: number;
	/** `fail` only: why the search stopped. */
	reason?: FailReason;
	/** Totals after this step (all iterations). */
	expanded: number;
	generated: number;
	/** Frontier after this step, in the order nodes would be taken off (`record: 'full'`). */
	frontier?: number[];
	/** Explored set after this step, in insertion order (graph mode, `record: 'full'`). */
	explored?: string[];
}

/**
 * - `exhausted`: the frontier emptied (no solution).
 * - `cutoff`: DLS emptied its frontier but cut off some nodes (IDS: the largest limit was reached).
 * - `limit`: `maxExpansions` or `maxNodes` stopped the search.
 */
export type FailReason = 'exhausted' | 'cutoff' | 'limit';

export interface Solution {
	/** The goal node. */
	node: number;
	/** Node ids from the root to the goal. */
	path: number[];
	actions: string[];
	/** State labels from the initial state to the goal. */
	states: string[];
	cost: number;
	depth: number;
}

export interface IterationInfo {
	limit: number;
	/** Index of the iteration's `init` step. */
	firstStep: number;
	/** Index of its last step. */
	lastStep: number;
	/** Labels taken off the frontier in this iteration, in order. */
	order: string[];
	found: boolean;
	/** Whether some node was cut off at the limit. */
	cutoff: boolean;
}

export interface SearchStats {
	/** Nodes taken off the frontier (goal-tested), including the goal node. */
	popped: number;
	/** Nodes expanded (their successors generated). */
	expanded: number;
	/** Nodes generated, including roots and dropped children. */
	generated: number;
	/** Largest frontier size reached. */
	maxFrontier: number;
	/** Explored-set size at the end (graph mode). */
	explored: number;
}

export interface SearchResult {
	strategy: StrategyId;
	mode: RepeatMode;
	/** Options with defaults filled in. */
	options: Required<SearchOptions>;
	nodes: SearchNode[];
	steps: SearchStep[];
	solution: Solution | null;
	/** Set when `solution` is null. */
	failure: FailReason | null;
	/**
	 * Labels of nodes in the order they were taken off the frontier, including the
	 * goal (all IDS iterations in sequence). This is the "expansion order" of the slides.
	 */
	order: string[];
	/** IDS and DLS iterations (one entry for DLS). */
	iterations: IterationInfo[];
	stats: SearchStats;
}
