import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, graphProblem, type GraphProblemSpec } from '$lib/theory/graphs';
import { rbfs } from '$lib/theory/search/rbfs';
import { legendKeys, limitLabel, recursionScene, sceneSummary } from './tree-scene';
import { treeAt } from './view';

const romania = rbfs(graphProblem(ROMANIA_PROBLEM));

describe('recursionScene', () => {
	it('lays out the open calls with their f_limit tags and every stored successor', () => {
		const view = treeAt(romania, 4);
		const scene = recursionScene(view);
		expect(scene.nodes).toHaveLength(view.nodes.length);
		expect(scene.edges).toHaveLength(view.nodes.length - 1);
		expect(scene.hidden).toBe(0);
		expect(scene.fromDepth).toBe(0);
		const tags = scene.nodes.filter((n) => n.limitText).map((n) => `${n.label}: ${n.limitText}`);
		expect(tags).toEqual(['Arad: f_limit ∞', 'Sibiu: f_limit 447', 'Rimnicu Vilcea: f_limit 415']);
		// Rows go down; siblings share a row; boxes on a row do not overlap.
		const arad = scene.byId.get(0)!;
		const rows = new Map<number, typeof scene.nodes>();
		for (const n of scene.nodes) rows.set(n.y, [...(rows.get(n.y) ?? []), n]);
		expect(rows.size).toBe(4);
		for (const row of rows.values()) {
			const sorted = [...row].sort((a, b) => a.x - b.x);
			for (let i = 1; i < sorted.length; i++)
				expect(sorted[i].x - sorted[i].halfW).toBeGreaterThan(
					sorted[i - 1].x + sorted[i - 1].halfW
				);
		}
		for (const n of scene.nodes) {
			if (n.id === arad.id) continue;
			expect(n.y).toBeGreaterThan(arad.y);
			expect(n.limitY).toBeLessThan(n.y);
			expect(n.fY).toBeGreaterThan(n.y);
			expect(n.x + n.halfW).toBeLessThanOrEqual(scene.width);
		}
		// An edge to an open call ends at its tag, to a stored successor at its pill.
		const rv = scene.nodes.find((n) => n.label === 'Rimnicu Vilcea')!;
		const toRv = scene.edges.find((e) => e.child === rv.id)!;
		expect(toRv.d.endsWith(`${rv.limitY - 8}`)).toBe(true);
	});

	it('writes the replaced f before a backed-up one', () => {
		const scene = recursionScene(treeAt(romania, 5));
		const rv = scene.nodes.find((n) => n.label === 'Rimnicu Vilcea')!;
		expect(rv.oldText).toBe('413');
		expect(rv.fText).toBe('417');
		expect(rv.node.backedUp).toBe(true);
		expect(scene.nodes.filter((n) => n.node.status === 'forgotten')).toHaveLength(3);
	});

	it('crops a large tree to the deepest open calls that fit', () => {
		// A star of 30 leaves at every level of a chain: far more nodes than the cap.
		const nodes = Array.from({ length: 6 }, (_, i) => `C${i}`);
		const leaves = nodes.flatMap((c) => Array.from({ length: 30 }, (_, j) => `${c}L${j}`));
		const spec: GraphProblemSpec = {
			graph: {
				directed: true,
				nodes: [...nodes, ...leaves, 'G'].map((id) => ({ id })),
				edges: [
					...nodes.slice(1).map((c, i) => ({ from: nodes[i], to: c, cost: 1 })),
					...leaves.map((l) => ({ from: l.split('L')[0], to: l, cost: 5 }))
				]
			},
			start: 'C0',
			goals: ['G']
		};
		const r = rbfs(graphProblem(spec));
		const deepest = r.steps.findIndex((s) => s.kind === 'expand' && r.nodes[s.node].label === 'C5');
		const view = treeAt(r, deepest);
		expect(view.nodes.length).toBeGreaterThan(150);
		const scene = recursionScene(view, { maxNodes: 70 });
		expect(scene.nodes.length).toBeLessThanOrEqual(70);
		expect(scene.fromDepth).toBe(4);
		expect(scene.hidden).toBe(view.nodes.length - scene.nodes.length);
		expect(scene.nodes[0].label).toBe('C4');
		expect(sceneSummary(view, scene)).toMatch(/nodes above depth 4 not drawn\.$/);
	});

	it('is empty without nodes', () => {
		expect(recursionScene({ nodes: [], current: null, path: [] })).toMatchObject({
			nodes: [],
			edges: [],
			width: 0
		});
	});
});

describe('sceneSummary and limitLabel', () => {
	it('describes the tree', () => {
		const view = treeAt(romania, 5);
		expect(sceneSummary(view, recursionScene(view))).toBe(
			'Recursion tree. Open calls: Arad (f = 366, f_limit = ∞), Sibiu (f = 393, f_limit = 447); stored successors: Timisoara 447, Zerind 449, Arad 646, Fagaras 415, Oradea 671; forgotten: Craiova, Pitesti, Sibiu; current call: Rimnicu Vilcea.'
		);
		expect(limitLabel(415)).toBe('f_limit 415');
		expect(limitLabel(Infinity)).toBe('f_limit ∞');
	});
});

describe('legendKeys', () => {
	it('lists what a step draws', () => {
		expect(legendKeys(treeAt(romania, 0))).toEqual(['current', 'stored', 'limit']);
		expect(legendKeys(treeAt(romania, 3))).toEqual([
			'current',
			'open',
			'stored',
			'best',
			'alternative',
			'limit'
		]);
		expect(legendKeys(treeAt(romania, 5))).toEqual([
			'current',
			'open',
			'stored',
			'exceeds',
			'forgotten',
			'limit',
			'backed'
		]);
		// At the goal the open calls are the solution path.
		expect(legendKeys(treeAt(romania, 14))).toEqual(['stored', 'goal', 'limit', 'backed']);
	});
});
