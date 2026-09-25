import { describe, expect, it } from 'vitest';
import {
	ASTAR_WRONG_GRAPH,
	BINARY_TREE,
	ROMANIA,
	ROMANIA_PROBLEM,
	SLD_BUCHAREST,
	TINY_GRAPH,
	type WeightedGraph
} from '$lib/theory/graphs';
import { overlapArea, project, type Box } from './geometry';
import {
	edgeKey,
	fitGraph,
	pathEdgeKeys,
	prepareGraph,
	sceneAt,
	type GraphScene
} from './graph-scene';

const romania = (shape: 'circle' | 'square' = 'square') =>
	prepareGraph({
		graph: ROMANIA,
		start: 'Arad',
		goals: ['Bucharest'],
		heuristic: SLD_BUCHAREST,
		nodeShape: shape
	});

const visibleLabelBoxes = (scene: GraphScene): Box[] =>
	scene.nodes.filter((n) => !n.label.hidden).map((n) => n.label.box);

describe('prepareGraph', () => {
	it('keeps positions, orders labels start and goals first, and formats h', () => {
		const p = romania();
		expect(p.ids).toHaveLength(20);
		expect(p.edges).toHaveLength(23);
		expect(p.edges.every((e) => e.kind === 'line' && !e.directed)).toBe(true);
		expect(p.pos.get('Arad')).toEqual({ x: 26, y: 233 });
		expect(p.labelOrder.slice(0, 3)).toEqual(['Arad', 'Bucharest', 'Craiova']);
		expect(p.pinned).toEqual(new Set(['Arad', 'Bucharest']));
		expect(p.hText.get('Arad')).toBe('h=366');
		expect(p.start).toBe('Arad');
		// Lugoj–Mehadia is the closest pair on the map.
		expect(p.minDist).toBeCloseTo(Math.hypot(8, 104));
	});

	it('curves opposite directed edges, loops self-edges, drops duplicates and unknown ends', () => {
		const g: WeightedGraph = {
			directed: true,
			nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
			edges: [
				{ from: 'A', to: 'B', cost: 1 },
				{ from: 'B', to: 'A', cost: 2 },
				{ from: 'B', to: 'C', cost: 3 },
				{ from: 'B', to: 'C', cost: 4 },
				{ from: 'C', to: 'C', cost: 1 },
				{ from: 'C', to: 'Z', cost: 1 }
			]
		};
		const p = prepareGraph({ graph: g, start: 'Q' });
		expect(p.edges.map((e) => `${e.from}${e.to}:${e.kind}`)).toEqual([
			'AB:curve',
			'BA:curve',
			'BC:line',
			'CC:loop'
		]);
		expect(p.start).toBeNull();
		expect(p.hText.size).toBe(0);
		// Undirected duplicates in either direction collapse to one edge.
		const u = prepareGraph({
			graph: { ...g, directed: false, edges: g.edges.slice(0, 2) }
		});
		expect(u.edges).toHaveLength(1);
	});

	it('signature follows structure, not identity', () => {
		const a = prepareGraph({ graph: TINY_GRAPH, start: 'S' });
		const b = prepareGraph({ graph: structuredClone(TINY_GRAPH), start: 'S' });
		expect(a.signature).toBe(b.signature);
		const moved = structuredClone(TINY_GRAPH);
		moved.nodes[0].x = 999;
		expect(prepareGraph({ graph: moved, start: 'S' }).signature).not.toBe(a.signature);
		expect(prepareGraph({ graph: TINY_GRAPH, start: 'S', showCosts: false }).signature).not.toBe(
			a.signature
		);
	});

	it('lays out graphs without positions', () => {
		const p = prepareGraph({
			graph: {
				directed: false,
				nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
				edges: [{ from: 'A', to: 'B', cost: 1 }]
			}
		});
		expect(p.pos.size).toBe(3);
		expect(Number.isFinite(p.minDist)).toBe(true);
		expect(prepareGraph({ graph: { directed: false, nodes: [], edges: [] } }).minDist).toBe(
			Infinity
		);
	});
});

describe('path edges', () => {
	it('directed paths highlight one direction, undirected both', () => {
		expect(pathEdgeKeys(['A', 'B', 'C'], true)).toEqual(
			new Set([edgeKey('A', 'B'), edgeKey('B', 'C')])
		);
		expect(pathEdgeKeys(['A', 'B'], false)).toEqual(
			new Set([edgeKey('A', 'B'), edgeKey('B', 'A')])
		);
		expect(pathEdgeKeys([], false).size).toBe(0);
	});
});

describe('sceneAt', () => {
	it('places nodes at k × position with fixed-size outlines', () => {
		const s = sceneAt(romania(), 0.5);
		const arad = s.byId.get('Arad')!;
		expect([arad.x, arad.y]).toEqual([13, 116.5]);
		expect(arad.outline).toEqual({ kind: 'square', half: 5 });
		const c = sceneAt(prepareGraph({ graph: TINY_GRAPH }), 1);
		expect(c.byId.get('S')!.outline).toEqual({ kind: 'stadium', halfW: 16, r: 16 });
	});

	it('draws arrowheads on directed edges only, trimmed to the node outlines', () => {
		const tiny = sceneAt(prepareGraph({ graph: TINY_GRAPH, start: 'S' }), 1);
		expect(tiny.edges.every((e) => e.head && e.headBold)).toBe(true);
		const sd = tiny.edges.find((e) => e.from === 'S' && e.to === 'd')!;
		// S sits at (20, 220) with radius 16: the edge starts on its circle.
		const [, x, y] = /^M([\d.-]+) ([\d.-]+)/.exec(sd.d)!.map(Number);
		expect(Math.hypot(x - 20, y - 220)).toBeCloseTo(16, 0);
		expect(sd.label).toMatchObject({ text: '3' });
		const r = sceneAt(romania(), 0.5);
		expect(r.edges.every((e) => e.head === null)).toBe(true);
	});

	it('curved pairs and self-loops', () => {
		const g: WeightedGraph = {
			directed: true,
			nodes: [
				{ id: 'A', x: 0, y: 0 },
				{ id: 'B', x: 200, y: 0 }
			],
			edges: [
				{ from: 'A', to: 'B', cost: 1 },
				{ from: 'B', to: 'A', cost: 2 },
				{ from: 'B', to: 'B', cost: 5 }
			]
		};
		const s = sceneAt(prepareGraph({ graph: g }), 1);
		const [ab, ba, loop] = s.edges;
		expect(ab.d).toContain('Q');
		expect(ba.d).toContain('Q');
		// The two curves bend to opposite sides, so their labels do not coincide.
		expect(Math.sign(ab.label!.y)).toBe(-Math.sign(ba.label!.y));
		expect(loop.d).toContain('C');
		expect(loop.label!.y).toBeLessThan(-16);
	});

	it('omits cost labels when asked', () => {
		const s = sceneAt(prepareGraph({ graph: TINY_GRAPH, showCosts: false }), 1);
		expect(s.edges.every((e) => e.label === null)).toBe(true);
	});

	it('points the start arrow in from the free side', () => {
		const s = sceneAt(romania(), 0.5);
		expect(s.start).not.toBeNull();
		expect(s.start!.label.anchor).toBe('end');
		expect(s.start!.label.x).toBeLessThan(s.byId.get('Arad')!.x);
		// The binary tree's root has edges down to both sides: the arrow comes from above.
		const t = sceneAt(prepareGraph({ graph: BINARY_TREE, start: 'A' }), 1);
		expect(t.start!.label.y).toBeLessThan(t.byId.get('A')!.y - 16);
		expect(t.start!.label.anchor).toBe('middle');
		expect(sceneAt(prepareGraph({ graph: BINARY_TREE }), 1).start).toBeNull();
	});

	it('Romania labels beside the markers do not overlap at map scale', () => {
		const s = sceneAt(romania(), 0.5);
		expect(s.showH).toBe(true);
		expect(s.nodes.every((n) => !n.label.hidden)).toBe(true);
		const arad = s.byId.get('Arad')!;
		expect(arad.label.lines.map((l) => l.text)).toEqual(['Arad', 'h=366']);
		const boxes = visibleLabelBoxes(s);
		for (let i = 0; i < boxes.length; i++)
			for (let j = i + 1; j < boxes.length; j++) expect(overlapArea(boxes[i], boxes[j])).toBe(0);
	});

	it('crowded drawings shrink text, drop h values, and leave out colliding names', () => {
		const s = sceneAt(romania(), 0.2);
		expect(s.showH).toBe(false);
		expect(s.fonts.name).toBeLessThan(12.5);
		expect(s.byId.get('Arad')!.label.lines.map((l) => l.text)).toEqual(['Arad']);
		expect(s.byId.get('Arad')!.label.hidden).toBeFalsy();
		expect(s.byId.get('Bucharest')!.label.hidden).toBeFalsy();
		const boxes = visibleLabelBoxes(s);
		const others = s.nodes.filter((n) => !['Arad', 'Bucharest'].includes(n.id));
		for (const n of others) {
			if (n.label.hidden) continue;
			for (const b of boxes) if (b !== n.label.box) expect(overlapArea(n.label.box, b)).toBe(0);
		}
		// Hidden labels are still placed, so a page can show the one in focus.
		const hidden = s.nodes.find((n) => n.label.hidden);
		if (hidden) expect(hidden.label.lines[0].text).toBe(hidden.id);
	});

	it('h labels next to circles', () => {
		const p = prepareGraph({
			graph: ASTAR_WRONG_GRAPH,
			start: 'S',
			heuristic: { S: 2, A: 4, B: 1, C: 1, G: 0 }
		});
		const s = sceneAt(p, 1.6);
		expect(s.byId.get('A')!.h!.lines[0].text).toBe('h=4');
		expect(s.byId.get('G')!.h!.lines[0].kind).toBe('h');
	});
});

describe('fitGraph', () => {
	for (const width of [360, 640, 1000]) {
		it(`keeps every node and label inside a ${width} px viewport`, () => {
			const p = romania();
			const vp = { width, height: 420 };
			const cam = fitGraph(p, vp);
			const s = sceneAt(p, cam.k);
			for (const n of s.nodes) {
				const c = project(cam, vp, p.pos.get(n.id)!);
				expect(c.x - n.ext.left).toBeGreaterThanOrEqual(-1);
				expect(c.x + n.ext.right).toBeLessThanOrEqual(width + 1);
				expect(c.y - n.ext.top).toBeGreaterThanOrEqual(-1);
				expect(c.y + n.ext.bottom).toBeLessThanOrEqual(420 + 1);
			}
		});
	}

	it('caps the magnification of small graphs and handles empty ones', () => {
		expect(
			fitGraph(prepareGraph({ graph: ASTAR_WRONG_GRAPH }), { width: 2000, height: 2000 }).k
		).toBe(1.6);
		expect(
			fitGraph(prepareGraph({ graph: { directed: false, nodes: [], edges: [] } }), {
				width: 300,
				height: 300
			})
		).toEqual({ cx: 0, cy: 0, k: 1 });
	});

	it('works with the problem spec heuristics', () => {
		const p = prepareGraph({ graph: ROMANIA_PROBLEM.graph, heuristic: ROMANIA_PROBLEM.h });
		expect(fitGraph(p, { width: 640, height: 420 }).k).toBeGreaterThan(0.3);
	});
});
