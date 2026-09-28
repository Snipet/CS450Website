import { describe, expect, it } from 'vitest';
import { search } from '../search/search';
import { SLIDE_GOAL, SLIDE_START, moves } from './board';
import {
	PUZZLE_HEURISTICS,
	manhattanDistance,
	misplacedTiles,
	puzzleHeuristic,
	tileDistances
} from './heuristics';
import { PUZZLE_GRAPH_LIMITS, puzzleProblem, seededRandom } from './problem';

/** Optimal solution length h*(n) of every board reachable from the slide goal. */
function trueDistances(): Map<string, number> {
	const everywhere = { ...puzzleProblem(SLIDE_GOAL, SLIDE_GOAL, 'zero'), isGoal: () => false };
	const r = search(everywhere, {
		strategy: 'bfs',
		mode: 'graph',
		record: 'summary',
		...PUZZLE_GRAPH_LIMITS
	});
	const out = new Map<string, number>();
	for (const n of r.nodes) if (!out.has(n.key)) out.set(n.key, n.depth);
	return out;
}

describe('slide values (Informed Search slide 32)', () => {
	it('h1(start) = 8', () => {
		expect(misplacedTiles(SLIDE_START, SLIDE_GOAL)).toBe(8);
	});

	it('h2(start) = 3+1+2+2+2+3+3+2 = 18', () => {
		expect(manhattanDistance(SLIDE_START, SLIDE_GOAL)).toBe(18);
		const terms = tileDistances(SLIDE_START, SLIDE_GOAL);
		expect(terms.map((t) => t.tile)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(terms.map((t) => t.distance)).toEqual([3, 1, 2, 2, 2, 3, 3, 2]);
		expect(terms.map((t) => t.distance).join('+')).toBe('3+1+2+2+2+3+3+2');
	});
});

describe('misplacedTiles', () => {
	it('is 0 at the goal and never counts the blank', () => {
		expect(misplacedTiles(SLIDE_GOAL, SLIDE_GOAL)).toBe(0);
		// One move: only tile 1 is out of place; the blank moved too but does not count.
		expect(misplacedTiles('102345678', SLIDE_GOAL)).toBe(1);
		// Tile 4 stays in the middle.
		expect(misplacedTiles('876543210', SLIDE_GOAL)).toBe(7);
	});

	it('works for any goal', () => {
		expect(misplacedTiles(SLIDE_GOAL, SLIDE_START)).toBe(8);
		expect(misplacedTiles('123456780', '123456708')).toBe(1);
	});
});

describe('manhattanDistance', () => {
	it('adds rows plus columns for each tile', () => {
		expect(manhattanDistance(SLIDE_GOAL, SLIDE_GOAL)).toBe(0);
		expect(manhattanDistance('102345678', SLIDE_GOAL)).toBe(1);
		// Tile 8 at the top left is 2 rows and 2 columns from its goal square.
		expect(manhattanDistance('812345670', SLIDE_GOAL)).toBe(4);
		// Tile 8 at the top left (4 away) and tile 1 at the bottom right (3 away).
		expect(manhattanDistance('802345671', SLIDE_GOAL)).toBe(4 + 3);
	});

	it('equals the sum of tileDistances', () => {
		for (const b of [SLIDE_START, '876543210', '806547231', '283475061']) {
			const sum = tileDistances(b, SLIDE_GOAL).reduce((s, t) => s + t.distance, 0);
			expect(manhattanDistance(b, SLIDE_GOAL)).toBe(sum);
		}
	});
});

describe('puzzleHeuristic', () => {
	it('lists h1, h2, max and zero', () => {
		expect(PUZZLE_HEURISTICS).toEqual(['h1', 'h2', 'max', 'zero']);
	});

	it('returns each heuristic for a fixed goal', () => {
		expect(puzzleHeuristic(SLIDE_GOAL, 'h1')(SLIDE_START)).toBe(8);
		expect(puzzleHeuristic(SLIDE_GOAL, 'h2')(SLIDE_START)).toBe(18);
		expect(puzzleHeuristic(SLIDE_GOAL, 'max')(SLIDE_START)).toBe(18);
		expect(puzzleHeuristic(SLIDE_GOAL, 'zero')(SLIDE_START)).toBe(0);
		expect(puzzleHeuristic(SLIDE_START, 'h2')(SLIDE_GOAL)).toBe(18);
	});
});

describe('over the whole state space', () => {
	const hStar = trueDistances();

	it('h1 ≤ h2 ≤ h*(n) for every reachable board: both admissible, h2 dominates h1 (slides 32, 35)', () => {
		expect(hStar.size).toBe(181_440);
		let h2AboveH1 = 0;
		for (const [board, d] of hStar) {
			const h1 = misplacedTiles(board, SLIDE_GOAL);
			const h2 = manhattanDistance(board, SLIDE_GOAL);
			if (!(h1 <= h2 && h2 <= d)) throw new Error(`${board}: h1 ${h1}, h2 ${h2}, h* ${d}`);
			if (h2 > h1) h2AboveH1++;
		}
		// Strictly larger on most boards.
		expect(h2AboveH1).toBeGreaterThan(hStar.size / 2);
	});

	it('the slide start is 26 moves from the goal: h1 = 8 and h2 = 18 underestimate it', () => {
		expect(hStar.get(SLIDE_START)).toBe(26);
	});

	it('h1, h2 and max(h1, h2) are consistent: h(n) ≤ 1 + h(n′) for every move', () => {
		const hs = PUZZLE_HEURISTICS.map((h) => puzzleHeuristic(SLIDE_GOAL, h));
		let pairs = 0;
		for (const board of hStar.keys()) {
			const here = hs.map((h) => h(board));
			for (const m of moves(board)) {
				pairs++;
				hs.forEach((h, i) => {
					if (here[i] > 1 + h(m.board)) throw new Error(`${board} → ${m.board}`);
				});
			}
		}
		// The blank is in a corner (2 moves), on an edge (3) or in the center (4) equally often.
		expect(pairs).toBe((181_440 * 24) / 9);
	});

	it('A* and UCS graph search find the BFS-optimal length on random boards; greedy and weighted A* stay within bounds', () => {
		const boards = [...hStar.keys()];
		const random = seededRandom(2024);
		for (let k = 0; k < 12; k++) {
			const board = boards[Math.floor(random() * boards.length)];
			const best = hStar.get(board)!;
			const run = (strategy: 'astar' | 'ucs' | 'greedy' | 'wastar', h: 'h1' | 'h2' | 'max') =>
				search(puzzleProblem(board, SLIDE_GOAL, h), {
					strategy,
					mode: 'graph',
					record: 'summary',
					...PUZZLE_GRAPH_LIMITS
				}).solution!.depth;
			for (const h of ['h1', 'h2', 'max'] as const)
				expect(run('astar', h), `${board} ${h}`).toBe(best);
			if (best <= 20) expect(run('ucs', 'h2'), board).toBe(best);
			expect(run('greedy', 'h2'), board).toBeGreaterThanOrEqual(best);
			expect(run('wastar', 'h2'), board).toBeLessThanOrEqual(2 * best);
		}
	});
});
