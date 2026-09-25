/**
 * What the search tool shows besides the shared search components: the run
 * itself, the expansion order written like the slides with the part up to the
 * current step, the IDS iterations, the problem summary, and whether the
 * solution is a cheapest path.
 */
import { defaultAnnotation, formatNumber, type Annotation } from '$lib/components/search/describe';
import { graphProblem, shortestPath, type GraphProblemSpec } from '$lib/theory/graphs';
import {
	search,
	usesHeuristic,
	type SearchOptions,
	type SearchResult,
	type StrategyId
} from '$lib/theory/search';
import { NODE_LIMIT, type AnnotationChoice, type SearchScenario } from './state';

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

type RunSettings = Pick<
	SearchScenario,
	'strategy' | 'mode' | 'goalTest' | 'depthLimit' | 'weight' | 'maxExpansions'
>;

/**
 * Engine options for the tool's settings. Steps are recorded without
 * frontier snapshots (`record: 'nodes'`): the views rebuild the frontier of
 * the shown step, so long tree searches stay small in memory.
 */
export function searchOptions(s: RunSettings): SearchOptions {
	const limited = s.strategy === 'dls' || s.strategy === 'ids';
	return {
		strategy: s.strategy,
		mode: s.mode,
		goalTest: s.goalTest,
		...(limited ? { depthLimit: s.depthLimit } : {}),
		...(s.strategy === 'wastar' ? { weight: s.weight } : {}),
		maxExpansions: s.maxExpansions,
		maxNodes: NODE_LIMIT,
		record: 'nodes'
	};
}

/** Runs the search the tool's settings describe on a graph problem. */
export function runSearch(
	spec: GraphProblemSpec,
	s: RunSettings & Pick<SearchScenario, 'order'>
): SearchResult {
	return search(graphProblem(spec, { order: s.order }), searchOptions(s));
}

/** The annotation drawn under tree nodes: `auto` is what the slides show for the strategy. */
export function resolveAnnotation(choice: AnnotationChoice, strategy: StrategyId): Annotation {
	return choice === 'auto' ? defaultAnnotation(strategy) : choice;
}

/** Short names of the annotations, as the options list them. */
export const ANNOTATION_NAMES: Record<Annotation, string> = {
	none: 'None',
	g: 'g(n)',
	h: 'h(n)',
	f: 'f(n)',
	fgh: 'f = g + h'
};

// ---------------------------------------------------------------------------
// Expansion order
// ---------------------------------------------------------------------------

/**
 * `pops[i]`: how many nodes have been taken off the frontier after step `i`
 * (steps that expand or cut off a node, and the goal step when the goal node
 * was taken off the frontier). `result.order` lists those nodes in order.
 */
export function popCounts(result: SearchResult): number[] {
	const out: number[] = [];
	let count = 0;
	result.steps.forEach((step, i) => {
		if (step.kind === 'expand' || step.kind === 'cutoff') count++;
		else if (step.kind === 'goal' && step.node !== null && result.nodes[step.node].closed === i)
			count++;
		out.push(count);
	});
	return out;
}

export interface OrderProgress {
	/** Entries of `result.order` taken off the frontier so far. */
	taken: number;
	/** Index into `result.order` of the node taken off at this step, or null. */
	current: number | null;
}

/** How far into the expansion order step `step` is. */
export function orderProgress(pops: readonly number[], step: number): OrderProgress {
	if (!pops.length) return { taken: 0, current: null };
	const i = Math.max(0, Math.min(step, pops.length - 1));
	const taken = pops[i];
	const before = i > 0 ? pops[i - 1] : 0;
	return { taken, current: taken > before ? taken - 1 : null };
}

export interface IterationRow {
	/** The depth limit. */
	limit: number;
	/** States taken off the frontier in this iteration. */
	order: readonly string[];
	/** How many of them have been taken off by the shown step. */
	taken: number;
	/** Index into `order` of the node taken off at the shown step, or null. */
	current: number | null;
	/** Before, at, or after the shown step. */
	status: 'done' | 'current' | 'later';
	/** How the iteration ended. */
	outcome: 'found' | 'cutoff' | 'exhausted' | 'limit';
}

/** The IDS/DLS iterations with their progress at step `step`. */
export function iterationRows(
	result: SearchResult,
	pops: readonly number[],
	step: number
): IterationRow[] {
	const last = result.iterations.length - 1;
	return result.iterations.map((it, k) => {
		const outcome: IterationRow['outcome'] = it.found
			? 'found'
			: k === last && result.failure === 'limit'
				? 'limit'
				: it.cutoff
					? 'cutoff'
					: 'exhausted';
		const base = { limit: it.limit, order: it.order, outcome };
		if (step > it.lastStep)
			return { ...base, taken: it.order.length, current: null, status: 'done' };
		if (step < it.firstStep) return { ...base, taken: 0, current: null, status: 'later' };
		const before = it.firstStep > 0 ? pops[it.firstStep - 1] : 0;
		const { taken, current } = orderProgress(pops, step);
		return {
			...base,
			taken: taken - before,
			current: current === null ? null : current - before,
			status: 'current'
		};
	});
}

// ---------------------------------------------------------------------------
// Problem and result
// ---------------------------------------------------------------------------

export interface ProblemFacts {
	start: string;
	goals: readonly string[];
	states: number;
	edges: number;
	directed: boolean;
	/** Number of states with an h value. */
	hCount: number;
	/** "Straight-line distance to Bucharest", or a generic description. */
	hText: string;
}

export function problemFacts(spec: GraphProblemSpec): ProblemFacts {
	const hCount = spec.h ? Object.keys(spec.h).length : 0;
	const label = spec.hLabel?.trim();
	const hText = label
		? label
		: hCount
			? `Given for ${hCount} of ${spec.graph.nodes.length} states`
			: 'None (h = 0 for every state)';
	return {
		start: spec.start,
		goals: spec.goals,
		states: spec.graph.nodes.length,
		edges: spec.graph.edges.length,
		directed: spec.graph.directed,
		hCount,
		hText
	};
}

export interface Optimality {
	/** The solution's cost, or null when there is none. */
	cost: number | null;
	/** A cheapest path from the start to a goal, or null when no goal is reachable. */
	best: { cost: number; states: string[] } | null;
	/** Whether the solution costs as little as the cheapest path. */
	cheapest: boolean | null;
	/** One plain sentence. */
	text: string;
}

const EPS = 1e-9;

/** Compares the solution's cost with the cheapest path (shortestPath). */
export function optimality(result: SearchResult, spec: GraphProblemSpec): Optimality {
	const best = shortestPath(spec);
	const sol = result.solution;
	const bestText = best ? `${best.states.join(' → ')} (cost ${formatNumber(best.cost)})` : '';
	if (!sol) {
		return {
			cost: null,
			best,
			cheapest: null,
			text: best
				? `The cheapest path is ${bestText}.`
				: `No goal state can be reached from ${spec.start}.`
		};
	}
	const cheapest = best !== null && sol.cost <= best.cost + EPS;
	return {
		cost: sol.cost,
		best,
		cheapest,
		text: cheapest
			? `This is a cheapest path (cost ${formatNumber(sol.cost)}).`
			: `This is not a cheapest path: ${bestText} costs less.`
	};
}

/** Whether the run was stopped by the expansion limit or the node limit (not by the search). */
export function stoppedBy(result: SearchResult): 'expansions' | 'nodes' | null {
	if (result.failure !== 'limit') return null;
	return result.stats.popped >= result.options.maxExpansions ? 'expansions' : 'nodes';
}

/** Whether the heuristic is read by the strategy but missing from the problem. */
export const missingHeuristic = (strategy: StrategyId, spec: GraphProblemSpec): boolean =>
	usesHeuristic(strategy) && !(spec.h && Object.keys(spec.h).length);
