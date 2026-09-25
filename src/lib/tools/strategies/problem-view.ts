/**
 * Facts about the problem the strategies run on: its size, start and goals,
 * the heuristic, b (the most successors of any state), and the cheapest
 * path with its depth d.
 */
import { adjacency, shortestPath, type GraphProblemSpec } from '$lib/theory/graphs';
import { strategyShort } from '$lib/components/search/describe';
import { formatCost, type Comparison, type ComparedStrategy } from './compare';

export interface ProblemFacts {
	states: number;
	edges: number;
	directed: boolean;
	start: string;
	goals: readonly string[];
	/** States with an h value. */
	hCount: number;
	/** Most successors of any state. */
	branching: number;
	/** Cheapest path and its cost, or null when no goal is reachable. */
	cheapest: { cost: number; states: readonly string[]; depth: number } | null;
}

export function problemFacts(spec: GraphProblemSpec): ProblemFacts {
	const adj = adjacency(spec.graph);
	let branching = 0;
	for (const list of adj.values()) branching = Math.max(branching, list.length);
	const best = shortestPath(spec);
	return {
		states: spec.graph.nodes.length,
		edges: spec.graph.edges.length,
		directed: spec.graph.directed,
		start: spec.start,
		goals: spec.goals,
		hCount: spec.h ? Object.keys(spec.h).length : 0,
		branching,
		cheapest: best ? { cost: best.cost, states: best.states, depth: best.states.length - 1 } : null
	};
}

/** Which path the problem drawing highlights: the cheapest one or a strategy's. */
export type PathChoice = 'cheapest' | ComparedStrategy;

export interface PathOption {
	value: PathChoice;
	label: string;
	/** States on the path; null when the strategy returned none. */
	states: readonly string[] | null;
}

/** The cheapest path, then each strategy's path (or that it found none). */
export function pathOptions(c: Comparison): PathOption[] {
	const out: PathOption[] = [
		{
			value: 'cheapest',
			label:
				c.optimalCost === null
					? 'Cheapest path (none)'
					: `Cheapest path (cost ${formatCost(c.optimalCost)})`,
			states: c.optimalPath
		}
	];
	for (const r of c.rows) {
		out.push({
			value: r.strategy,
			label:
				r.cost === null
					? `${strategyShort(r.strategy)} (no path)`
					: `${strategyShort(r.strategy)} (cost ${formatCost(r.cost)})`,
			states: r.path
		});
	}
	return out;
}
