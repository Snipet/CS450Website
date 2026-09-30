import { describe, expect, it } from 'vitest';
import { parseGameTree, type GameTree } from '$lib/theory/games';
import { MIN_ROOT_TREE, MULTI_TREE, CUTOFF_TREE } from './presets';
import { SLIDE_TREE } from './state';
import { describeResult, describeStep, tupleText, valueText } from './describe';
import { runGame } from './view';

const tree = (text: string): GameTree => parseGameTree(text).tree!;
const all = (text: string, algorithm: 'minimax' | 'alphabeta', cutoff: number | null = null) => {
	const run = runGame(tree(text), { algorithm, ordering: 'given', cutoff });
	return run.result.steps.map((_, i) => describeStep(run, i));
};

describe('describeStep, alpha-beta (slides 21–22)', () => {
	const lines = all(SLIDE_TREE, 'alphabeta');

	it('describes the start, calls, terminal nodes, and updates in the pseudocode’s words', () => {
		expect(lines.slice(0, 7)).toEqual([
			'Alpha-Beta-Search(root): v = Max-Value(root, −∞, +∞).',
			'Max-Value(root, α = −∞, β = +∞): root is not terminal; v = −∞.',
			'Min-Value(A1, α = −∞, β = +∞): A1 is not terminal; v = +∞.',
			'Max-Value(A11, α = −∞, β = +∞): A11 is terminal; return Utility(A11) = 3.',
			'Back in Min-Value(A1): v = Min(+∞, 3) = 3.',
			'v = 3 > α = −∞, so no pruning; β = Min(+∞, 3) = 3.',
			'Max-Value(A12, α = −∞, β = 3): A12 is terminal; return Utility(A12) = 12.'
		]);
		expect(lines[12]).toBe('End for: Min-Value(A1) returns 3.');
		expect(lines[14]).toBe('v = 3 < β = +∞, so no pruning; α = Max(−∞, 3) = 3.');
	});

	it('describes the prunes', () => {
		expect(lines[15]).toBe('Min-Value(A2, α = 3, β = +∞): A2 is not terminal; v = +∞.');
		expect(lines[18]).toBe(
			'v = 2 ≤ α = 3: return 2; A22 and A23 are pruned (MAX will never choose A2).'
		);
		expect(lines[30]).toBe('v = 2 ≤ α = 3: return 2 (A3 has no actions left to prune).');
		expect(lines.at(-1)).toBe('Alpha-Beta-Search returns the action from root with value 3: A1.');
	});

	it('describes a prune at a MAX node under a MIN root (slide 21)', () => {
		const min = all(MIN_ROOT_TREE, 'alphabeta');
		expect(min[0]).toBe('Alpha-Beta-Search(root): v = Min-Value(root, −∞, +∞).');
		expect(min).toContain(
			'v = 14 ≥ β = 6: return 14; A32 and A33 are pruned (MIN will never choose A3).'
		);
	});

	it('describes evaluation values at the cutoff', () => {
		const cut = all(CUTOFF_TREE, 'alphabeta', 1);
		expect(cut[2]).toBe(
			'Min-Value(A1, α = −∞, β = +∞): A1 is at the cutoff depth 1; return Eval(A1) = 5.'
		);
	});
});

describe('describeStep, minimax (slides 10–11)', () => {
	it('describes each value in the words of the minimax definition', () => {
		const lines = all(SLIDE_TREE, 'minimax');
		expect(lines).toEqual([
			'Minimax(root): MAX is to move at the root. Compute the minimax values depth first, left to right.',
			'A11 is terminal: Minimax(A11) = Utility(A11) = 3.',
			'A12 is terminal: Minimax(A12) = Utility(A12) = 12.',
			'A13 is terminal: Minimax(A13) = Utility(A13) = 8.',
			'A1, MIN to move: Minimax(A1) = min(3, 12, 8) = 3, from A11.',
			'A21 is terminal: Minimax(A21) = Utility(A21) = 2.',
			'A22 is terminal: Minimax(A22) = Utility(A22) = 4.',
			'A23 is terminal: Minimax(A23) = Utility(A23) = 6.',
			'A2, MIN to move: Minimax(A2) = min(2, 4, 6) = 2, from A21.',
			'A31 is terminal: Minimax(A31) = Utility(A31) = 14.',
			'A32 is terminal: Minimax(A32) = Utility(A32) = 5.',
			'A33 is terminal: Minimax(A33) = Utility(A33) = 2.',
			'A3, MIN to move: Minimax(A3) = min(14, 5, 2) = 2, from A33.',
			'Root, MAX to move: Minimax(root) = max(3, 2, 2) = 3, from A1.',
			'Minimax strategy: choose A1, the move with the best worst-case payoff (3).'
		]);
	});

	it('describes the cutoff', () => {
		const lines = all(CUTOFF_TREE, 'minimax', 2);
		expect(lines[0]).toContain('cutting off the search at depth 2');
		expect(lines[1]).toBe(
			'A11 is at the cutoff depth 2: use Eval(A11) = 6 instead of its minimax value.'
		);
	});

	it('shortens long value lists', () => {
		const wide = `[${Array.from({ length: 12 }, (_, i) => i + 1).join(' ')}]`;
		const lines = all(wide, 'minimax');
		expect(lines.at(-2)).toBe(
			'Root, MAX to move: Minimax(root) = max(1, 2, 3, 4, 5, 6, 7, 8, …, 12) = 12, from A12.'
		);
	});

	it('handles a lone terminal node', () => {
		const lines = all('4', 'minimax');
		expect(lines.at(-1)).toBe(
			'The root is terminal: its minimax value is 4, and there is no move to choose.'
		);
		expect(all('4', 'alphabeta').at(-1)).toBe(
			'The root is terminal: Alpha-Beta-Search has no action to return (value 4).'
		);
	});
});

describe('describeStep, more than two players (slide 13)', () => {
	const run = runGame(tree(MULTI_TREE), { algorithm: 'minimax', ordering: 'given', cutoff: null });
	const lines = run.result.steps.map((_, i) => describeStep(run, i));

	it('describes the back-up by each player', () => {
		expect(lines[0]).toBe(
			'Back up utility tuples from the terminal nodes. Players move in the order 1, 3, 2, one level each (player 1 at the root); each maximizes its own utility.'
		);
		expect(lines[1]).toBe('A111 is terminal: utilities (1, 2, 6).');
		expect(lines[3]).toBe(
			'A11, player 2 to move: its utilities are 2 (A111) and 3 (A112); back up (4, 3, 2) from A112.'
		);
		expect(lines.at(-1)).toBe('Player 1 chooses A1 at the root: (4, 3, 2).');
		const three = runGame(tree('order: 1 [(1,2) (3,4) (0,1)]'), {
			algorithm: 'minimax',
			ordering: 'given',
			cutoff: null
		});
		expect(describeStep(three, 4)).toBe(
			'Root, player 1 to move: its utilities are 1 (A1), 3 (A2), and 0 (A3); back up (3, 4) from A2.'
		);
	});
});

describe('describeResult', () => {
	it('gives the root value and the decision', () => {
		const ab = runGame(tree(SLIDE_TREE), {
			algorithm: 'alphabeta',
			ordering: 'given',
			cutoff: null
		});
		expect(describeResult(ab)).toBe('Minimax value of the root: 3; MAX chooses A1.');
		const multi = runGame(tree(MULTI_TREE), {
			algorithm: 'minimax',
			ordering: 'given',
			cutoff: null
		});
		expect(describeResult(multi)).toBe(
			'Backed-up utilities at the root: (4, 3, 2); player 1 chooses A1.'
		);
		expect(
			describeResult(runGame(tree('4'), { algorithm: 'minimax', ordering: 'given', cutoff: null }))
		).toBe('The root is terminal, with utility 4.');
	});

	it('formats values', () => {
		expect(tupleText([4, 3, 2])).toBe('(4, 3, 2)');
		expect(valueText(-Infinity)).toBe('−∞');
		expect(valueText([1, 2])).toBe('(1, 2)');
	});
});
