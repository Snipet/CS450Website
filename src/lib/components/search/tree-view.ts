/**
 * What the search components show at a step of a trace: which nodes of the
 * current IDS iteration exist, the status of each (§3.2), the frontier in pop
 * order, and the explored set. Pure functions over a `SearchResult`.
 */
import {
	frontierAfter,
	frontierKind,
	pathTo,
	type SearchNode,
	type SearchResult
} from '$lib/theory/search';

/**
 * Status of a search-tree node at a step (docs/ARCHITECTURE.md §3.2):
 * - `current`: the node of the step (taken off the frontier and expanded or cut off)
 * - `goal`: a node that passed the goal test (the search returns its path)
 * - `frontier`: on the frontier
 * - `expanded`: taken off the frontier and expanded
 * - `cutoff`: taken off the frontier at the depth limit and not expanded
 * - `dropped`: generated but not added (repeated state)
 * - `replaced`: removed from the frontier by a cheaper node for the same state
 * - `generated`: none of the above (e.g. a node left over after the search stopped)
 */
export type TreeNodeStatus =
	'current' | 'goal' | 'frontier' | 'expanded' | 'cutoff' | 'dropped' | 'replaced' | 'generated';

/** Clamps a step index into the trace (0 for an empty trace). */
export function clampStep(result: SearchResult, step: number): number {
	const n = result.steps.length;
	if (n === 0 || !Number.isFinite(step)) return 0;
	return Math.max(0, Math.min(Math.trunc(step), n - 1));
}

/** IDS/DLS iteration (depth limit) in force at a step; 0 for other strategies. */
export function iterationAt(result: SearchResult, step: number): number {
	return result.steps[clampStep(result, step)]?.iteration ?? 0;
}

/**
 * Nodes of one iteration in creation order, capped at `maxNodes` (the first
 * ones by id, so every kept node's parent is kept too). `total` counts them all.
 */
export function iterationNodes(
	result: SearchResult,
	iteration: number,
	maxNodes = Infinity
): { nodes: SearchNode[]; total: number } {
	const nodes: SearchNode[] = [];
	let total = 0;
	for (const n of result.nodes) {
		if (n.iteration !== iteration) continue;
		total++;
		if (nodes.length < maxNodes) nodes.push(n);
	}
	return { nodes, total };
}

/**
 * Frontier after a step, in the order nodes would be taken off. Uses the
 * recorded snapshot; for traces recorded without snapshots (`record: 'nodes'`)
 * the order is rebuilt from creation order, which is exact: FIFO by id, LIFO
 * newest expansion first and siblings in successor order, priority queues by
 * priority with ties by id.
 */
export function frontierOrder(result: SearchResult, step: number): number[] {
	const s = result.steps[step];
	if (!s) return [];
	if (s.frontier) return s.frontier;
	const ids = [...frontierAfter(result, step)];
	const nodes = result.nodes;
	switch (frontierKind(result.strategy)) {
		case 'fifo':
			return ids.sort((a, b) => a - b);
		case 'lifo':
			return ids.sort((a, b) => nodes[b].created - nodes[a].created || a - b);
		default:
			return ids.sort((a, b) => (nodes[a].priority ?? 0) - (nodes[b].priority ?? 0) || a - b);
	}
}

/** Explored set after a step (state keys in insertion order); empty unless graph search. */
export function exploredAfter(result: SearchResult, step: number): string[] {
	const s = result.steps[step];
	if (!s || result.mode !== 'graph') return [];
	if (s.explored) return s.explored;
	const out: string[] = [];
	const seen = new Set<string>();
	const closed = result.nodes
		.filter((n) => n.iteration === s.iteration && n.closed !== null && n.closed <= step)
		.filter((n) => result.steps[n.closed!].kind === 'expand')
		.sort((a, b) => a.closed! - b.closed!);
	for (const n of closed) {
		if (seen.has(n.key)) continue;
		seen.add(n.key);
		out.push(n.key);
	}
	return out;
}

/** Display label of each state key (the first node's label). */
export function labelsByKey(result: SearchResult): Map<string, string> {
	const m = new Map<string, string>();
	for (const n of result.nodes) if (!m.has(n.key)) m.set(n.key, n.label);
	return m;
}

/** Node ids of the solution path when `step` is the goal step, else empty. */
export function solutionPathAt(result: SearchResult, step: number): Set<number> {
	const s = result.steps[step];
	if (!s || s.kind !== 'goal' || s.node === null) return new Set();
	return new Set(pathTo(result.nodes, s.node));
}

/** The node of the step (initialized, expanded, cut off, or found); null for `fail`. */
export function currentNode(result: SearchResult, step: number): number | null {
	const s = result.steps[step];
	if (!s || s.kind === 'init' || s.kind === 'fail') return null;
	return s.node;
}

/**
 * Status of every node of the step's iteration that exists at the step
 * (created at or before it). Nodes created later are absent from the map.
 */
export function statusesAt(
	result: SearchResult,
	step: number,
	nodes: readonly SearchNode[] = iterationNodes(result, iterationAt(result, step)).nodes
): Map<number, TreeNodeStatus> {
	const out = new Map<number, TreeNodeStatus>();
	const s = result.steps[step];
	if (!s) return out;
	const frontier = new Set(frontierOrder(result, step));
	const current = currentNode(result, step);
	for (const n of nodes) {
		if (n.created > step) continue;
		out.set(n.id, statusOf(result, n, step, frontier, current));
	}
	return out;
}

function statusOf(
	result: SearchResult,
	n: SearchNode,
	step: number,
	frontier: ReadonlySet<number>,
	current: number | null
): TreeNodeStatus {
	if (n.outcome === 'goal') return 'goal';
	if (n.closed !== null && n.closed <= step) {
		const kind = result.steps[n.closed].kind;
		if (kind === 'goal') return 'goal';
		if (n.id === current) return 'current';
		return kind === 'cutoff' ? 'cutoff' : 'expanded';
	}
	if (n.replacedAt !== null && n.replacedAt <= step) return 'replaced';
	if (n.outcome === 'explored' || n.outcome === 'frontier' || n.outcome === 'on-path')
		return 'dropped';
	if (frontier.has(n.id)) return 'frontier';
	return 'generated';
}

/** How many nodes of each status there are (for legends and summaries). */
export function countStatuses(
	statuses: ReadonlyMap<number, TreeNodeStatus>
): Partial<Record<TreeNodeStatus, number>> {
	const counts: Partial<Record<TreeNodeStatus, number>> = {};
	for (const s of statuses.values()) counts[s] = (counts[s] ?? 0) + 1;
	return counts;
}

/**
 * State-graph highlight for a step of a search on a graph (§5.3): the current
 * state, states on the frontier, states expanded so far (graph search: the
 * explored set), children dropped at this step, and the solution path at the
 * goal step. Keys are the state keys (graph node names for graph problems).
 */
export function graphHighlightAt(
	result: SearchResult,
	step: number
): {
	current?: string;
	frontier: string[];
	explored: string[];
	path: string[];
	dropped: string[];
} {
	const s = result.steps[step];
	if (!s) return { frontier: [], explored: [], path: [], dropped: [] };
	const nodes = result.nodes;
	const cur = currentNode(result, step);
	const frontier = [...new Set(frontierOrder(result, step).map((id) => nodes[id].key))];
	let explored: string[];
	if (result.mode === 'graph') explored = exploredAfter(result, step);
	else {
		const seen = new Set<string>();
		explored = [];
		for (const n of nodes) {
			if (n.iteration !== s.iteration || n.created > step) continue;
			if (n.closed === null || n.closed > step || result.steps[n.closed].kind !== 'expand')
				continue;
			if (!seen.has(n.key)) {
				seen.add(n.key);
				explored.push(n.key);
			}
		}
	}
	const dropped =
		s.kind === 'expand'
			? s.children
					.map((id) => nodes[id])
					.filter(
						(c) => c.outcome === 'explored' || c.outcome === 'frontier' || c.outcome === 'on-path'
					)
					.map((c) => c.key)
			: [];
	const path =
		s.kind === 'goal' && s.node !== null ? pathTo(nodes, s.node).map((id) => nodes[id].key) : [];
	return {
		current: cur === null ? undefined : nodes[cur].key,
		frontier,
		explored,
		path,
		dropped: [...new Set(dropped)]
	};
}
