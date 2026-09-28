/**
 * Presets for the state spaces tool: the example problems of Solving Problems
 * by Searching (slides 6–11) and the search from the start state.
 */
import type { Preset } from '$lib/components/ui/types';
import type { StateSpacesScenario } from './state';

export const STATE_SPACE_PRESETS: readonly Preset<StateSpacesScenario>[] = [
	{
		id: 'romania',
		group: 'Example problems',
		label: 'Romania',
		description: 'The road map as the state space: start in Arad, goal Bucharest.',
		cite: { deck: 'search', slide: 6 },
		value: { problem: 'romania', squares: 2, strategy: 'bfs' }
	},
	{
		id: 'vacuum-2',
		group: 'Example problems',
		label: 'Vacuum world, two squares',
		description:
			'The eight states and their Left, Right, and Suck transitions as drawn on slide 9.',
		cite: { deck: 'search', slide: 9 },
		value: { problem: 'vacuum', squares: 2, strategy: 'bfs' }
	},
	{
		id: 'vacuum-3',
		group: 'Example problems',
		label: 'Vacuum world, three squares',
		description: '3 · 2³ = 24 states.',
		cite: { deck: 'search', slide: 8 },
		value: { problem: 'vacuum', squares: 3, strategy: 'bfs' }
	},
	{
		id: 'vacuum-4',
		group: 'Example problems',
		label: 'Vacuum world, four squares',
		description: '4 · 2⁴ = 64 states.',
		cite: { deck: 'search', slide: 8 },
		value: { problem: 'vacuum', squares: 4, strategy: 'bfs' }
	},
	{
		id: 'puzzle',
		group: 'Example problems',
		label: '8-puzzle',
		description: 'The start and goal states of the slide; 181,440 reachable states.',
		cite: { deck: 'search', slide: 10 },
		value: { problem: 'puzzle', squares: 2, strategy: 'bfs' }
	},
	{
		id: 'robot',
		group: 'Example problems',
		label: 'Robot motion planning',
		description: 'Continuous states and actions.',
		cite: { deck: 'search', slide: 11 },
		value: { problem: 'robot', squares: 2, strategy: 'bfs' }
	},
	{
		id: 'ucs-romania',
		group: 'Search from the start state',
		label: 'Uniform-cost search from Arad',
		description:
			'Expands the frontier state with the lowest path cost; equivalent to Dijkstra’s algorithm in general.',
		cite: { deck: 'uninformed', slide: 40 },
		value: { problem: 'romania', squares: 2, strategy: 'ucs' }
	},
	{
		id: 'ucs-vacuum',
		group: 'Search from the start state',
		label: 'Uniform-cost search, vacuum world',
		description:
			'Equivalent to breadth-first search when step costs are all equal; here every action costs 1.',
		cite: { deck: 'uninformed', slide: 40 },
		value: { problem: 'vacuum', squares: 2, strategy: 'ucs' }
	}
];

/**
 * The preset a scenario matches: the same problem; for Romania and the vacuum
 * world also the same strategy, and for the vacuum world the same squares.
 */
export function matchPreset(s: StateSpacesScenario): Preset<StateSpacesScenario> | null {
	const searched = s.problem === 'romania' || s.problem === 'vacuum';
	return (
		STATE_SPACE_PRESETS.find(
			(p) =>
				p.value.problem === s.problem &&
				(!searched || p.value.strategy === s.strategy) &&
				(s.problem !== 'vacuum' || p.value.squares === s.squares)
		) ?? null
	);
}
