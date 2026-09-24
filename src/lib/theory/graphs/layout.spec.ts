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
});
