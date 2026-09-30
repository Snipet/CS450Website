/**
 * Presets for the minimax tool: the game trees of Games and Adversarial
 * Search with the settings that reproduce a slide.
 */
import type { Preset } from '$lib/components/ui/types';
import { formatGameTree, randomGameTree } from '$lib/theory/games';
import { SLIDE_TREE, defaultMinimaxState, type MinimaxScenario } from './state';

/** Optimality of minimax, slide 12. */
export const OPTIMALITY_TREE = '[[10 11] [9 100]]';

/** The slide tree with MIN to move at the root (slide 21 starts with Min-Value). */
export const MIN_ROOT_TREE = `min: ${SLIDE_TREE}`;

/** A three-ply tree for the move-ordering presets (slide 23). */
export const ORDERING_TREE =
	'[[[13 0 11] [20 20 5] [12 15 8]] [[20 9 10] [2 8 5] [3 10 1]] [[8 16 6] [4 0 8] [12 16 6]]]';

/**
 * A four-ply tree with evaluation values in braces (slide 24). Cut off at
 * depth 1 or 2, MAX takes A1 (5); A1 is worth 1 when searched to the end,
 * because of replies just beyond the depth limit (the horizon effect, slide
 * 25), and the minimax decision is A2 (3).
 */
export const CUTOFF_TREE = `[
  {5}[{6}[{2}[1 9] {1}[0 7]] {5}[{6}[8 6] {8}[7 9]]]
  {3}[{3}[{3}[3 5] {3}[2 8]] {4}[{4}[4 6] {5}[5 4]]]
]`;

/** More general games, slide 13: players 1 (red), 3 (green), 2 (blue) by level. */
export const MULTI_TREE = `order: 1 3 2
[
  [[(1,2,6) (4,3,2)] [(6,1,2) (7,4,1)]]
  [[(5,1,1) (1,5,2)] [(7,7,1) (5,4,5)]]
]`;

/** The random tree preset: b = 3, d = 4, seed 1, utilities 0–20. */
export const RANDOM_SETTINGS = { branching: 3, depth: 4, seed: 1, min: 0, max: 20 } as const;

/** The tree text of the random generator's settings. */
export function randomTreeText(s: {
	branching: number;
	depth: number;
	seed: number;
	min: number;
	max: number;
}): string {
	return formatGameTree(randomGameTree(s));
}

function scenario(patch: Partial<MinimaxScenario> & { tree: string }): MinimaxScenario {
	const d = defaultMinimaxState();
	return {
		algorithm: d.algorithm,
		ordering: d.ordering,
		cutoff: d.cutoff,
		actions: d.actions,
		branching: d.branching,
		depth: d.depth,
		seed: d.seed,
		min: d.min,
		max: d.max,
		...patch
	};
}

const MINIMAX = 'Minimax';
const ALPHA_BETA = 'Alpha-beta pruning';
const CUTOFF = 'Evaluation functions';
const MORE = 'More general games';

export const MINIMAX_PRESETS: readonly Preset<MinimaxScenario>[] = [
	{
		id: 'slide-minimax',
		group: MINIMAX,
		label: 'A two-ply game',
		description:
			'Minimax values backed up from the terminal utilities: the MIN nodes get 3, 2, 2 and the root 3, so MAX chooses A1.',
		cite: { deck: 'adversarial', slide: [9, 11] },
		value: scenario({ tree: SLIDE_TREE, algorithm: 'minimax' })
	},
	{
		id: 'optimality',
		group: MINIMAX,
		label: 'Optimality of minimax',
		description:
			'MAX chooses the left move (value 10). Against a MIN player who errs, MAX can only get more: 11 on the left; the right move risks 9 against an optimal MIN.',
		cite: { deck: 'adversarial', slide: 12 },
		value: scenario({ tree: OPTIMALITY_TREE, algorithm: 'minimax' })
	},
	{
		id: 'slide-alphabeta',
		group: ALPHA_BETA,
		label: 'Alpha-beta on the two-ply game',
		description:
			'The same decision without expanding every node: after A21 = 2 the second MIN node is worth at most 2 < 3, so A22 and A23 are pruned. The third MIN node goes ≤14, ≤5, then 2.',
		cite: { deck: 'adversarial', slide: [14, 19] },
		value: scenario({ tree: SLIDE_TREE, algorithm: 'alphabeta' })
	},
	{
		id: 'min-root',
		group: ALPHA_BETA,
		label: 'MIN at the root',
		description:
			'Alpha-Beta-Search calls Min-Value at the root. The third MAX node reaches 14 ≥ β = 6 at once, so A32 and A33 are pruned.',
		cite: { deck: 'adversarial', slide: 21 },
		value: scenario({ tree: MIN_ROOT_TREE, algorithm: 'alphabeta' })
	},
	{
		id: 'best-first',
		group: ALPHA_BETA,
		label: 'Best moves first',
		description:
			'Each node’s children sorted by their minimax value, best first for the player to move (perfect ordering): 11 of 27 terminal nodes are evaluated, b^⌈d/2⌉ + b^⌊d/2⌋ − 1 for b = 3, d = 3.',
		cite: { deck: 'adversarial', slide: 23 },
		value: scenario({ tree: ORDERING_TREE, algorithm: 'alphabeta', ordering: 'best-first' })
	},
	{
		id: 'worst-first',
		group: ALPHA_BETA,
		label: 'Worst moves first',
		description:
			'The same tree with the worst moves first: nothing is pruned and all 27 terminal nodes are evaluated, as many as plain minimax.',
		cite: { deck: 'adversarial', slide: 23 },
		value: scenario({ tree: ORDERING_TREE, algorithm: 'alphabeta', ordering: 'worst-first' })
	},
	{
		id: 'random',
		group: ALPHA_BETA,
		label: 'Random tree, b = 3, d = 4',
		description:
			'81 terminal nodes with random utilities. Switch the move ordering to compare how many are evaluated: O(bᵐ) without pruning, O(b^(m/2)) with perfect ordering.',
		cite: { deck: 'adversarial', slide: 23 },
		value: scenario({
			tree: randomTreeText(RANDOM_SETTINGS),
			algorithm: 'alphabeta',
			actions: false,
			...RANDOM_SETTINGS
		})
	},
	{
		id: 'cutoff',
		group: CUTOFF,
		label: 'Cutting off search',
		description:
			'Evaluation values in braces. Cut off at depth 2, the search uses Eval there and MAX takes A1 (5). Searched to the end, A1 is worth only 1 (replies just beyond the depth limit) and the minimax decision is A2 (3).',
		cite: { deck: 'adversarial', slide: [24, 25] },
		value: scenario({ tree: CUTOFF_TREE, algorithm: 'minimax', cutoff: 2 })
	},
	{
		id: 'multi-player',
		group: MORE,
		label: 'Three players',
		description:
			'Utilities are tuples; each player maximizes their own entry at their node: player 2 above the terminal nodes, then player 3, then player 1 at the root, who gets (4, 3, 2).',
		cite: { deck: 'adversarial', slide: 13 },
		value: scenario({ tree: MULTI_TREE })
	}
];

const KEYS = ['tree', 'algorithm', 'ordering', 'cutoff'] as const;

/**
 * The preset whose tree and search settings equal `s`. The algorithm and
 * ordering do not matter for multi-player trees, nor the ordering for minimax.
 */
export function matchPreset(
	s: MinimaxScenario,
	tuples: boolean
): Preset<MinimaxScenario> | undefined {
	return MINIMAX_PRESETS.find((p) =>
		KEYS.every((k) => {
			if (tuples && (k === 'algorithm' || k === 'ordering')) return true;
			if (k === 'ordering' && s.algorithm === 'minimax' && p.value.algorithm === 'minimax')
				return true;
			return p.value[k] === s[k];
		})
	);
}
