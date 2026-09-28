import { describe, expect, it } from 'vitest';
import { search } from '../search/search';
import type { SearchOptions } from '../search/types';
import { OPPOSITE, SLIDE_GOAL, SLIDE_START, formatBoard, moves, playMoves } from './board';
import { manhattanDistance, misplacedTiles } from './heuristics';
import {
	PUZZLE_GRAPH_LIMITS,
	optimalSolutionLength,
	puzzleProblem,
	scramble,
	scrambleMoves,
	seededRandom
} from './problem';
import { REACHABLE_STATES, isSolvable } from './solvability';
import type { Board, PuzzleAction, PuzzleHeuristic } from './types';

const graph = (
	start: Board,
	h: PuzzleHeuristic,
	strategy: SearchOptions['strategy'],
	goal: Board = SLIDE_GOAL
) =>
	search(puzzleProblem(start, goal, h), {
		strategy,
		mode: 'graph',
		record: 'summary',
		...PUZZLE_GRAPH_LIMITS
	});

describe('puzzleProblem', () => {
	const p = puzzleProblem(SLIDE_START, SLIDE_GOAL, 'h2');

	it('starts at the start board and tests for the goal board', () => {
		expect(p.initial).toBe(SLIDE_START);
		expect(p.isGoal(SLIDE_GOAL)).toBe(true);
		expect(p.isGoal(SLIDE_START)).toBe(false);
	});

	it('keys states by board and labels them with the formatted board', () => {
		expect(p.key(SLIDE_START)).toBe('724506831');
		expect(p.label?.(SLIDE_START)).toBe('7 2 4 / 5 _ 6 / 8 3 1');
	});

	it('lists successors Left, Right, Up, Down with cost 1', () => {
		expect(p.successors(SLIDE_START)).toEqual(
			moves(SLIDE_START).map((m) => ({ action: m.action, state: m.board, cost: 1 }))
		);
		expect(p.successors(SLIDE_START).map((s) => s.action)).toEqual(['Left', 'Right', 'Up', 'Down']);
	});

	it('uses the chosen heuristic', () => {
		expect(p.h?.(SLIDE_START)).toBe(18);
		expect(puzzleProblem(SLIDE_START, SLIDE_GOAL, 'h1').h?.(SLIDE_START)).toBe(8);
		expect(puzzleProblem(SLIDE_START, SLIDE_GOAL, 'max').h?.(SLIDE_START)).toBe(18);
		expect(puzzleProblem(SLIDE_START, SLIDE_GOAL, 'zero').h?.(SLIDE_START)).toBe(0);
		expect(puzzleProblem(SLIDE_START, SLIDE_GOAL).h?.(SLIDE_START)).toBe(18);
	});
});

describe('solving the slide start state (Informed Search slide 32)', () => {
	const bfs = graph(SLIDE_START, 'zero', 'bfs');
	const h1 = graph(SLIDE_START, 'h1', 'astar');
	const h2 = graph(SLIDE_START, 'h2', 'astar');

	it('BFS graph search finds an optimal solution of 26 moves', () => {
		expect(bfs.solution?.depth).toBe(26);
		expect(bfs.solution?.cost).toBe(26);
	});

	it('A* with h2 and with h1 find solutions of the same optimal length', () => {
		expect(h2.solution?.depth).toBe(26);
		expect(h1.solution?.depth).toBe(26);
	});

	it('each solution plays from the start to the goal', () => {
		for (const r of [bfs, h1, h2]) {
			const actions = r.solution!.actions as PuzzleAction[];
			const boards = playMoves(SLIDE_START, actions);
			expect(boards).toHaveLength(27);
			expect(boards[26]).toBe(SLIDE_GOAL);
			expect(r.solution!.states).toEqual(boards.map((b) => formatBoard(b)));
		}
	});

	it('A* with h2 expands fewer nodes than A* with h1, which expands fewer than BFS', () => {
		expect(h2.stats.expanded).toBeLessThan(h1.stats.expanded);
		expect(h1.stats.expanded).toBeLessThan(bfs.stats.expanded);
	});

	it('greedy best-first and weighted A* (α = 2) find longer solutions with fewer expansions', () => {
		const greedy = graph(SLIDE_START, 'h2', 'greedy');
		const weighted = search(puzzleProblem(SLIDE_START, SLIDE_GOAL, 'h2'), {
			strategy: 'wastar',
			weight: 2,
			mode: 'graph',
			record: 'summary',
			...PUZZLE_GRAPH_LIMITS
		});
		expect(greedy.solution!.depth).toBeGreaterThan(26);
		expect(weighted.solution!.depth).toBeGreaterThanOrEqual(26);
		// Weighted A* returns at most α times the optimal cost (slide 38).
		expect(weighted.solution!.depth).toBeLessThanOrEqual(2 * 26);
		expect(weighted.stats.expanded).toBeLessThan(h2.stats.expanded);
	});
});

describe('dominance (Informed Search slide 35)', () => {
	it('A* with h2 expands fewer nodes than A* with h1 on boards at several depths', () => {
		const boards = ['350421678', '431802657', '257804361', '283475061', '806547231'];
		for (const b of boards) {
			const e1 = graph(b, 'h1', 'astar');
			const e2 = graph(b, 'h2', 'astar');
			expect(e2.solution?.depth, b).toBe(e1.solution?.depth);
			expect(e2.stats.expanded, b).toBeLessThan(e1.stats.expanded);
		}
	});
});

describe('optimalSolutionLength', () => {
	it('counts the moves of an optimal solution', () => {
		expect(optimalSolutionLength(SLIDE_GOAL, SLIDE_GOAL)).toBe(0);
		expect(optimalSolutionLength('102345678', SLIDE_GOAL)).toBe(1);
		expect(optimalSolutionLength('320415678', SLIDE_GOAL)).toBe(4);
	});

	it('returns null when the goal is unreachable', () => {
		expect(optimalSolutionLength('021345678', SLIDE_GOAL)).toBeNull();
	});
});

describe('PUZZLE_GRAPH_LIMITS', () => {
	it('covers every reachable state with up to four successors', () => {
		expect(PUZZLE_GRAPH_LIMITS.maxExpansions).toBeGreaterThan(REACHABLE_STATES);
		expect(PUZZLE_GRAPH_LIMITS.maxNodes).toBeGreaterThan(4 * REACHABLE_STATES);
	});
});

describe('seededRandom', () => {
	it('is reproducible and stays in [0, 1)', () => {
		const a = seededRandom(7);
		const b = seededRandom(7);
		const xs = Array.from({ length: 200 }, () => a());
		expect(Array.from({ length: 200 }, () => b())).toEqual(xs);
		for (const x of xs) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(1);
		}
		expect(seededRandom(8)()).not.toBe(seededRandom(7)());
		expect(Number.isFinite(seededRandom(Number.NaN)())).toBe(true);
	});
});

describe('scramble', () => {
	it('is reproducible for the same goal, count and seed', () => {
		expect(scramble(SLIDE_GOAL, 20, 3)).toBe(scramble(SLIDE_GOAL, 20, 3));
		expect(scrambleMoves(SLIDE_GOAL, 20, 3)).toEqual(scrambleMoves(SLIDE_GOAL, 20, 3));
		const boards = new Set(Array.from({ length: 10 }, (_, s) => scramble(SLIDE_GOAL, 20, s)));
		expect(boards.size).toBeGreaterThan(5);
	});

	it('returns the goal for zero (or invalid) move counts', () => {
		expect(scramble(SLIDE_GOAL, 0, 1)).toBe(SLIDE_GOAL);
		expect(scramble(SLIDE_GOAL, -3, 1)).toBe(SLIDE_GOAL);
		expect(scramble(SLIDE_GOAL, Number.NaN, 1)).toBe(SLIDE_GOAL);
		expect(scrambleMoves(SLIDE_GOAL, 2.7, 1)).toHaveLength(2);
	});

	it('walks the blank without undoing the previous move', () => {
		for (let seed = 0; seed < 30; seed++) {
			const walk = scrambleMoves(SLIDE_GOAL, 40, seed);
			expect(walk).toHaveLength(40);
			for (let i = 1; i < walk.length; i++) expect(walk[i]).not.toBe(OPPOSITE[walk[i - 1]]);
			const boards = playMoves(SLIDE_GOAL, walk);
			expect(boards).toHaveLength(41);
			expect(boards[40]).toBe(scramble(SLIDE_GOAL, 40, seed));
		}
	});

	it('stays solvable, and short walks are optimal', () => {
		for (let seed = 0; seed < 10; seed++) {
			const b = scramble(SLIDE_GOAL, 5, seed);
			expect(isSolvable(b, SLIDE_GOAL)).toBe(true);
			// No cycle of the 8-puzzle is shorter than 12 moves.
			expect(optimalSolutionLength(b, SLIDE_GOAL)).toBe(5);
		}
		const far = scramble(SLIDE_START, 60, 1);
		expect(isSolvable(far, SLIDE_START)).toBe(true);
	});

	it('scrambles the goal it is given', () => {
		const b = scramble(SLIDE_START, 1, 1);
		expect(moves(SLIDE_START).map((m) => m.board)).toContain(b);
		expect(misplacedTiles(b, SLIDE_START)).toBe(1);
		expect(manhattanDistance(b, SLIDE_START)).toBe(1);
	});
});
