/**
 * Runs every strategy on one graph problem and collects what the comparison
 * table shows: the expansion order, the path and its cost, whether that cost
 * is the cheapest (against the true optimum from `shortestPath`), the node
 * counts, and how the run ended.
 */
import { graphProblem, shortestPath, type GraphProblemSpec } from '$lib/theory/graphs';
import {
	DEFAULT_IDS_MAX_LIMIT,
	search,
	usesHeuristic,
	type RepeatMode,
	type SearchResult,
	type StrategyId
} from '$lib/theory/search';

/** The strategies compared, in lecture order (Informed Search, slide 42, plus weighted A*). */
export const COMPARED_STRATEGIES = [
	'bfs',
	'dfs',
	'ids',
	'ucs',
	'greedy',
	'astar',
	'wastar'
] as const satisfies readonly StrategyId[];

export type ComparedStrategy = (typeof COMPARED_STRATEGIES)[number];

/**
 * - `found`: a solution was returned.
 * - `none`: the frontier emptied without a goal (no solution).
 * - `limit`: the expansion limit or the node limit stopped the run.
 * - `cutoff`: IDS reached its largest depth limit with nodes still cut off.
 */
export type RunOutcome = 'found' | 'none' | 'limit' | 'cutoff';

export interface CompareSettings {
	mode: RepeatMode;
	/** α for weighted A*. */
	alpha: number;
	/** Nodes taken off the frontier before a run stops. */
	limit: number;
	/** Nodes generated before a run stops (default `NODE_LIMIT`). */
	maxNodes?: number;
	/** Largest depth limit IDS tries (default 50). */
	idsMaxDepth?: number;
}

/** Nodes generated before any one run stops, so tree searches on loops stay bounded. */
export const NODE_LIMIT = 50_000;

/** Tolerance for comparing path costs. */
const EPS = 1e-9;

export interface ComparisonRow {
	strategy: ComparedStrategy;
	outcome: RunOutcome;
	/** Labels in the order they were taken off the frontier, goal included (all IDS iterations). */
	order: readonly string[];
	/** IDS: the order split by depth limit (limits 0, 1, 2, …); null for other strategies. */
	iterations: readonly (readonly string[])[] | null;
	/** States on the returned path, or null. */
	path: readonly string[] | null;
	/** Path cost of the returned solution, or null. */
	cost: number | null;
	/** Whether the returned path is a cheapest one; null without a solution or without any path. */
	cheapest: boolean | null;
	/** Nodes taken off the frontier, including the goal. */
	popped: number;
	expanded: number;
	generated: number;
	maxFrontier: number;
	/** Explored-set size at the end (graph search). */
	explored: number;
	/** IDS: the depth limit of the last iteration run. */
	depthLimit: number | null;
}

export interface Comparison {
	rows: ComparisonRow[];
	/** Cost of a cheapest path, or null when no goal is reachable. */
	optimalCost: number | null;
	/** States on that cheapest path. */
	optimalPath: readonly string[] | null;
	/** Lowest cost among the returned solutions, or null when no run found one. */
	bestCost: number | null;
	/** Fewest nodes expanded among the runs that found a solution, or null. */
	fewestExpanded: number | null;
	/** Whether the problem gives any h values (greedy and A* use h = 0 otherwise). */
	hasHeuristic: boolean;
}

/** How a finished search ended. */
export function outcomeOf(result: SearchResult): RunOutcome {
	if (result.solution) return 'found';
	if (result.failure === 'limit') return 'limit';
	if (result.failure === 'cutoff') return 'cutoff';
	return 'none';
}

/** Runs one strategy on the problem with the comparison's settings. */
export function runStrategy(
	spec: GraphProblemSpec,
	strategy: ComparedStrategy,
	settings: CompareSettings
): SearchResult {
	return search(graphProblem(spec), {
		strategy,
		mode: settings.mode,
		weight: settings.alpha,
		depthLimit: strategy === 'ids' ? (settings.idsMaxDepth ?? DEFAULT_IDS_MAX_LIMIT) : undefined,
		maxExpansions: settings.limit,
		maxNodes: settings.maxNodes ?? NODE_LIMIT,
		record: 'summary'
	});
}

/** One table row from a search result; `optimal` is the cheapest path cost (null: no path). */
export function rowOf(
	strategy: ComparedStrategy,
	result: SearchResult,
	optimal: number | null
): ComparisonRow {
	const s = result.solution;
	const last = result.iterations.at(-1);
	return {
		strategy,
		outcome: outcomeOf(result),
		order: result.order,
		iterations: strategy === 'ids' ? result.iterations.map((it) => it.order) : null,
		path: s ? s.states : null,
		cost: s ? s.cost : null,
		cheapest: s && optimal !== null ? s.cost <= optimal + EPS : null,
		popped: result.stats.popped,
		expanded: result.stats.expanded,
		generated: result.stats.generated,
		maxFrontier: result.stats.maxFrontier,
		explored: result.stats.explored,
		depthLimit: strategy === 'ids' && last ? last.limit : null
	};
}

/** Runs BFS, DFS, IDS, UCS, greedy, A*, and weighted A* on one problem. */
export function compareStrategies(spec: GraphProblemSpec, settings: CompareSettings): Comparison {
	const best = shortestPath(spec);
	const optimal = best ? best.cost : null;
	const rows = COMPARED_STRATEGIES.map((s) => rowOf(s, runStrategy(spec, s, settings), optimal));
	const found = rows.filter((r) => r.outcome === 'found');
	return {
		rows,
		optimalCost: optimal,
		optimalPath: best ? best.states : null,
		bestCost: found.length ? Math.min(...found.map((r) => r.cost!)) : null,
		fewestExpanded: found.length ? Math.min(...found.map((r) => r.expanded)) : null,
		hasHeuristic: spec.h !== undefined && Object.keys(spec.h).length > 0
	};
}

/** Whether a row has the lowest solution cost in the comparison. */
export function isBestCost(c: Comparison, row: ComparisonRow): boolean {
	return row.cost !== null && c.bestCost !== null && row.cost <= c.bestCost + EPS;
}

/** Whether a row found a solution with the fewest nodes expanded in the comparison. */
export function isFewestExpanded(c: Comparison, row: ComparisonRow): boolean {
	return row.outcome === 'found' && row.expanded === c.fewestExpanded;
}

/** Whether a strategy reads h(n) (greedy, A*, weighted A*). */
export const isInformed = (s: ComparedStrategy): boolean => usesHeuristic(s);

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const OUTCOME_TEXT: Record<RunOutcome, string> = {
	found: 'Found',
	none: 'No solution',
	limit: 'Stopped at the limit',
	cutoff: 'Cut off'
};

/** "Found", "No solution", "Stopped at the limit", "Cut off". */
export const outcomeText = (o: RunOutcome): string => OUTCOME_TEXT[o];

/** A longer explanation of an outcome, for tooltips and screen readers. */
export function outcomeDetail(row: ComparisonRow, settings: CompareSettings): string {
	switch (row.outcome) {
		case 'found':
			return 'Returned a solution.';
		case 'none':
			return 'The frontier emptied without reaching a goal: no solution.';
		case 'cutoff':
			return `Every depth limit up to ${row.depthLimit ?? settings.idsMaxDepth ?? DEFAULT_IDS_MAX_LIMIT} cut nodes off without reaching a goal.`;
		case 'limit':
			return row.popped >= settings.limit
				? `Stopped after taking ${settings.limit.toLocaleString('en-US')} nodes off the frontier.`
				: `Stopped after generating ${(settings.maxNodes ?? NODE_LIMIT).toLocaleString('en-US')} nodes.`;
	}
}

/** An entry of an expansion order as written: a state, or the "|" between IDS iterations. */
export type OrderToken = { kind: 'state'; label: string } | { kind: 'limit' };

/**
 * The expansion order as the slides write it: states in order, IDS
 * iterations separated by "|" (A | A B C | A B D E C F G | …).
 */
export function orderTokens(row: Pick<ComparisonRow, 'order' | 'iterations'>): OrderToken[] {
	const groups = row.iterations ?? [row.order];
	const out: OrderToken[] = [];
	groups.forEach((group, i) => {
		if (i > 0) out.push({ kind: 'limit' });
		for (const label of group) out.push({ kind: 'state', label });
	});
	return out;
}

export interface OrderPreview {
	/** The tokens shown. */
	shown: readonly OrderToken[];
	/** How many states are left out. */
	hidden: number;
}

/** The tokens up to and including the `max`-th state, and how many states are left out. */
export function previewOrder(tokens: readonly OrderToken[], max: number): OrderPreview {
	const n = Math.max(0, Math.floor(max));
	const total = tokens.reduce((k, t) => k + (t.kind === 'state' ? 1 : 0), 0);
	if (total <= n) return { shown: tokens, hidden: 0 };
	let states = 0;
	let end = 0;
	while (end < tokens.length && states < n) {
		if (tokens[end].kind === 'state') states++;
		end++;
	}
	return { shown: tokens.slice(0, end), hidden: total - n };
}

/** "S, d, e, p" or "A | A, B, C | A, B, D, E, C, F, G" for screen readers and copying. */
export function orderText(tokens: readonly OrderToken[]): string {
	let out = '';
	tokens.forEach((t, i) => {
		if (t.kind === 'limit') out += ' |';
		else out += (i === 0 ? '' : tokens[i - 1].kind === 'limit' ? ' ' : ', ') + t.label;
	});
	return out;
}

/** "Arad → Sibiu → Fagaras → Bucharest". */
export const pathText = (states: readonly string[]): string => states.join(' → ');

/**
 * One sentence summing up a comparison for screen readers: the cheapest cost
 * found and which strategies found it, and which strategies found nothing.
 */
export function comparisonSummary(c: Comparison, name: (s: ComparedStrategy) => string): string {
	const list = (rows: ComparisonRow[]) => rows.map((r) => name(r.strategy)).join(', ');
	const parts: string[] = [];
	if (c.bestCost === null) parts.push('No strategy found a solution.');
	else {
		const best = c.rows.filter((r) => isBestCost(c, r));
		parts.push(`Lowest cost found: ${formatCost(c.bestCost)} (${list(best)}).`);
		const fewest = c.rows.filter((r) => isFewestExpanded(c, r));
		parts.push(`Fewest nodes expanded: ${c.fewestExpanded} (${list(fewest)}).`);
	}
	const failed = c.rows.filter((r) => r.outcome !== 'found');
	if (failed.length && c.bestCost !== null) parts.push(`No solution returned: ${list(failed)}.`);
	return parts.join(' ');
}

/** Integers as is, other costs with up to two decimals. */
export function formatCost(n: number): string {
	if (Number.isInteger(n)) return String(n);
	return String(Math.round(n * 100) / 100);
}

/** The cost gap to the cheapest path: "+4", "+0.5". */
export function costGap(cost: number, optimal: number): string {
	return `+${formatCost(cost - optimal)}`;
}
