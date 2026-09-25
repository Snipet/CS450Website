import { describe, expect, it } from 'vitest';
import { SLIDE_GOAL, SLIDE_START, playMoves, tileDistances } from '$lib/theory/puzzle';
import {
	ACTION_ARROWS,
	formatMs,
	heuristicValues,
	manhattanSum,
	moveSentence,
	parity,
	playbackCaption,
	runOutcomeText,
	solvabilityText,
	speakBoard
} from './describe';
import { STATE_SPACE_SIZES, TYPICAL_COSTS } from './reference';
import type { SolverRun } from './solvers';

const run = (extra: Partial<SolverRun>): SolverRun => ({
	solver: 'bfs',
	start: SLIDE_START,
	goal: SLIDE_GOAL,
	outcome: 'solved',
	expanded: 0,
	generated: 0,
	maxFrontier: 0,
	explored: 0,
	length: 26,
	actions: [],
	ms: 0,
	budget: null,
	depthLimit: null,
	...extra
});

describe('moves and boards', () => {
	it('describes a move of the blank and the tile that slides', () => {
		expect(moveSentence('Up', 2)).toBe('Move blank Up: tile 2 slides down.');
		expect(moveSentence('Left', 5)).toBe('Move blank Left: tile 5 slides right.');
		expect(ACTION_ARROWS).toEqual({ Left: '←', Right: '→', Up: '↑', Down: '↓' });
	});

	it('reads a board row by row', () => {
		expect(speakBoard(SLIDE_START)).toBe('7, 2, 4; 5, blank, 6; 8, 3, 1');
	});
});

describe('heuristics', () => {
	it('writes h2 like the slide (Informed Search slide 32)', () => {
		expect(manhattanSum(tileDistances(SLIDE_START, SLIDE_GOAL))).toBe('3+1+2+2+2+3+3+2 = 18');
		expect(manhattanSum(tileDistances(SLIDE_GOAL, SLIDE_GOAL))).toBe('0+0+0+0+0+0+0+0 = 0');
	});

	it('returns h1 and h2', () => {
		expect(heuristicValues(SLIDE_START, SLIDE_GOAL)).toEqual({ h1: 8, h2: 18 });
	});
});

describe('solvabilityText', () => {
	it('states the inversion counts and their parities', () => {
		expect(parity(16)).toBe('even');
		expect(parity(1)).toBe('odd');
		expect(solvabilityText(SLIDE_START, SLIDE_GOAL)).toEqual({
			solvable: true,
			text: 'The start board has 16 inversions (even) and the goal 0 inversions (even). The parities match, so the goal can be reached.'
		});
		const no = solvabilityText('012345687', SLIDE_GOAL);
		expect(no.solvable).toBe(false);
		expect(no.text).toBe(
			'The start board has 1 inversion (odd) and the goal 0 inversions (even). No move changes the parity, so no sequence of moves reaches the goal.'
		);
	});
});

describe('run text', () => {
	it('formats run times', () => {
		expect(formatMs(0.2)).toBe('<1');
		expect(formatMs(12.4)).toBe('12');
		expect(formatMs(1834.2)).toBe('1,834');
		expect(formatMs(Number.NaN)).toBe('–');
	});

	it('states what a run found', () => {
		expect(runOutcomeText(run({}))).toBe('26 moves');
		expect(runOutcomeText(run({ length: 1 }))).toBe('1 move');
		expect(
			runOutcomeText(run({ outcome: 'limit', generated: 1_000_002, length: null, budget: 1e6 }))
		).toBe('Stopped after 1,000,002 nodes');
		expect(runOutcomeText(run({ outcome: 'exhausted', explored: 181_440, length: null }))).toBe(
			'No solution: 181,440 states explored'
		);
		expect(runOutcomeText(run({ outcome: 'exhausted', length: null }))).toBe('No solution');
	});
});

describe('playbackCaption', () => {
	const actions = ['Left', 'Down', 'Left', 'Up'] as const;
	const boards = playMoves('320415678', actions);

	it('describes the start, each move, and the goal', () => {
		expect(boards.at(-1)).toBe(SLIDE_GOAL);
		expect(playbackCaption(boards, actions, 0, SLIDE_GOAL)).toBe(
			'Start state. g = 0, h1 = 4, h2 = 4.'
		);
		expect(playbackCaption(boards, actions, 1, SLIDE_GOAL)).toBe(
			'Move 1 of 4. Move blank Left: tile 2 slides right. g = 1, h1 = 3, h2 = 3.'
		);
		expect(playbackCaption(boards, actions, 4, SLIDE_GOAL)).toBe(
			'Move 4 of 4. Move blank Up: tile 3 slides down. g = 4, h1 = 0, h2 = 0. Goal reached.'
		);
		// Out-of-range indices are clamped.
		expect(playbackCaption(boards, actions, 9, SLIDE_GOAL)).toBe(
			playbackCaption(boards, actions, 4, SLIDE_GOAL)
		);
	});
});

describe('reference numbers', () => {
	it('quotes Informed Search slide 36', () => {
		expect(TYPICAL_COSTS).toEqual([
			{ depth: 12, ids: '3,644,035', astarH1: '227', astarH2: '73' },
			{ depth: 24, ids: '≈ 54,000,000,000', astarH1: '39,135', astarH2: '1,641' }
		]);
	});

	it('quotes Solving Problems by Searching slide 10', () => {
		expect(STATE_SPACE_SIZES.map((s) => s.states)).toEqual(['181,440', '~1.3 trillion', '~10²⁵']);
		expect(STATE_SPACE_SIZES[0].note).toBe('9!/2');
	});
});
