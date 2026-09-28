/**
 * Presets for the search tool: a lecture problem (as graph text with drawing
 * positions, so the text in the URL round-trips) and the search settings that
 * reproduce a slide.
 */
import type { Preset } from '$lib/components/ui/types';
import {
	ASTAR_WRONG_PROBLEM,
	BINARY_TREE_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	formatGraphText,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { defaultSearchState, type SearchScenario } from './state';

type ScenarioInput = Partial<Omit<SearchScenario, 'graph'>> & { problem: GraphProblemSpec };

/** A scenario on a lecture problem; unspecified settings take the tool defaults. */
function scenario({ problem, ...settings }: ScenarioInput): SearchScenario {
	const d = defaultSearchState();
	const map = problem.graph === ROMANIA_PROBLEM.graph;
	return {
		graph: formatGraphText(problem, { positions: true }),
		strategy: d.strategy,
		mode: d.mode,
		goalTest: d.goalTest,
		depthLimit: d.depthLimit,
		weight: d.weight,
		order: d.order,
		annotation: d.annotation,
		shape: map ? 'square' : 'circle',
		maxExpansions: d.maxExpansions,
		...settings
	};
}

const SEARCH = 'Solving problems by searching';
const UNINFORMED = 'Uninformed search';
const INFORMED = 'Informed search';

export const SEARCH_PRESETS: readonly Preset<SearchScenario>[] = [
	{
		id: 'tree-search',
		group: SEARCH,
		label: 'Tree search example',
		description:
			'Arad to Bucharest without repeated-state checks: Arad reappears under Sibiu, Sibiu under Fagaras and Rimnicu Vilcea. The slides expand the nodes in A* order (Informed Search, slides 17–22), so this runs A* with the labels hidden.',
		cite: { deck: 'search', slide: [29, 35] },
		value: scenario({ problem: ROMANIA_PROBLEM, strategy: 'astar', annotation: 'none' })
	},
	{
		id: 'no-repeated-states',
		group: SEARCH,
		label: 'Search without repeated states',
		description:
			'The same search with an explored set: repeated states are crossed out, and Bucharest through Pitesti (418) replaces Bucharest through Fagaras (450) on the frontier. Path costs g(n) under the nodes.',
		cite: { deck: 'search', slide: [37, 43] },
		value: scenario({
			problem: ROMANIA_PROBLEM,
			strategy: 'astar',
			mode: 'graph',
			annotation: 'g'
		})
	},
	{
		id: 'bfs-order',
		group: UNINFORMED,
		label: 'BFS expansion order',
		description:
			'Breadth-first tree search on the tiny search problem: S, d, e, p, b, c, e, h, r, q, a, a, h, r, p, q, f, p, q, f, q, c, G.',
		cite: { deck: 'uninformed', slide: 4 },
		value: scenario({ problem: TINY_PROBLEM, strategy: 'bfs' })
	},
	{
		id: 'dfs-order',
		group: UNINFORMED,
		label: 'DFS expansion order',
		description:
			'Depth-first tree search, first successor first: S, d, b, a, c, a, e, h, p, q, q, r, f, c, a, G (the slide lists the order after S).',
		cite: { deck: 'uninformed', slide: 6 },
		value: scenario({ problem: TINY_PROBLEM, strategy: 'dfs' })
	},
	{
		id: 'ucs-example',
		group: UNINFORMED,
		label: 'Uniform-cost search example',
		description:
			'Frontier ordered by path cost g(n): S, p, d, b, e, a, r, f, e, G, and the cheapest path S → d → e → r → f → G (cost 10).',
		cite: { deck: 'uninformed', slide: 41 },
		value: scenario({ problem: TINY_PROBLEM, strategy: 'ucs' })
	},
	{
		id: 'bfs-not-cheapest',
		group: UNINFORMED,
		label: 'BFS is not always cheapest',
		description:
			'BFS returns S → e → r → f → G, the path with the fewest steps (cost 14); the cheapest path, S → d → e → r → f → G, costs 10. Path costs g(n) under the nodes.',
		cite: { deck: 'uninformed', slide: 39 },
		value: scenario({ problem: TINY_PROBLEM, strategy: 'bfs', annotation: 'g' })
	},
	{
		id: 'iterative-deepening',
		group: UNINFORMED,
		label: 'Iterative deepening',
		description:
			'Depth-limited DFS with limits 0, 1, 2, 3 on a binary tree: A | A B C | A B D E C F G | A B D H I E J K C F L M. The goal M is found with limit 3.',
		cite: { deck: 'uninformed', slide: [34, 37] },
		value: scenario({ problem: BINARY_TREE_PROBLEM, strategy: 'ids', depthLimit: 10 })
	},
	{
		id: 'ucs-graph',
		group: UNINFORMED,
		label: 'Uniform-cost graph search',
		description:
			'Cities taken off the frontier in order of road distance from Arad, as in Dijkstra’s algorithm; Bucharest at 418.',
		cite: { deck: 'uninformed', slide: 40 },
		value: scenario({ problem: ROMANIA_PROBLEM, strategy: 'ucs', mode: 'graph' })
	},
	{
		id: 'dfs-path-check',
		group: UNINFORMED,
		label: 'DFS with a path check',
		description:
			'Children whose state is already on the path are not added, so DFS no longer goes back and forth between Arad and Sibiu: Arad, Sibiu, Fagaras, Bucharest.',
		cite: { deck: 'uninformed', slide: 32 },
		value: scenario({ problem: ROMANIA_PROBLEM, strategy: 'dfs', mode: 'path' })
	},
	{
		id: 'greedy',
		group: INFORMED,
		label: 'Greedy best-first search',
		description:
			'Frontier ordered by the straight-line distance h(n): Arad, Sibiu, Fagaras, Bucharest (cost 450).',
		cite: { deck: 'informed', slide: [8, 11] },
		value: scenario({ problem: ROMANIA_PROBLEM, strategy: 'greedy' })
	},
	{
		id: 'greedy-loops',
		group: INFORMED,
		label: 'Greedy search loops',
		description:
			'Iasi to Fagaras with straight-line distances to Fagaras measured on the map: greedy tree search goes Iasi, Neamt, Iasi, Neamt, … until the limit of 30 expansions stops it.',
		cite: { deck: 'informed', slide: 12 },
		value: scenario({ problem: ROMANIA_IASI_FAGARAS, strategy: 'greedy', maxExpansions: 30 })
	},
	{
		id: 'greedy-vs-astar',
		group: INFORMED,
		label: 'Greedy vs. A*',
		description:
			'Greedy best-first follows h = 1 along the long path (cost 6). Switch the strategy to A* for the short path (cost 3).',
		cite: { deck: 'informed', slide: 15 },
		value: scenario({ problem: GREEDY_TRAP_PROBLEM, strategy: 'greedy' })
	},
	{
		id: 'astar',
		group: INFORMED,
		label: 'A* search example',
		description:
			'f(n) = g(n) + h(n) under every node, from 366=0+366 at Arad to 418=418+0 at Bucharest.',
		cite: { deck: 'informed', slide: [17, 22] },
		value: scenario({ problem: ROMANIA_PROBLEM, strategy: 'astar' })
	},
	{
		id: 'astar-wrong',
		group: INFORMED,
		label: 'A* gone wrong',
		description:
			'h is admissible but not consistent (h(A) = 4 > c(A, C) + h(C) = 2). Graph search expands C through B first, drops the cheaper path through A, and returns cost 6; tree search returns 5.',
		cite: { deck: 'informed', slide: [27, 29] },
		value: scenario({ problem: ASTAR_WRONG_PROBLEM, strategy: 'astar', mode: 'graph' })
	},
	{
		id: 'weighted-astar',
		group: INFORMED,
		label: 'Weighted A*',
		description:
			'Frontier ordered by g(n) + α·h(n) with α = 2: 4 nodes taken off the frontier instead of 6 with A*, and a path of cost 450 instead of 418, within α times the cheapest.',
		cite: { deck: 'informed', slide: 38 },
		value: scenario({ problem: ROMANIA_PROBLEM, strategy: 'wastar', weight: 2 })
	}
];

/** The preset whose configuration equals `s` (the step is ignored), if any. */
export function matchPreset(s: SearchScenario): Preset<SearchScenario> | undefined {
	return SEARCH_PRESETS.find((p) => sameScenario(p.value, s));
}

const KEYS: readonly (keyof SearchScenario)[] = [
	'graph',
	'strategy',
	'mode',
	'goalTest',
	'depthLimit',
	'weight',
	'order',
	'annotation',
	'shape',
	'maxExpansions'
];

export function sameScenario(a: SearchScenario, b: SearchScenario): boolean {
	return KEYS.every((k) => a[k] === b[k]);
}
