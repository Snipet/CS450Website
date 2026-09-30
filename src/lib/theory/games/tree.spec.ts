import { describe, expect, it } from 'vitest';
import {
	MAX_DEPTH,
	MAX_NODES,
	buildGameTree,
	defaultActions,
	isTerminal,
	maxRandomDepth,
	nestedTree,
	nodeName,
	playerAt,
	playerAtDepth,
	playerOrder,
	randomGameTree,
	reorderTree,
	seededRandom,
	subtreeSizes,
	toSpec,
	treeFacts,
	uniformTreeSize
} from './tree';

const SLIDE = nestedTree([
	[3, 12, 8],
	[2, 4, 6],
	[14, 5, 2]
]);

describe('buildGameTree', () => {
	it('stores nodes in preorder with depths and parents', () => {
		expect(SLIDE.nodes.length).toBe(13);
		expect(SLIDE.nodes[0]).toMatchObject({ id: 0, parent: null, depth: 0, children: [1, 5, 9] });
		expect(SLIDE.nodes[1]).toMatchObject({ parent: 0, depth: 1, children: [2, 3, 4] });
		expect(SLIDE.nodes.filter((n) => n.utility !== null).map((n) => n.utility)).toEqual([
			3, 12, 8, 2, 4, 6, 14, 5, 2
		]);
		expect(SLIDE.root).toBe('max');
		expect(SLIDE.tuples).toBe(false);
		expect(SLIDE.players).toBe(2);
		expect(SLIDE.order).toBeNull();
	});

	it('labels the edges as the slides do: A1–A3, then A11–A33', () => {
		expect(SLIDE.nodes.map((n) => n.action)).toEqual([
			null,
			'A1',
			'A11',
			'A12',
			'A13',
			'A2',
			'A21',
			'A22',
			'A23',
			'A3',
			'A31',
			'A32',
			'A33'
		]);
	});

	it('keeps explicit actions and fills in the others', () => {
		const t = buildGameTree({
			children: [{ action: 'left', utility: 1 }, { utility: 2 }]
		});
		expect(t.nodes.map((n) => n.action)).toEqual([null, 'left', 'A2']);
	});

	it('detects tuple utilities and keeps the player order', () => {
		const t = buildGameTree(
			{ children: [{ utility: [1, 2, 3] }, { utility: [3, 2, 1] }] },
			{ order: [2, 1] }
		);
		expect(t.tuples).toBe(true);
		expect(t.players).toBe(3);
		expect(t.order).toEqual([2, 1]);
	});

	it('drops evaluation values of terminal nodes and turns −0 into 0', () => {
		const t = buildGameTree({ eval: -0, children: [{ utility: -0, eval: 5 }] });
		expect(Object.is(t.nodes[0].eval, 0)).toBe(true);
		expect(Object.is(t.nodes[1].utility, 0)).toBe(true);
		expect(t.nodes[1].eval).toBeNull();
	});

	it('round-trips through toSpec', () => {
		expect(buildGameTree(toSpec(SLIDE))).toEqual(SLIDE);
	});
});

describe('defaultActions', () => {
	it('separates indices with dots when a node has more than nine children', () => {
		const t = nestedTree([Array.from({ length: 10 }, (_, i) => i), 1]);
		const labels = defaultActions(t);
		expect(labels[1]).toBe('A1');
		expect(labels[2]).toBe('A1.1');
		expect(labels[11]).toBe('A1.10');
		expect(labels[12]).toBe('A2');
	});

	it('continues the digits one level further down (A111)', () => {
		const t = nestedTree([[[1, 2]], [[3]]]);
		expect(t.nodes.map((n) => n.action)).toEqual([
			null,
			'A1',
			'A11',
			'A111',
			'A112',
			'A2',
			'A21',
			'A211'
		]);
	});
});

describe('players and names', () => {
	it('alternates MAX and MIN from the root player', () => {
		expect([0, 1, 2, 3].map((d) => playerAt(SLIDE, d))).toEqual(['max', 'min', 'max', 'min']);
		expect([0, 1, 2].map((d) => playerAt({ root: 'min' }, d))).toEqual(['min', 'max', 'min']);
	});

	it('cycles through a multi-player order', () => {
		expect([0, 1, 2, 3].map((d) => playerAtDepth([1, 3, 2], d))).toEqual([1, 3, 2, 1]);
		const t = buildGameTree({ children: [{ utility: [1, 2, 3] }] });
		expect(playerOrder(t)).toEqual([1, 2, 3]);
		expect(playerOrder({ ...t, order: [3, 1] })).toEqual([3, 1]);
	});

	it('names the root "root" and other nodes by their action', () => {
		expect(nodeName(SLIDE, 0)).toBe('root');
		expect(nodeName(SLIDE, 7)).toBe('A22');
		expect(isTerminal(SLIDE, 7)).toBe(true);
		expect(isTerminal(SLIDE, 5)).toBe(false);
	});
});

describe('subtreeSizes and treeFacts', () => {
	it('counts subtree sizes', () => {
		expect(subtreeSizes(SLIDE)).toEqual([13, 4, 1, 1, 1, 4, 1, 1, 1, 4, 1, 1, 1]);
	});

	it('reports uniform trees and the depths with evaluation values', () => {
		expect(treeFacts(SLIDE)).toEqual({
			nodes: 13,
			leaves: 9,
			depth: 2,
			branching: 3,
			uniform: { b: 3, d: 2 },
			cutoffDepths: []
		});
		const t = buildGameTree({
			children: [
				{ eval: 4, children: [{ utility: 1 }, { utility: 2 }] },
				{ eval: 5, children: [{ utility: 3 }] }
			]
		});
		expect(treeFacts(t)).toMatchObject({ uniform: null, cutoffDepths: [1], branching: 2 });
		const partial = buildGameTree({
			children: [{ eval: 4, children: [{ utility: 1 }] }, { children: [{ utility: 3 }] }]
		});
		expect(treeFacts(partial).cutoffDepths).toEqual([]);
		expect(treeFacts(nestedTree(5)).uniform).toBeNull();
	});
});

describe('reorderTree', () => {
	it('moves subtrees with their actions and maps ids back', () => {
		const { tree, source } = reorderTree(SLIDE, (n) => [...n.children].reverse());
		expect(tree.nodes.map((n) => n.action)).toEqual([
			null,
			'A3',
			'A33',
			'A32',
			'A31',
			'A2',
			'A23',
			'A22',
			'A21',
			'A1',
			'A13',
			'A12',
			'A11'
		]);
		expect(tree.nodes.filter((n) => n.utility !== null).map((n) => n.utility)).toEqual([
			2, 5, 14, 6, 4, 2, 8, 12, 3
		]);
		expect(source).toEqual([0, 9, 12, 11, 10, 5, 8, 7, 6, 1, 4, 3, 2]);
		for (let i = 0; i < source.length; i++)
			expect(tree.nodes[i].action).toBe(SLIDE.nodes[source[i]].action);
	});
});

describe('random trees', () => {
	it('draws the same numbers for the same seed', () => {
		const a = seededRandom(7);
		const b = seededRandom(7);
		const xs = [a(), a(), a()];
		expect([b(), b(), b()]).toEqual(xs);
		expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
		expect(seededRandom(8)()).not.toBe(xs[0]);
	});

	it('builds uniform trees with values in range', () => {
		const t = randomGameTree({ branching: 3, depth: 4, seed: 5, min: -5, max: 5 });
		expect(treeFacts(t).uniform).toEqual({ b: 3, d: 4 });
		expect(t.nodes.length).toBe(uniformTreeSize(3, 4));
		const leaves = t.nodes.filter((n) => n.utility !== null).map((n) => n.utility as number);
		expect(leaves.every((v) => Number.isInteger(v) && v >= -5 && v <= 5)).toBe(true);
		expect(randomGameTree({ branching: 3, depth: 4, seed: 5, min: -5, max: 5 })).toEqual(t);
		expect(randomGameTree({ branching: 3, depth: 4, seed: 6, min: -5, max: 5 })).not.toEqual(t);
	});

	it('can use distinct utilities 1…bᵈ', () => {
		const t = randomGameTree({ branching: 2, depth: 3, seed: 1, distinct: true, root: 'min' });
		const leaves = t.nodes.filter((n) => n.utility !== null).map((n) => n.utility as number);
		expect([...leaves].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(t.root).toBe('min');
	});

	it('keeps random trees within the limits', () => {
		expect(uniformTreeSize(3, 2)).toBe(13);
		expect(maxRandomDepth(2)).toBe(9);
		expect(maxRandomDepth(3)).toBe(6);
		expect(maxRandomDepth(5)).toBe(4);
		expect(maxRandomDepth(1)).toBe(MAX_DEPTH);
		const t = randomGameTree({ branching: 4, depth: 9, seed: 1 });
		expect(t.nodes.length).toBeLessThanOrEqual(MAX_NODES);
		expect(treeFacts(t).depth).toBe(maxRandomDepth(4));
	});
});
