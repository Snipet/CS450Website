/**
 * Presets for the grid tool: a layout (built at the current grid size) plus
 * search settings, citing the slides they follow.
 */
import type { Preset } from '$lib/components/ui/types';
import type { GridHeuristic, GridPresetId } from '$lib/theory/grid';
import { DEFAULT_GRID_WEIGHT, type GridAlgorithm } from './state';

export interface GridScenario {
	layout: GridPresetId;
	algorithm: GridAlgorithm;
	compare: GridAlgorithm | null;
	diagonal: boolean;
	heuristic: GridHeuristic;
	weight: number;
}

const scenario = (s: Partial<GridScenario> & Pick<GridScenario, 'layout'>): GridScenario => ({
	algorithm: 'astar',
	compare: null,
	diagonal: true,
	heuristic: 'euclidean',
	weight: DEFAULT_GRID_WEIGHT,
	...s
});

export const GRID_TOOL_PRESETS: readonly Preset<GridScenario>[] = [
	{
		id: 'astar-concave',
		group: 'Informed search',
		label: 'A* around a concave obstacle',
		description: 'Start lower left, goal upper right, a ¬-shaped wall between them.',
		cite: { deck: 'informed', slide: 23 },
		value: scenario({ layout: 'concave' })
	},
	{
		id: 'ucs-vs-astar',
		group: 'Informed search',
		label: 'Uniform-cost search vs. A*',
		description: 'The same obstacle searched with g(n) alone and with g(n) + h(n).',
		cite: { deck: 'informed', slide: 24 },
		value: scenario({ layout: 'concave', algorithm: 'ucs', compare: 'astar' })
	},
	{
		id: 'wastar-vs-astar',
		group: 'Informed search',
		label: 'Weighted A* (α = 5) vs. A*',
		description: 'Heuristic 5 × Euclidean distance from the goal, next to exact A*.',
		cite: { deck: 'informed', slide: [39, 40] },
		value: scenario({ layout: 'concave', algorithm: 'wastar', compare: 'astar', weight: 5 })
	},
	{
		id: 'greedy-vs-astar',
		group: 'Informed search',
		label: 'Greedy best-first vs. A*',
		description: 'Greedy heads into the pocket of the obstacle and returns a costlier path.',
		cite: { deck: 'informed', slide: 13 },
		value: scenario({ layout: 'concave', algorithm: 'greedy', compare: 'astar' })
	},
	{
		id: 'bfs-vs-ucs-diagonal',
		group: 'Uninformed search',
		label: 'BFS vs. UCS with diagonal moves',
		description:
			'Diagonal steps cost √2, so the path with the fewest steps is not always the cheapest.',
		cite: { deck: 'uninformed', slide: 39 },
		value: scenario({ layout: 'open', algorithm: 'bfs', compare: 'ucs', heuristic: 'octile' })
	},
	{
		id: 'bfs-vs-dfs-maze',
		group: 'Uninformed search',
		label: 'BFS vs. DFS in a maze',
		description: 'Corridors one cell wide with a few loops; 4-connected moves.',
		cite: { deck: 'uninformed', slide: [31, 32] },
		value: scenario({
			layout: 'maze',
			algorithm: 'bfs',
			compare: 'dfs',
			diagonal: false,
			heuristic: 'manhattan'
		})
	},
	{
		id: 'greedy-wall-gap',
		group: 'Grids',
		label: 'Wall with a gap',
		description: 'Greedy best-first vs. A* when the straight line to the goal is blocked.',
		cite: { deck: 'informed', slide: 13 },
		value: scenario({
			layout: 'wall-gap',
			algorithm: 'greedy',
			compare: 'astar',
			heuristic: 'octile'
		})
	},
	{
		id: 'scattered-astar',
		group: 'Grids',
		label: 'Scattered obstacles',
		description: 'A* with Manhattan distance on 4-connected moves.',
		cite: { deck: 'informed', slide: 16 },
		value: scenario({ layout: 'scattered', diagonal: false, heuristic: 'manhattan' })
	},
	{
		id: 'open-field',
		group: 'Grids',
		label: 'Open field',
		description: 'No walls; A* with the octile distance, the exact cost on an open grid.',
		cite: { deck: 'informed', slide: 25 },
		value: scenario({ layout: 'open', heuristic: 'octile' })
	}
];
