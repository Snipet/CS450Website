import { describe, expect, it } from 'vitest';
import { minimax, normalizeCutoff, rankChildren } from './minimax';
import { parseGameTree } from './text';
import { buildGameTree, nestedTree, nodeName, type GameTree } from './tree';

const tree = (text: string): GameTree => parseGameTree(text).tree!;

/** The two-ply game of Games and Adversarial Search, slides 9–11. */
const SLIDE = tree('[[3 12 8] [2 4 6] [14 5 2]]');

describe('minimax (slides 10–11)', () => {
	it('computes the minimax value of every node: MIN nodes 3, 2, 2, root 3', () => {
		const r = minimax(SLIDE);
		expect(r.diagnostics).toEqual([]);
		expect(r.values).toEqual([3, 3, 3, 12, 8, 2, 2, 4, 6, 2, 14, 5, 2]);
		expect(r.value).toBe(3);
		expect(r.best).toBe(1);
		expect(r.bestAction).toBe('A1');
		expect(r.choice).toEqual([1, 2, null, null, null, 6, null, null, null, 12, null, null, null]);
	});

	it('visits depth first, left to right: one step per leaf and per backed-up value', () => {
		const r = minimax(SLIDE);
		const trace = r.steps.map((s) =>
			s.kind === 'start' ? 'start' : `${s.kind} ${nodeName(SLIDE, s.node)} ${s.value}`
		);
		expect(trace).toEqual([
			'start',
			'leaf A11 3',
			'leaf A12 12',
			'leaf A13 8',
			'backup A1 3',
			'leaf A21 2',
			'leaf A22 4',
			'leaf A23 6',
			'backup A2 2',
			'leaf A31 14',
			'leaf A32 5',
			'leaf A33 2',
			'backup A3 2',
			'backup root 3',
			'decision root 3'
		]);
		expect(r.stats).toEqual({ visited: 13, leaves: 9, evals: 0, total: 13 });
	});

	it('reproduces the optimality example of slide 12: root 10', () => {
		const r = minimax(tree('[[10 11] [9 100]]'));
		expect(r.values).toEqual([10, 10, 10, 11, 9, 9, 100]);
		expect(r.bestAction).toBe('A1');
	});

	it('starts with MIN when MIN is at the root', () => {
		const r = minimax(tree('min: [[3 12 8] [2 4 6] [14 5 2]]'));
		expect([1, 5, 9].map((id) => r.values[id])).toEqual([12, 6, 14]);
		expect(r.value).toBe(6);
		expect(r.bestAction).toBe('A2');
		expect(r.steps[0]).toEqual({ kind: 'start', node: 0, player: 'min' });
	});

	it('breaks ties toward the leftmost action', () => {
		expect(minimax(tree('[[1 5] [5 2] [5 5]]')).bestAction).toBe('A3');
		expect(minimax(tree('[[5 5] [5 5]]')).bestAction).toBe('A1');
		expect(minimax(tree('[[5 7] [5 6]]')).choice[1]).toBe(2);
	});

	it('handles ragged trees and a lone terminal node', () => {
		const r = minimax(tree('[4 [2 [9 1]] [6]]'));
		expect(r.value).toBe(6);
		expect(r.values).toEqual([6, 4, 2, 2, 9, 9, 1, 6, 6]);
		const one = minimax(nestedTree(7));
		expect(one.value).toBe(7);
		expect(one.best).toBeNull();
		expect(one.steps.map((s) => s.kind)).toEqual(['start', 'leaf', 'decision']);
	});

	it('uses evaluation values at the cutoff depth (slide 24)', () => {
		const t = tree('[{5}[3 12 8] {3}[2 4 6] {1}[14 5 2]]');
		const r = minimax(t, { cutoff: 1 });
		expect(r.value).toBe(5);
		expect(r.values).toEqual([5, 5, null, null, null, 3, null, null, null, 1, null, null, null]);
		expect(r.steps.map((s) => s.kind)).toEqual([
			'start',
			'eval',
			'eval',
			'eval',
			'backup',
			'decision'
		]);
		expect(r.stats).toEqual({ visited: 4, leaves: 0, evals: 3, total: 4 });
		expect(minimax(t, { cutoff: 2 }).value).toBe(3);
	});

	it('searches below the cutoff where an evaluation value is missing', () => {
		const t = tree('[{5}[3 12 8] [2 4 6] [14 5 2]]');
		const r = minimax(t, { cutoff: 1 });
		expect(r.value).toBe(5);
		expect(r.stats.evals).toBe(1);
		expect(r.diagnostics).toEqual([
			{
				severity: 'warning',
				message:
					'No evaluation value at the cutoff depth 1 for A2, A3; those nodes are searched to the end instead.'
			}
		]);
	});

	it('reports bad cutoffs and tuple trees instead of throwing', () => {
		const r = minimax(SLIDE, { cutoff: 0 });
		expect(r.cutoff).toBeNull();
		expect(r.value).toBe(3);
		expect(r.diagnostics[0].severity).toBe('error');
		const multi = minimax(buildGameTree({ children: [{ utility: [1, 2] }] }));
		expect(multi.value).toBeNull();
		expect(multi.steps).toEqual([]);
		expect(multi.diagnostics[0].message).toContain('maxN');
	});

	it('normalizes cutoffs', () => {
		const ds: never[] = [];
		expect(normalizeCutoff(undefined, ds)).toBeNull();
		expect(normalizeCutoff(null, ds)).toBeNull();
		expect(normalizeCutoff(2, ds)).toBe(2);
		expect(ds).toEqual([]);
		const bad: { message: string }[] = [];
		expect(normalizeCutoff(1.5, bad as never)).toBeNull();
		expect(bad).toHaveLength(1);
	});

	it('ranks children from best to worst for the player to move', () => {
		const { values } = minimax(SLIDE);
		expect(rankChildren(SLIDE, values, 0)).toEqual([1, 5, 9]);
		expect(rankChildren(SLIDE, values, 9)).toEqual([12, 11, 10]);
	});
});
