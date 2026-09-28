import { describe, expect, it } from 'vitest';
import { search } from '../search/search';
import { SLIDE_GOAL, SLIDE_START, moves } from './board';
import { PUZZLE_GRAPH_LIMITS, puzzleProblem, scramble } from './problem';
import { REACHABLE_STATES, inversions, isSolvable } from './solvability';

/** Every arrangement of the digits 0–8. */
function* permutations(digits: string): Generator<string> {
	if (digits.length <= 1) {
		yield digits;
		return;
	}
	for (let i = 0; i < digits.length; i++) {
		const rest = digits.slice(0, i) + digits.slice(i + 1);
		for (const p of permutations(rest)) yield digits[i] + p;
	}
}

describe('inversions', () => {
	it('counts out-of-order pairs of tiles, skipping the blank', () => {
		expect(inversions(SLIDE_GOAL)).toBe(0);
		// 7 2 4 5 6 8 3 1: 6 + 1 + 2 + 2 + 2 + 2 + 1 = 16.
		expect(inversions(SLIDE_START)).toBe(16);
		expect(inversions('876543210')).toBe(28);
		expect(inversions('021345678')).toBe(1);
	});

	it('never changes parity with a move', () => {
		for (let seed = 1; seed <= 20; seed++) {
			const board = scramble(SLIDE_GOAL, 30, seed);
			for (const m of moves(board)) {
				expect(Math.abs(inversions(m.board) - inversions(board)) % 2).toBe(0);
			}
		}
	});
});

describe('isSolvable', () => {
	it('compares inversion parities', () => {
		expect(isSolvable(SLIDE_START, SLIDE_GOAL)).toBe(true);
		expect(isSolvable(SLIDE_GOAL, SLIDE_START)).toBe(true);
		// Two tiles swapped.
		expect(isSolvable('021345678', SLIDE_GOAL)).toBe(false);
		expect(isSolvable('012345687', SLIDE_GOAL)).toBe(false);
		expect(isSolvable('714506832', SLIDE_GOAL)).toBe(false);
		// A move of the blank is not a swap of two tiles.
		expect(isSolvable('102345678', SLIDE_GOAL)).toBe(true);
	});

	it('holds for exactly half of all 9! arrangements', () => {
		let solvable = 0;
		let total = 0;
		for (const p of permutations('012345678')) {
			total++;
			if (isSolvable(p, SLIDE_GOAL)) solvable++;
		}
		expect(total).toBe(362_880);
		expect(solvable).toBe(REACHABLE_STATES);
	});
});

describe('REACHABLE_STATES (Solving Problems by Searching, slide 10)', () => {
	it('is 9!/2', () => {
		expect(REACHABLE_STATES).toBe(181_440);
		expect(REACHABLE_STATES).toBe(362_880 / 2);
	});

	it('is the number of states BFS graph search visits when the goal is unreachable', () => {
		const unreachable = '021345678';
		const r = search(puzzleProblem(SLIDE_GOAL, unreachable, 'zero'), {
			strategy: 'bfs',
			mode: 'graph',
			record: 'summary',
			...PUZZLE_GRAPH_LIMITS
		});
		expect(r.solution).toBeNull();
		expect(r.failure).toBe('exhausted');
		expect(r.stats.explored).toBe(REACHABLE_STATES);
		expect(r.stats.expanded).toBe(REACHABLE_STATES);
		// Every state the search reached is solvable (same parity as the start).
		const keys = new Set(r.nodes.map((n) => n.key));
		expect(keys.size).toBe(REACHABLE_STATES);
		for (const k of keys) if (!isSolvable(k, SLIDE_GOAL)) throw new Error(k);
	});

	it('includes the slide start state', () => {
		expect(isSolvable(SLIDE_START, SLIDE_GOAL)).toBe(true);
	});
});
