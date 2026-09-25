import { describe, expect, it } from 'vitest';
import {
	BINARY_TREE_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { search, type SearchOptions } from '$lib/theory/search';
import { PILL_HEIGHT, treeScene } from './tree-scene';

const run = (spec: GraphProblemSpec, o: SearchOptions) => search(graphProblem(spec), o);

describe('treeScene', () => {
	it('lays out the A* Romania tree with f=g+h under each node (Informed Search, slide 22)', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'astar' });
		const s = treeScene(r, 0, { annotation: 'fgh' });
		expect(s.nodes).toHaveLength(r.nodes.length);
		expect(s.shown).toBe(16);
		expect(s.total).toBe(16);
		const byLabel = (label: string, note: string) =>
			s.nodes.find((n) => n.label === label && n.note === note);
		expect(byLabel('Arad', '366=0+366')).toBeDefined();
		expect(byLabel('Bucharest', '418=418+0')).toBeDefined();
		expect(byLabel('Rimnicu Vilcea', '607=414+193')).toBeDefined();
		// Children left to right in successor order, one row per depth.
		const kids = r.steps[1].children.map((id) => s.byId.get(id)!);
		expect(kids.map((k) => k.label)).toEqual(['Sibiu', 'Timisoara', 'Zerind']);
		expect(kids[0].x).toBeLessThan(kids[1].x);
		expect(kids[1].x).toBeLessThan(kids[2].x);
		expect(new Set(kids.map((k) => k.y)).size).toBe(1);
		const root = s.byId.get(0)!;
		expect(root.y).toBeLessThan(kids[0].y);
		expect(root.halfH).toBe(PILL_HEIGHT / 2);
		// Edges run from under the parent's annotation to the top of the child.
		expect(s.edges).toHaveLength(15);
		const e = s.edges.find((x) => x.child === kids[0].id)!;
		expect(e.d.startsWith(`M${root.x} `)).toBe(true);
		expect(e.cost).toBeNull();
		// Everything fits in the drawing.
		for (const n of s.nodes) {
			expect(n.x - n.halfW).toBeGreaterThanOrEqual(0);
			expect(n.x + n.halfW).toBeLessThanOrEqual(s.width);
			expect(n.noteY).toBeLessThanOrEqual(s.height);
		}
	});

	it('annotations per option and step costs on edges', () => {
		const r = run(TINY_PROBLEM, { strategy: 'ucs' });
		const g = treeScene(r, 0, { annotation: 'g', showCosts: true });
		expect(g.nodes.find((n) => n.label === 'p')!.note).toBe('1');
		const pq = g.edges.find(
			(e) => r.nodes[e.child].label === 'q' && r.nodes[e.parent].label === 'p'
		)!;
		expect(pq.cost?.text).toBe('15');
		const none = treeScene(r, 0, { annotation: 'none' });
		expect(none.nodes.every((n) => n.note === '')).toBe(true);
		// Rows are shorter without annotations.
		expect(none.height).toBeLessThan(g.height);
	});

	it('one iteration at a time for IDS', () => {
		const r = run(BINARY_TREE_PROBLEM, { strategy: 'ids' });
		expect(treeScene(r, 1, { annotation: 'none' }).nodes.map((n) => n.label)).toEqual([
			'A',
			'B',
			'C'
		]);
		expect(treeScene(r, 3, { annotation: 'none' }).nodes).toHaveLength(13);
		expect(treeScene(r, 9, { annotation: 'none' }).nodes).toHaveLength(0);
	});

	it('caps large trees and accepts custom labels', () => {
		const r = run(
			{ ...ROMANIA_PROBLEM, goals: ['Neamt'] },
			{ strategy: 'bfs', maxExpansions: 200 }
		);
		const s = treeScene(r, 0, {
			annotation: 'none',
			maxNodes: 50,
			label: (n) => n.label.slice(0, 3)
		});
		expect(s.shown).toBe(50);
		expect(s.total).toBe(r.nodes.length);
		expect(s.total).toBeGreaterThan(400);
		expect(s.nodes).toHaveLength(50);
		expect(s.nodes[0].label).toBe('Ara');
	});
});
