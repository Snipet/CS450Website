import { describe, expect, it } from 'vitest';
import { ROMANIA, TINY_GRAPH } from './builtins';
import { LAYOUT_SPACING, boundsOf, layoutGraph } from './layout';
import type { WeightedGraph } from './types';

const strip = (g: WeightedGraph): WeightedGraph => ({
	...g,
	nodes: g.nodes.map(({ id }) => ({ id }))
});

describe('layoutGraph', () => {
	it('keeps positions when every node has one', () => {
		const pos = layoutGraph(ROMANIA);
		expect(pos.get('Arad')).toEqual({ x: 26, y: 233 });
		expect(pos.size).toBe(20);
	});

	it('lays out nodes without positions deterministically and apart', () => {
		const g = strip(TINY_GRAPH);
		const a = layoutGraph(g);
		const b = layoutGraph(g);
		expect([...a.entries()]).toEqual([...b.entries()]);
		const pts = [...a.values()];
		for (let i = 0; i < pts.length; i++) {
			for (let j = i + 1; j < pts.length; j++) {
				expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(
					LAYOUT_SPACING / 4
				);
			}
		}
		const box = boundsOf(pts);
		expect(box.minX).toBe(0);
		expect(box.minY).toBe(0);
	});

	it('keeps fixed nodes and places the others', () => {
		const g: WeightedGraph = {
			directed: false,
			nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B' }, { id: 'C' }],
			edges: [
				{ from: 'A', to: 'B', cost: 1 },
				{ from: 'B', to: 'C', cost: 1 }
			]
		};
		const pos = layoutGraph(g);
		expect(pos.get('A')).toEqual({ x: 0, y: 0 });
		expect(Number.isFinite(pos.get('C')!.x)).toBe(true);
	});

	it('handles empty and single-node graphs', () => {
		expect(layoutGraph({ directed: false, nodes: [], edges: [] }).size).toBe(0);
		expect(layoutGraph({ directed: false, nodes: [{ id: 'A' }], edges: [] }).get('A')).toEqual({
			x: 0,
			y: 0
		});
		expect(boundsOf([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
	});
	it('gives finite, reproducible positions for any graph and never moves fixed nodes', () => {
		let a = 7;
		const random = () => {
			a = (a * 1103515245 + 12345) % 2147483648;
			return a / 2147483648;
		};
		for (let k = 0; k < 200; k++) {
			const n = Math.floor(random() * 12);
			const ids = Array.from({ length: n }, (_, i) => `n${i}`);
			const pick = () => ids[Math.floor(random() * n)] ?? 'none';
			const g: WeightedGraph = {
				directed: random() < 0.5,
				// Some nodes share a fixed position; some have only x (so they are laid out).
				nodes: ids.map((id) => {
					const u = random();
					return u < 0.2 ? { id, x: 5, y: 5 } : u < 0.3 ? { id, x: 3 } : { id };
				}),
				// Self-loops, parallel edges, and edges to unknown states.
				edges: Array.from({ length: Math.floor(random() * 20) }, () => ({
					from: pick(),
					to: random() < 0.1 ? 'ghost' : pick(),
					cost: 1
				}))
			};
			const pos = layoutGraph(g);
			expect([...layoutGraph(structuredClone(g))]).toEqual([...pos]);
			expect(pos.size).toBe(n);
			for (const p of pos.values()) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
			for (const node of g.nodes)
				if (node.x !== undefined && node.y !== undefined)
					expect(pos.get(node.id)).toEqual({ x: node.x, y: node.y });
		}
	});

	it('keeps the parts of a disconnected graph together', () => {
		for (const extra of [1, 3]) {
			const g: WeightedGraph = {
				directed: false,
				nodes: [
					{ id: 'A' },
					{ id: 'B' },
					...Array.from({ length: extra }, (_, i) => ({ id: `C${i}` }))
				],
				edges: [{ from: 'A', to: 'B', cost: 1 }]
			};
			const pts = [...layoutGraph(g).values()];
			for (let i = 0; i < pts.length; i++) {
				for (let j = i + 1; j < pts.length; j++) {
					const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
					expect(d).toBeGreaterThan(LAYOUT_SPACING / 2);
					expect(d).toBeLessThan(LAYOUT_SPACING * 6);
				}
			}
		}
	});
});
