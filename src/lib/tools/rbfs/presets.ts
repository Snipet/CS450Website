/**
 * Presets for the RBFS tool: lecture problems as graph text with drawing
 * positions (so the text in the URL round-trips). The Informed Search slides
 * only name RBFS (slide 4), so the presets cite the slides each problem comes
 * from; the Romania preset is Russell & Norvig's Figure 3.27.
 */
import type { NodeShape } from '$lib/components/search/graph-scene';
import type { Preset } from '$lib/components/ui/types';
import {
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	adjacency,
	formatGraphText,
	type GraphProblemSpec,
	type WeightedGraph
} from '$lib/theory/graphs';
import { DEFAULT_MAX_EXPANSIONS, type RbfsScenario } from './state';

/**
 * Fewest steps from each state to a goal when every edge may be taken either
 * way (breadth-first from the goals over the undirected graph). On a graph
 * whose step costs are all at least 1 this never overestimates the cheapest
 * cost to a goal: it solves a relaxed problem (Informed Search, slide 33).
 * States that cannot reach a goal even then get 0.
 */
export function undirectedSteps(
	graph: WeightedGraph,
	goals: readonly string[]
): Record<string, number> {
	const adj = adjacency({ ...graph, directed: false });
	const dist = new Map<string, number>();
	const queue: string[] = [];
	for (const g of goals) {
		if (!adj.has(g) || dist.has(g)) continue;
		dist.set(g, 0);
		queue.push(g);
	}
	for (let i = 0; i < queue.length; i++) {
		const u = queue[i];
		for (const { to } of adj.get(u)!) {
			if (dist.has(to)) continue;
			dist.set(to, dist.get(u)! + 1);
			queue.push(to);
		}
	}
	return Object.fromEntries(graph.nodes.map((n) => [n.id, dist.get(n.id) ?? 0]));
}

/** The tiny search problem with h = fewest steps to G, edges taken either way. */
export const TINY_WITH_STEPS: GraphProblemSpec = {
	...TINY_PROBLEM,
	h: undirectedSteps(TINY_PROBLEM.graph, TINY_PROBLEM.goals),
	hLabel: 'Fewest steps to G with edges taken either way'
};

function scenario(problem: GraphProblemSpec, shape: NodeShape): RbfsScenario {
	return {
		graph: formatGraphText(problem, { positions: true }),
		shape,
		maxExpansions: DEFAULT_MAX_EXPANSIONS
	};
}

export const RBFS_PRESETS: readonly Preset<RbfsScenario>[] = [
	{
		id: 'romania',
		label: 'Romania: Arad to Bucharest',
		description:
			'Straight-line distance to Bucharest, as in Russell & Norvig’s Figure 3.27: Rimnicu Vilcea is expanded with f_limit 415 and backs up 417, Fagaras backs up 450, then Rimnicu Vilcea is expanded again and Bucharest is reached through Pitesti (cost 418).',
		cite: { deck: 'informed', slide: 6 },
		value: scenario(ROMANIA_PROBLEM, 'square')
	},
	{
		id: 'tiny',
		label: 'Tiny search problem',
		description:
			'The directed graph of the uniform-cost example with h(n) = fewest steps from n to G when edges may be taken either way. Every step costs at least 1, so h never overestimates. The dead end a returns f = ∞.',
		cite: { deck: 'uninformed', slide: 41 },
		value: scenario(TINY_WITH_STEPS, 'circle')
	},
	{
		id: 'greedy-trap',
		label: 'Greedy trap',
		description:
			'Every step costs 1 and the long path’s states have h = 1. RBFS follows B1 and B2 until f = 4 exceeds the limit 3, backs 4 up to B1, and takes the short path S → T1 → T2 → G (cost 3).',
		cite: { deck: 'informed', slide: 15 },
		value: scenario(GREEDY_TRAP_PROBLEM, 'circle')
	},
	{
		id: 'iasi-fagaras',
		label: 'Iasi to Fagaras',
		description:
			'Straight-line distance to Fagaras measured on the map. Greedy tree search goes back and forth between Iasi and Neamt; RBFS returns Iasi → Vaslui → Urziceni → Bucharest → Fagaras (cost 530) after 40 expansions, 27 of them repeats.',
		cite: { deck: 'informed', slide: 12 },
		value: scenario(ROMANIA_IASI_FAGARAS, 'square')
	}
];

/** The preset whose configuration equals `s` (the step is ignored), if any. */
export function matchPreset(s: RbfsScenario): Preset<RbfsScenario> | undefined {
	return RBFS_PRESETS.find(
		(p) =>
			p.value.graph === s.graph &&
			p.value.shape === s.shape &&
			p.value.maxExpansions === s.maxExpansions
	);
}
