/**
 * Statements and questions from Games and Adversarial Search shown under the
 * minimax tool, each with the slide it comes from.
 */
import type { Citation } from '$lib/lectures';

export interface NoteSection {
	id: string;
	title: string;
	cite: Citation;
	points: readonly string[];
	/** A preset that shows the section on a tree. */
	preset?: { id: string; label: string };
}

export const NOTES: readonly NoteSection[] = [
	{
		id: 'minimax',
		title: 'Minimax value and strategy',
		cite: { deck: 'adversarial', slide: [10, 11] },
		points: [
			'Minimax value of a node: the utility (for MAX) of being in the corresponding state, assuming perfect play on both sides.',
			'Minimax strategy: choose the move that gives the best worst-case payoff.',
			'Minimax(node) is Utility(node) if node is terminal, the maximum of Minimax(Succ(node, action)) over the actions if MAX is to move, and the minimum if MIN is to move.'
		],
		preset: { id: 'slide-minimax', label: 'A two-ply game' }
	},
	{
		id: 'optimality',
		title: 'Optimality of minimax',
		cite: { deck: 'adversarial', slide: 12 },
		points: ['The minimax strategy is optimal against an optimal opponent.'],
		preset: { id: 'optimality', label: 'Optimality of minimax' }
	},
	{
		id: 'general',
		title: 'More general games',
		cite: { deck: 'adversarial', slide: 13 },
		points: [
			'More than two players, non-zero-sum: utilities are tuples.',
			'Each player maximizes their own utility at their node.',
			'Utilities get propagated (backed up) from children to parents.'
		],
		preset: { id: 'multi-player', label: 'Three players' }
	},
	{
		id: 'alphabeta',
		title: 'Alpha-beta pruning',
		cite: { deck: 'adversarial', slide: [20, 23] },
		points: [
			'α is the value of the best choice for the MAX player found so far at any choice point above node n; β is the value of the lowest-utility choice found so far for the MIN player.',
			'As the loop goes over n’s children, the MIN-value at n decreases. If it drops below α, MAX will never choose n, so n’s remaining children can be ignored.',
			'Pruning does not affect the final result.',
			'The amount of pruning depends on move ordering: search should start with the “best” moves (highest value for MAX, lowest value for MIN). For chess: captures first, then threats, then forward moves, then backward moves; “killer moves” from other branches of the tree can also be remembered.',
			'With perfect ordering, the time to find the best move is reduced to O(b^(m/2)) from O(bᵐ): the depth of search is effectively doubled.'
		],
		preset: { id: 'slide-alphabeta', label: 'Alpha-beta on the two-ply game' }
	},
	{
		id: 'evaluation',
		title: 'Evaluation functions',
		cite: { deck: 'adversarial', slide: 24 },
		points: [
			'Cut off search at a certain depth and compute the value of an evaluation function for a state instead of its minimax value.',
			'The evaluation function may be thought of as the probability of winning from a given state or the expected value of that state.',
			'A common evaluation function is a weighted sum of features: Eval(s) = w₁ f₁(s) + w₂ f₂(s) + … + wₙ fₙ(s). For chess, wₖ may be the material value of a piece (pawn = 1, knight = 3, rook = 5, queen = 9) and fₖ(s) the advantage in terms of that piece.',
			'Evaluation functions may be learned from game databases or by having the program play many games against itself.'
		],
		preset: { id: 'cutoff', label: 'Cutting off search' }
	},
	{
		id: 'cutoff',
		title: 'Cutting off search',
		cite: { deck: 'adversarial', slide: 25 },
		points: [
			'Horizon effect: the value of a state may be estimated incorrectly by overlooking an event just beyond the depth limit, for example a damaging move by the opponent that can be delayed but not avoided.',
			'Quiescence search: do not cut off search at positions that are unstable (for example, when an important piece is about to be lost).',
			'Singular extension: a strong move that should be tried when the normal depth limit is reached.'
		]
	}
];

export interface Question {
	id: string;
	question: string;
	cite: Citation;
	answer: string;
	preset?: { id: string; label: string };
}

export const QUESTIONS: readonly Question[] = [
	{
		id: 'suboptimal',
		question: 'What if your opponent is suboptimal?',
		cite: { deck: 'adversarial', slide: 12 },
		answer:
			'Your utility can only be higher than against an optimal opponent. A different strategy may work better against a suboptimal opponent, but it is necessarily worse against an optimal one. On the slide 12 tree, minimax takes the left move (10); if MIN errs there, MAX gets 11. The right move could give 100, but an optimal MIN answers it with 9.',
		preset: { id: 'optimality', label: 'Optimality of minimax' }
	},
	{
		id: 'skip',
		question: 'Why are the leaves 4 and 6 never looked at?',
		cite: { deck: 'adversarial', slide: [16, 20] },
		answer:
			'After the first MIN node MAX can already get 3 (α = 3). The second MIN node’s first leaf is 2, so its value is at most 2 whatever the other leaves are: MAX will never choose it, and A22 and A23 are pruned. The root still gets the minimax value 3.',
		preset: { id: 'slide-alphabeta', label: 'Alpha-beta on the two-ply game' }
	},
	{
		id: 'ordering',
		question: 'How much does the move ordering change?',
		cite: { deck: 'adversarial', slide: 23 },
		answer:
			'Not the value: pruning does not affect the final result. Only the number of nodes: with the best moves first, alpha-beta evaluates b^⌈d/2⌉ + b^⌊d/2⌋ − 1 terminal nodes of a uniform tree (11 of 27 for b = 3, d = 3); with the worst moves first it can evaluate all bᵈ of them.',
		preset: { id: 'best-first', label: 'Best moves first' }
	},
	{
		id: 'horizon',
		question: 'Can cutting off the search change the decision?',
		cite: { deck: 'adversarial', slide: [24, 25] },
		answer:
			'Yes. The evaluation function only estimates the value of a state. In the “Cutting off search” tree, Eval rates A1 at 5 at depth 2, but replies just beyond that depth bring A1 down to 1: cut off at depth 1 or 2 MAX takes A1, while cut off at depth 3 or searched to the end MAX takes A2 (3). This is the horizon effect.',
		preset: { id: 'cutoff', label: 'Cutting off search' }
	}
];
