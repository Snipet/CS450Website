import { describe, expect, it } from 'vitest';
import {
	EMPTY_BOARD,
	isTerminal,
	legalMoves,
	result,
	toMove,
	utility,
	type Board
} from './tictactoe';
import {
	CENTER_CORNERS_EDGES,
	DEFAULT_WEIGHTS,
	FEATURES,
	MAX_WEIGHT,
	MOVE_ORDERINGS,
	ORDERING_INFO,
	WIN_SCORE,
	alphaBeta,
	evaluate,
	features,
	gameTree,
	isMoveOrdering,
	isWeights,
	minimax,
	minimaxValue,
	reachableBoards,
	reachablePositions,
	type Weights
} from './tictactoe-search';

const positions = reachableBoards().filter((b) => !isTerminal(b));
const empties = (b: Board) => [...b].filter((c) => c === '.').length;

/** Slide 11 without a table: value and node count of the plain recursion. */
function referenceMinimax(board: Board): { value: number; nodes: number; terminals: number } {
	if (isTerminal(board)) return { value: utility(board), nodes: 1, terminals: 1 };
	const max = toMove(board) === 'X';
	let value = max ? -Infinity : Infinity;
	let nodes = 1;
	let terminals = 0;
	for (const s of legalMoves(board)) {
		const c = referenceMinimax(result(board, s));
		value = max ? Math.max(value, c.value) : Math.min(value, c.value);
		nodes += c.nodes;
		terminals += c.terminals;
	}
	return { value, nodes, terminals };
}

describe('evaluation function', () => {
	it('counts open lines for each player', () => {
		expect(FEATURES.map((f) => f.id)).toEqual(['X2', 'X1', 'O2', 'O1']);
		expect(features(EMPTY_BOARD)).toEqual([0, 0, 0, 0]);
		// X in a corner: its row, column and diagonal.
		expect(features('X........')).toEqual([0, 3, 0, 0]);
		// X in the center: four lines.
		expect(features('....X....')).toEqual([0, 4, 0, 0]);
		// X corner, O center: the diagonal through both is blocked for both players.
		expect(features('X...O....')).toEqual([0, 2, 0, 3]);
		// X on 1 and 2, O on 5: X has the top row with two and the left column with
		// one; O has the middle row and the diagonal from the top right.
		expect(features('XX..O....')).toEqual([1, 1, 0, 2]);
	});

	it('is the weighted sum Eval(s) = 3·X₂ + X₁ − 3·O₂ − O₁ by default', () => {
		expect(DEFAULT_WEIGHTS).toEqual([3, 1, -3, -1]);
		expect(evaluate('X........')).toBe(3);
		expect(evaluate('....X....')).toBe(4);
		expect(evaluate('X...O....')).toBe(-1);
		expect(evaluate('XX..O....')).toBe(3 + 1 - 2);
		expect(evaluate('XX..O....', [1, 0, 0, 0])).toBe(1);
		expect(evaluate('XX..O....', [0, 0, 0, -2])).toBe(-4);
	});

	it('stays below the win score for any weights in range', () => {
		const extremes: Weights[] = [
			[MAX_WEIGHT, MAX_WEIGHT, MAX_WEIGHT, MAX_WEIGHT],
			[-MAX_WEIGHT, -MAX_WEIGHT, -MAX_WEIGHT, -MAX_WEIGHT],
			[MAX_WEIGHT, MAX_WEIGHT, -MAX_WEIGHT, -MAX_WEIGHT]
		];
		let largest = 0;
		for (const w of extremes) {
			for (const b of positions) largest = Math.max(largest, Math.abs(evaluate(b, w)));
		}
		expect(largest).toBeLessThanOrEqual(8 * MAX_WEIGHT);
		expect(largest).toBeLessThan(WIN_SCORE);
	});

	it('validates weights', () => {
		expect(isWeights([3, 1, -3, -1])).toBe(true);
		expect(isWeights([10, -10, 0, 0])).toBe(true);
		expect(isWeights([11, 0, 0, 0])).toBe(false);
		expect(isWeights([1.5, 0, 0, 0])).toBe(false);
		expect(isWeights([1, 0, 0])).toBe(false);
		expect(isWeights('3,1,-3,-1')).toBe(false);
	});
});

describe('move orderings', () => {
	it('lists square order, center-corners-edges, and best move first', () => {
		expect(MOVE_ORDERINGS).toEqual(['squares', 'center', 'best']);
		expect(CENTER_CORNERS_EDGES.map((s) => s + 1)).toEqual([5, 1, 3, 7, 9, 2, 4, 6, 8]);
		for (const o of MOVE_ORDERINGS) expect(ORDERING_INFO[o].label.length).toBeGreaterThan(0);
		expect(isMoveOrdering('center')).toBe(true);
		expect(isMoveOrdering('random')).toBe(false);
	});

	it('searches the root children in that order', () => {
		expect(alphaBeta(EMPTY_BOARD).moves.map((m) => m.square)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
		expect(alphaBeta(EMPTY_BOARD, { ordering: 'center' }).moves.map((m) => m.square)).toEqual(
			CENTER_CORNERS_EDGES
		);
		// O must block square 3: the best move comes first, then the rest by square.
		expect(alphaBeta('XX..O....', { ordering: 'best' }).moves.map((m) => m.square)).toEqual([
			2, 3, 5, 6, 7, 8
		]);
	});
});

describe('whole-game counts', () => {
	it('has 549,946 nodes and 255,168 complete games from the empty board', () => {
		expect(gameTree()).toEqual({
			nodes: 549_946,
			terminals: 255_168,
			xWins: 131_184,
			oWins: 77_904,
			draws: 46_080
		});
	});

	it('has 5,478 distinct positions, 958 of them terminal', () => {
		expect(reachablePositions()).toEqual({
			positions: 5478,
			terminal: 958,
			xWins: 626,
			oWins: 316,
			draws: 16
		});
		expect(reachableBoards()[0]).toBe(EMPTY_BOARD);
	});

	it('counts the tree below any position', () => {
		expect(gameTree('XOX.X.XOO')).toEqual({ nodes: 1, terminals: 1, xWins: 1, oWins: 0, draws: 0 });
		// X to move with squares 7, 8, 9 open (worked out in the alpha-beta test below).
		expect(gameTree('XOXXOO...').nodes).toBe(11);
	});
});

describe('minimax', () => {
	it('values the empty board 0: a draw with perfect play', () => {
		const r = minimax(EMPTY_BOARD);
		expect(r.value).toBe(0);
		expect(r.player).toBe('MAX');
		expect(r.moves.map((m) => m.value)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
		expect(r.best).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
		// Ties go to the first square in order.
		expect(r.move).toBe(0);
		expect(r.counts).toEqual({
			nodes: 549_946,
			terminals: 255_168,
			evaluations: 0,
			cutoffs: 0,
			pruned: 0
		});
		expect(r.moves.reduce((n, m) => n + m.nodes, 1)).toBe(549_946);
	});

	it('finds a forced win for X', () => {
		// X in a corner, O on the next edge square: X wins with squares 4, 5 or 7.
		const r = minimax('XO.......');
		expect(r.value).toBe(1);
		expect(r.best.map((s) => s + 1)).toEqual([4, 5, 7]);
		expect(r.move).toBe(3);
	});

	it('finds the only move that blocks', () => {
		// X threatens the top row; every O move but square 3 loses.
		const r = minimax('XX..O....');
		expect(r.player).toBe('MIN');
		expect(r.value).toBe(0);
		expect(r.best).toEqual([2]);
		expect(r.moves.filter((m) => m.square !== 2).every((m) => m.value === 1)).toBe(true);
	});

	it('does not prefer a quicker win: ties go to the first square', () => {
		// X can complete the left column on square 7 at once, but square 5 also
		// wins by force and comes first.
		const r = minimax('XOOX.....');
		expect(r.moves.find((m) => m.square === 6)?.value).toBe(1);
		expect(r.best).toEqual([4, 5, 6, 7, 8]);
		expect(r.move).toBe(4);
	});

	it('returns the utility of a terminal board', () => {
		for (const [board, u] of [
			['XOX.OX.O.', -1],
			['XOXOOXXXO', 0],
			['XOX.X.XOO', 1]
		] as const) {
			const r = minimax(board);
			expect(r).toMatchObject({ value: u, move: null, player: null, best: [], moves: [] });
			expect(r.counts.nodes).toBe(1);
			expect(minimax(board, { depth: 2 }).value).toBe(u * WIN_SCORE);
		}
	});

	it('reports the counts of the recursion without a table', () => {
		for (const b of positions.filter((_, i) => i % 97 === 0)) {
			const ref = referenceMinimax(b);
			const r = minimax(b);
			expect(r.value, b).toBe(ref.value);
			expect(r.counts.nodes, b).toBe(ref.nodes);
			expect(r.counts.terminals, b).toBe(ref.terminals);
			expect(minimaxValue(b)).toBe(ref.value);
		}
	});

	it('rejects a cutoff depth below 1', () => {
		expect(() => minimax(EMPTY_BOARD, { depth: 0 })).toThrow();
		expect(() => alphaBeta(EMPTY_BOARD, { depth: 1.5 })).toThrow();
	});
});

describe('alpha-beta', () => {
	it('follows the slide 21–22 pseudocode (worked example)', () => {
		// X O X / X O O / . . .  — X to move.
		// Square 7 wins at once: v = +1, α = +1.
		// Square 8: Min-Value(α = 1) tries O on 7, then X must take 9: a draw, 0.
		//   v = 0 ≤ α, so it returns 0 without trying O on 9 (an upper bound).
		// Square 9: O on 7, then X on 8, is a draw: 0 ≤ α, so O on 8 is pruned.
		//   (O on 8 would complete the middle column: the true value is −1.)
		const r = alphaBeta('XOXXOO...');
		expect(r.value).toBe(1);
		expect(r.move).toBe(6);
		expect(r.moves).toEqual([
			{ square: 6, value: 1, bound: 'exact', nodes: 1 },
			{ square: 7, value: 0, bound: 'upper', nodes: 3 },
			{ square: 8, value: 0, bound: 'upper', nodes: 3 }
		]);
		expect(r.counts).toEqual({ nodes: 8, terminals: 3, evaluations: 0, cutoffs: 2, pruned: 2 });
		// Minimax visits the whole tree of 11 nodes.
		const mm = minimax('XOXXOO...');
		expect(mm.counts.nodes).toBe(11);
		expect(mm.moves.map((m) => m.value)).toEqual([1, 0, -1]);
	});

	it('visits far fewer nodes than minimax from the empty board, fewest with the best move first', () => {
		const counts = MOVE_ORDERINGS.map((ordering) => alphaBeta(EMPTY_BOARD, { ordering }).counts);
		expect(counts).toEqual([
			{ nodes: 18_297, terminals: 7_330, evaluations: 0, cutoffs: 4_237, pruned: 6_930 },
			{ nodes: 7_275, terminals: 2_893, evaluations: 0, cutoffs: 2_156, pruned: 3_668 },
			{ nodes: 2_312, terminals: 781, evaluations: 0, cutoffs: 1_045, pruned: 2_204 }
		]);
		for (const ordering of MOVE_ORDERINGS) {
			expect(alphaBeta(EMPTY_BOARD, { ordering }).value).toBe(0);
		}
	});

	it('gets the minimax value on every reachable position, with any ordering', () => {
		for (const b of positions) {
			const mm = minimax(b);
			const exact = new Map(mm.moves.map((m) => [m.square, m.value]));
			for (const ordering of MOVE_ORDERINGS) {
				const ab = alphaBeta(b, { ordering });
				expect(ab.value, `${b} ${ordering}`).toBe(mm.value);
				expect(ab.counts.nodes).toBeLessThanOrEqual(mm.counts.nodes);
				expect(mm.best).toContain(ab.move);
				for (const m of ab.moves) {
					const v = exact.get(m.square)!;
					if (m.bound === 'exact') expect(m.value).toBe(v);
					else if (m.bound === 'upper') expect(v).toBeLessThanOrEqual(m.value);
					else expect(v).toBeGreaterThanOrEqual(m.value);
				}
			}
			// In square order alpha-beta returns the same move as minimax.
			expect(alphaBeta(b).move, b).toBe(mm.move);
		}
	});
});

describe('depth-limited search', () => {
	it('scores cut-off states with Eval and counts the evaluations', () => {
		const r = minimax(EMPTY_BOARD, { depth: 1 });
		// One ply: X's nine moves, each evaluated.
		expect(r.moves.map((m) => m.value)).toEqual([3, 2, 3, 2, 4, 2, 3, 2, 3]);
		expect(r.move).toBe(4);
		expect(r.counts).toEqual({ nodes: 10, terminals: 0, evaluations: 9, cutoffs: 0, pruned: 0 });
		expect(r.depth).toBe(1);
	});

	it('agrees with the full search when the limit covers the rest of the game', () => {
		for (const b of positions.filter((_, i) => i % 7 === 0)) {
			const full = minimax(b);
			for (const depth of [empties(b), 9]) {
				const limited = minimax(b, { depth });
				expect(limited.value, b).toBe(full.value * WIN_SCORE);
				expect(limited.move).toBe(full.move);
				expect(limited.counts.evaluations).toBe(0);
				expect(limited.counts.nodes).toBe(full.counts.nodes);
				expect(alphaBeta(b, { depth }).value).toBe(full.value * WIN_SCORE);
			}
		}
	});

	it('returns the same value and move with or without pruning', () => {
		const weightSets: Weights[] = [DEFAULT_WEIGHTS, [1, 0, -1, 0], [5, -2, -7, 3]];
		for (const weights of weightSets) {
			for (const b of positions.filter((_, i) => i % 5 === 0)) {
				for (const depth of [1, 2, 3, 4]) {
					const mm = minimax(b, { depth, weights });
					const ab = alphaBeta(b, { depth, weights });
					expect(ab.value, `${b} ${depth}`).toBe(mm.value);
					expect(ab.move, `${b} ${depth}`).toBe(mm.move);
					expect(ab.counts.nodes).toBeLessThanOrEqual(mm.counts.nodes);
				}
			}
		}
	});

	it('shows the horizon effect: a cutoff at 3 plies picks a losing move', () => {
		// X on squares 2 and 4, O in the center, O to move. Square 9 threatens the
		// diagonal, but X's forced block on square 1 makes two threats at once, and
		// X completes a line at ply 4: just past the cutoff.
		const board = '.X.XO....';
		expect(minimaxValue(board)).toBe(0);
		const shallow = minimax(board, { depth: 3 });
		expect(shallow.move).toBe(8);
		expect(shallow.moves.map((m) => [m.square + 1, m.value])).toEqual([
			[1, -2],
			[3, -3],
			[6, -2],
			[7, -3],
			[8, -2],
			[9, -4]
		]);
		expect(minimaxValue(result(board, 8))).toBe(1);
		// One more ply sees the fork.
		const deeper = minimax(board, { depth: 4 });
		expect(minimaxValue(result(board, deeper.move!))).toBe(0);
	});
});
