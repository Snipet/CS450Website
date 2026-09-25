import { describe, expect, it } from 'vitest';
import { layoutTree, type TreeLayout, type TreeLayoutNode } from './tree-layout';

/** Deterministic pseudo-random numbers (mulberry32). */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A random tree in creation order: each node's parent is an earlier node. */
function randomTree(n: number, seed: number, bushiness = 0.35): TreeLayoutNode[] {
	const r = rng(seed);
	const nodes: TreeLayoutNode[] = [{ id: 0, parent: null }];
	for (let id = 1; id < n; id++) {
		// Favor recent nodes so trees get deep as well as wide.
		const back = Math.floor(r() ** (1 / bushiness) * id);
		nodes.push({ id, parent: id - 1 - Math.min(back, id - 1) });
	}
	return nodes;
}

function depths(nodes: readonly TreeLayoutNode[]): Map<number, number> {
	const d = new Map<number, number>();
	for (const n of nodes) d.set(n.id, n.parent === null ? 0 : d.get(n.parent)! + 1);
	return d;
}

function expectNoOverlap(
	nodes: readonly TreeLayoutNode[],
	layout: TreeLayout,
	width: (id: number) => number,
	gap: number
) {
	const d = depths(nodes);
	const rows = new Map<number, number[]>();
	for (const n of nodes) {
		const row = rows.get(d.get(n.id)!) ?? [];
		row.push(n.id);
		rows.set(d.get(n.id)!, row);
	}
	for (const row of rows.values()) {
		const sorted = [...row].sort((a, b) => layout.pos.get(a)!.x - layout.pos.get(b)!.x);
		for (let k = 1; k < sorted.length; k++) {
			const a = sorted[k - 1];
			const b = sorted[k];
			const room = layout.pos.get(b)!.x - layout.pos.get(a)!.x - (width(a) + width(b)) / 2;
			expect(room).toBeGreaterThanOrEqual(gap - 1e-6);
		}
	}
}

function expectCentered(nodes: readonly TreeLayoutNode[], layout: TreeLayout) {
	const kids = new Map<number, number[]>();
	for (const n of nodes)
		if (n.parent !== null) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n.id]);
	for (const [parent, list] of kids) {
		const first = layout.pos.get(list[0])!.x;
		const last = layout.pos.get(list[list.length - 1])!.x;
		expect(layout.pos.get(parent)!.x).toBeCloseTo((first + last) / 2, 6);
	}
}

describe('layoutTree', () => {
	it('centers a parent over its children and keeps their order', () => {
		const nodes = [
			{ id: 0, parent: null },
			{ id: 1, parent: 0 },
			{ id: 2, parent: 0 },
			{ id: 3, parent: 0 }
		];
		const t = layoutTree(nodes, 0, { width: () => 20, hGap: 10, levelHeight: 20, vGap: 30 });
		const x = (id: number) => t.pos.get(id)!.x;
		expect([x(1), x(2), x(3)]).toEqual([10, 40, 70]);
		expect(x(0)).toBe(40);
		expect(t.pos.get(0)!.y).toBe(10);
		expect(t.pos.get(1)!.y).toBe(60);
		expect(t.width).toBe(80);
		expect(t.height).toBe(70);
		expect(t.depth).toBe(1);
	});

	it('uses node widths: wide neighbors are pushed apart', () => {
		const nodes = [
			{ id: 0, parent: null },
			{ id: 1, parent: 0 },
			{ id: 2, parent: 0 }
		];
		const t = layoutTree(nodes, 0, { width: (id) => (id === 1 ? 100 : 20), hGap: 10 });
		expect(t.pos.get(2)!.x - t.pos.get(1)!.x).toBe(50 + 10 + 10);
		expect(t.pos.get(1)!.x).toBe(50); // leftmost box edge at 0
	});

	it('spaces non-siblings by the cousin gap', () => {
		const nodes = [
			{ id: 0, parent: null },
			{ id: 1, parent: 0 },
			{ id: 2, parent: 0 },
			{ id: 3, parent: 1 },
			{ id: 4, parent: 2 }
		];
		const t = layoutTree(nodes, 0, { width: () => 10, hGap: 10, cousinGap: 30 });
		expect(t.pos.get(4)!.x - t.pos.get(3)!.x).toBe(40);
	});

	it('packs subtrees by their contours, not their bounding boxes', () => {
		// Left child has a deep, wide-at-the-bottom subtree; right child is a leaf.
		const nodes: TreeLayoutNode[] = [
			{ id: 0, parent: null },
			{ id: 1, parent: 0 },
			{ id: 2, parent: 0 },
			{ id: 3, parent: 1 },
			{ id: 4, parent: 3 },
			{ id: 5, parent: 3 },
			{ id: 6, parent: 3 }
		];
		const t = layoutTree(nodes, 0, { width: () => 20, hGap: 10, cousinGap: 10 });
		// 2 sits right next to 1 (siblings), even though 3's children extend further right.
		expect(t.pos.get(2)!.x - t.pos.get(1)!.x).toBe(30);
		expectNoOverlap(nodes, t, () => 20, 10);
	});

	it('spreads small subtrees evenly between large ones', () => {
		// Root with children a, b, c, d; a and d have wide subtrees, b and c are leaves.
		const nodes: TreeLayoutNode[] = [{ id: 0, parent: null }];
		for (let id = 1; id <= 4; id++) nodes.push({ id, parent: 0 });
		let next = 5;
		for (const p of [1, 4]) for (let k = 0; k < 5; k++) nodes.push({ id: next++, parent: p });
		const t = layoutTree(nodes, 0, { width: () => 10, hGap: 10, cousinGap: 10 });
		const x = [1, 2, 3, 4].map((id) => t.pos.get(id)!.x);
		expect(x[2] - x[1]).toBeCloseTo(x[1] - x[0], 6);
		expect(x[3] - x[2]).toBeCloseTo(x[2] - x[1], 6);
		expectCentered(nodes, t);
	});

	it('random trees: no overlaps at any depth, parents centered, children in order', () => {
		for (let seed = 1; seed <= 40; seed++) {
			const nodes = randomTree(20 + seed * 7, seed);
			const r = rng(seed * 31);
			const widths = new Map(nodes.map((n) => [n.id, 10 + Math.floor(r() * 60)]));
			const width = (id: number) => widths.get(id)!;
			const t = layoutTree(nodes, 0, { width, hGap: 8, cousinGap: 14 });
			expect(t.pos.size).toBe(nodes.length);
			expectNoOverlap(nodes, t, width, 8);
			expectCentered(nodes, t);
			// Children appear left to right in input order.
			const kids = new Map<number, number[]>();
			for (const n of nodes)
				if (n.parent !== null) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n.id]);
			for (const list of kids.values()) {
				const xs = list.map((id) => t.pos.get(id)!.x);
				expect([...xs].sort((a, b) => a - b)).toEqual(xs);
			}
			// The drawing starts at x = 0 and spans exactly the boxes.
			const lefts = nodes.map((n) => t.pos.get(n.id)!.x - width(n.id) / 2);
			const rights = nodes.map((n) => t.pos.get(n.id)!.x + width(n.id) / 2);
			expect(Math.min(...lefts)).toBeCloseTo(0, 6);
			expect(Math.max(...rights)).toBeCloseTo(t.width, 6);
		}
	});

	it('is deterministic', () => {
		const nodes = randomTree(300, 7);
		const a = layoutTree(nodes, 0, { width: (id) => 10 + (id % 5) * 7 });
		const b = layoutTree(nodes, 0, { width: (id) => 10 + (id % 5) * 7 });
		expect([...a.pos.entries()]).toEqual([...b.pos.entries()]);
	});

	it('lays out 5 000 nodes quickly and handles very deep trees', () => {
		const nodes = randomTree(5000, 99, 0.5);
		const t0 = performance.now();
		const t = layoutTree(nodes, 0, { width: (id) => 20 + (id % 7) * 5 });
		const elapsed = performance.now() - t0;
		expect(t.pos.size).toBe(5000);
		expect(elapsed).toBeLessThan(250);

		// A 20 000-node chain would overflow a recursive implementation.
		const chain: TreeLayoutNode[] = [{ id: 0, parent: null }];
		for (let id = 1; id < 20_000; id++) chain.push({ id, parent: id - 1 });
		const c = layoutTree(chain, 0, { width: () => 30 });
		expect(c.depth).toBe(19_999);
		expect(c.width).toBe(30);
		expect(c.pos.get(19_999)!.x).toBe(15);
	});

	it('ignores unreachable nodes and handles a missing root', () => {
		const nodes = [
			{ id: 0, parent: null },
			{ id: 1, parent: 0 },
			{ id: 2, parent: 9 },
			{ id: 3, parent: null }
		];
		const t = layoutTree(nodes, 0, { width: () => 10 });
		expect([...t.pos.keys()]).toEqual([0, 1]);
		// A subtree can be laid out on its own.
		expect([...layoutTree(nodes, 1, { width: () => 10 }).pos.keys()]).toEqual([1]);
		expect(layoutTree(nodes, 42, { width: () => 10 })).toEqual({
			pos: new Map(),
			width: 0,
			height: 0,
			depth: -1
		});
		// Bad widths count as zero.
		expect(layoutTree([{ id: 0, parent: null }], 0, { width: () => NaN }).width).toBe(0);
	});
});
