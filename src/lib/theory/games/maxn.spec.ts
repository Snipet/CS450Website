import { describe, expect, it } from 'vitest';
import { checkOrder, maxN } from './maxn';
import { parseGameTree } from './text';
import { nestedTree, nodeName, type GameTree } from './tree';

const tree = (text: string): GameTree => parseGameTree(text).tree!;

/** More general games, slide 13: the root is player 1, then player 3, then player 2. */
const SLIDE_13 = tree(`order: 1 3 2
[
  [[(1,2,6) (4,3,2)] [(6,1,2) (7,4,1)]]
  [[(5,1,1) (1,5,2)] [(7,7,1) (5,4,5)]]
]`);

const at = (r: ReturnType<typeof maxN>, depth: number) =>
	r.tree.nodes.filter((n) => n.depth === depth).map((n) => r.values[n.id]);

describe('maxN (slide 13)', () => {
	it('backs up the utility tuples of the slide', () => {
		const r = maxN(SLIDE_13);
		expect(r.diagnostics).toEqual([]);
		expect(r.order).toEqual([1, 3, 2]);
		expect(at(r, 3)).toEqual([
			[1, 2, 6],
			[4, 3, 2],
			[6, 1, 2],
			[7, 4, 1],
			[5, 1, 1],
			[1, 5, 2],
			[7, 7, 1],
			[5, 4, 5]
		]);
		expect(at(r, 2)).toEqual([
			[4, 3, 2],
			[7, 4, 1],
			[1, 5, 2],
			[7, 7, 1]
		]);
		expect(at(r, 1)).toEqual([
			[4, 3, 2],
			[1, 5, 2]
		]);
		expect(r.value).toEqual([4, 3, 2]);
		expect(r.bestAction).toBe('A1');
	});

	it('records a step per terminal node and per backed-up tuple', () => {
		const r = maxN(SLIDE_13);
		const trace = r.steps.map((s) =>
			s.kind === 'backup'
				? `P${s.player} ${nodeName(r.tree, s.node)} → ${nodeName(r.tree, s.best)}`
				: s.kind
		);
		expect(trace).toEqual([
			'start',
			'leaf',
			'leaf',
			'P2 A11 → A112',
			'leaf',
			'leaf',
			'P2 A12 → A122',
			'P3 A1 → A11',
			'leaf',
			'leaf',
			'P2 A21 → A212',
			'leaf',
			'leaf',
			'P2 A22 → A221',
			'P3 A2 → A21',
			'P1 root → A1',
			'decision'
		]);
		expect(r.stats).toEqual({ visited: 15, leaves: 8, evals: 0, total: 15 });
	});

	it('follows another player order and breaks ties toward the leftmost child', () => {
		const r = maxN(SLIDE_13, { order: [1, 2, 3] });
		// Player 3, then 2, then 1 at the root, who takes the leftmost of two tuples tied at 1.
		expect(r.value).toEqual([1, 2, 6]);
		const tie = maxN(tree('[(1,5) (2,5)]'), { order: [2] });
		expect(tie.bestAction).toBe('A1');
	});

	it('uses evaluation tuples at the cutoff', () => {
		const t = tree('order: 2 1 [{1,9}[(3,3) (4,1)] {2,8}[(5,0)]]');
		const r = maxN(t, { cutoff: 1 });
		expect(r.value).toEqual([1, 9]);
		expect(r.stats.evals).toBe(2);
		expect(maxN(t).value).toEqual([4, 1]);
	});

	it('reports numeric trees and bad orders', () => {
		const two = maxN(nestedTree([1, 2]));
		expect(two.value).toBeNull();
		expect(two.diagnostics[0].message).toContain('minimax');
		const bad = maxN(SLIDE_13, { order: [1, 4] });
		expect(bad.value).toBeNull();
		expect(bad.diagnostics[0].message).toBe(
			'Player 4 does not exist: players are numbered 1 to 3.'
		);
		expect(checkOrder([], 3, [])).toBeNull();
		expect(checkOrder([2, 2], 3, [])).toEqual([2, 2]);
	});
});
