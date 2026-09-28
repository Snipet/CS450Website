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
import {
	vacuumStateSpace,
	vacuumTransitions,
	type SpaceAction
} from '$lib/theory/agents/vacuum-space';
import { overlapArea, project, type Box } from './geometry';
import {
	edgeKey,
	fitGraph,
	halfSize,
	outlineDistance,
	pathEdgeKeys,
	prepareGraph,
	sceneAt,
	type GraphScene,
	type LoopSide
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

describe('labelled edges (edgeLabel)', () => {
	const LETTER: Record<SpaceAction, string> = { Left: 'L', Right: 'R', Suck: 'S' };
	const SIDE: Record<SpaceAction, LoopSide> = { Left: 'left', Right: 'right', Suck: 'bottom' };
	const vacuum = (n = 2, box?: { width: number; height: number }) => {
		const actions = vacuumTransitions(n).map((t) => t.action);
		return prepareGraph({
			graph: vacuumStateSpace(n),
			start: 'A DD',
			edgeLabel: (_, i) => LETTER[actions[i]],
			loopSide: (_, i) => SIDE[actions[i]],
			nodeBox: box
		});
	};

	it('keeps every edge, parallel self-loops included, with unique keys and labels', () => {
		const p = vacuum();
		expect(p.edges).toHaveLength(24);
		expect(new Set(p.edges.map((e) => e.key)).size).toBe(24);
		expect(p.edges.map((e) => e.index)).toEqual([...Array(24).keys()]);
		// "A CD": Left and Suck do nothing, two loops on different sides (slide 9).
		const loops = p.edges.filter((e) => e.from === 'A CD' && e.kind === 'loop');
		expect(loops.map((e) => [e.text, e.side, e.nest])).toEqual([
			['L', 'left', 0],
			['S', 'bottom', 0]
		]);
		// Left/Right between the two states of a pattern bend to opposite sides; Suck is straight.
		const r = p.edges.find((e) => e.from === 'A DD' && e.to === 'B DD')!;
		const l = p.edges.find((e) => e.from === 'B DD' && e.to === 'A DD')!;
		expect([r.kind, l.kind]).toEqual(['curve', 'curve']);
		// Equal bends toward each edge's own side: the curves go to opposite sides.
		expect(Math.abs(r.bend)).toBe(1);
		expect(r.bend).toBe(l.bend);
		const scene = sceneAt(p, 1);
		const labelY = (from: string, to: string) =>
			scene.edges.find((e) => e.from === from && e.to === to)!.label!.y;
		const y = scene.byId.get('A DD')!.y;
		expect(Math.sign(labelY('A DD', 'B DD') - y)).toBe(-Math.sign(labelY('B DD', 'A DD') - y));
		expect(p.edges.find((e) => e.from === 'A DD' && e.to === 'A CD')!.kind).toBe('line');
	});

	it('the default merges edges exactly as before', () => {
		const g: WeightedGraph = {
			directed: true,
			nodes: [{ id: 'A' }, { id: 'B' }],
			edges: [
				{ from: 'A', to: 'B', cost: 1 },
				{ from: 'A', to: 'B', cost: 2 },
				{ from: 'A', to: 'A', cost: 1 },
				{ from: 'A', to: 'A', cost: 3 }
			]
		};
		const merged = prepareGraph({ graph: g });
		expect(merged.edges.map((e) => [e.key, e.text, e.side])).toEqual([
			[edgeKey('A', 'B'), '1', 'top'],
			[edgeKey('A', 'A'), '1', 'top']
		]);
		const every = prepareGraph({ graph: g, edgeLabel: (e) => `c${e.cost}` });
		expect(every.edges.map((e) => e.text)).toEqual(['c1', 'c2', 'c1', 'c3']);
		// Two loops with no side given: the free sides, away from the edge to B.
		const sides = every.edges.filter((e) => e.kind === 'loop').map((e) => e.side);
		expect(new Set(sides).size).toBe(2);
		expect(sides).not.toContain('right');
		// A null label draws none.
		expect(prepareGraph({ graph: g, edgeLabel: () => null }).edges.every((e) => !e.text)).toBe(
			true
		);
	});

	it('spreads parallel edges over lanes so their labels do not coincide', () => {
		const g: WeightedGraph = {
			directed: false,
			nodes: [
				{ id: 'A', x: 0, y: 0 },
				{ id: 'B', x: 300, y: 0 }
			],
			edges: [
				{ from: 'A', to: 'B', cost: 1 },
				{ from: 'B', to: 'A', cost: 2 },
				{ from: 'A', to: 'B', cost: 3 }
			]
		};
		const p = prepareGraph({ graph: g, edgeLabel: (e) => String(e.cost) });
		expect(p.edges.map((e) => [e.kind, e.bend])).toEqual([
			['curve', -2],
			['line', 0],
			['curve', 2]
		]);
		const s = sceneAt(p, 1);
		const ys = s.edges.map((e) => e.label!.y);
		expect(new Set(ys).size).toBe(3);
		// Undirected: no arrowheads on the curves either.
		expect(s.edges.every((e) => e.head === null)).toBe(true);
	});

	it('draws loops on the requested sides, labels outside them, nested when they share a side', () => {
		const s = sceneAt(vacuum(), 1);
		const node = s.byId.get('A CD')!;
		const [left, bottom] = s.edges.filter((e) => e.from === 'A CD' && e.to === 'A CD');
		expect(left.label!.x).toBeLessThan(node.x - 30);
		expect(Math.abs(left.label!.y - node.y)).toBeLessThan(1);
		expect(bottom.label!.y).toBeGreaterThan(node.y + 30);
		expect(left.head).not.toBeNull();
		const g: WeightedGraph = {
			directed: true,
			nodes: [{ id: 'A', x: 0, y: 0 }],
			edges: [
				{ from: 'A', to: 'A', cost: 1 },
				{ from: 'A', to: 'A', cost: 2 }
			]
		};
		const nested = sceneAt(
			prepareGraph({ graph: g, edgeLabel: (e) => String(e.cost), loopSide: () => 'top' }),
			1
		);
		const [inner, outer] = nested.edges;
		expect(outer.label!.y).toBeLessThan(inner.label!.y - 10);
		// The node's extent covers both loops and their labels.
		expect(nested.nodes[0].ext.top).toBeGreaterThan(-outer.label!.y);
	});
});

describe('boxes (nodeBox)', () => {
	const graph = vacuumStateSpace(2);
	const boxed = (k: number) =>
		sceneAt(prepareGraph({ graph, nodeBox: { width: 36, height: 18 } }), k);

	it('draws states as boxes of the given size, trimming edges to them', () => {
		const s = boxed(1);
		const n = s.byId.get('A DD')!;
		expect(n.outline).toEqual({ kind: 'rect', halfW: 18, halfH: 9 });
		expect(halfSize(n.outline)).toEqual({ hw: 18, hh: 9 });
		expect(n.label.lines[0]).toMatchObject({ text: 'A DD', x: n.x, y: n.y });
		// Suck from A DD goes straight down-left to A CD: it starts on the box's bottom edge.
		const suck = s.edges.find((e) => e.from === 'A DD' && e.to === 'A CD')!;
		const [, , y] = /^M([\d.-]+) ([\d.-]+)/.exec(suck.d)!.map(Number);
		expect(y).toBeCloseTo(n.y + 9, 1);
	});

	it('shrinks the boxes when states crowd together', () => {
		const s = boxed(0.2);
		const o = s.byId.get('A DD')!.outline;
		expect(o.kind).toBe('rect');
		expect(halfSize(o).hw).toBeLessThan(18);
		expect(halfSize(o).hw).toBeGreaterThanOrEqual(18 * 0.45 - 0.01);
	});

	it('leaves out edge labels and shrinks loops when states crowd together', () => {
		const actions = vacuumTransitions(2).map((t) => t.action);
		const p = prepareGraph({
			graph,
			edgeLabel: (_, i) => actions[i][0],
			nodeBox: { width: 36, height: 18 }
		});
		expect(p.labelled).toBe(true);
		expect(sceneAt(p, 1).edges.every((e) => e.label !== null)).toBe(true);
		const crowded = sceneAt(p, 0.15);
		expect(crowded.edges.every((e) => e.label === null)).toBe(true);
		const loop = (s: GraphScene) => s.byId.get('A CD')!.ext.left;
		expect(loop(crowded)).toBeLessThan(loop(sceneAt(p, 1)));
		// Costs are never left out.
		expect(sceneAt(prepareGraph({ graph }), 0.15).edges.every((e) => e.label !== null)).toBe(true);
	});

	it('outline distances of a box', () => {
		const o = { kind: 'rect' as const, halfW: 20, halfH: 10 };
		expect(outlineDistance(o, { x: 1, y: 0 })).toBe(20);
		expect(outlineDistance(o, { x: 0, y: -1 })).toBe(10);
		const d = Math.SQRT1_2;
		expect(outlineDistance(o, { x: d, y: d })).toBeCloseTo(10 * Math.SQRT2);
		expect(outlineDistance({ kind: 'square', half: 5 }, { x: 0, y: 1 })).toBe(5);
	});

	for (const width of [360, 1000]) {
		it(`fits the labelled vacuum state space into a ${width} px viewport`, () => {
			const actions = vacuumTransitions(2).map((t) => t.action);
			const p = prepareGraph({
				graph,
				start: 'A DD',
				edgeLabel: (_, i) => actions[i][0],
				loopSide: (_, i) =>
					actions[i] === 'Left' ? 'left' : actions[i] === 'Right' ? 'right' : 'bottom',
				nodeBox: { width: 36, height: 18 }
			});
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
});
