/**
 * Geometry of a state-graph drawing (docs/ARCHITECTURE.md §3.2): node
 * outlines, edges with arrowheads and cost labels, the start arrow, and
 * label placement, all in screen pixels for a given magnification. Pure TS so
 * `StateGraph.svelte` only renders.
 *
 * Positions come from `layoutGraph` (drawing units). Nodes, text, and arrows
 * keep a fixed pixel size at every zoom level; zooming spreads the positions.
 *
 * Edges are merged per pair of states unless `edgeLabel` is given: then every
 * edge is drawn with its own label, parallel edges bend apart, and several
 * self-loops on one state go to different sides (the vacuum-world diagram,
 * Solving Problems by Searching, slide 9). `nodeBox` draws states as boxes
 * for pictures (the page draws what goes inside).
 */
import { layoutGraph, type GraphEdge, type WeightedGraph } from '$lib/theory/graphs';
import { formatNumber } from './describe';
import {
	arrowHead,
	boundaryDistance,
	fitCamera,
	grow,
	overlapArea,
	quadAt,
	segmentHitsBox,
	textWidth,
	unit,
	type Box,
	type Camera,
	type Extent,
	type Outline,
	type Point,
	type Viewport
} from './geometry';

export type NodeShape = 'circle' | 'square';

/** Side of a state a self-loop is drawn on. */
export type LoopSide = 'top' | 'right' | 'bottom' | 'left';

/** A node's outline: a circle or pill, a map marker, or a box (`nodeBox`). */
export type NodeOutline = Outline | { kind: 'rect'; halfW: number; halfH: number };

/** Where a state's box is drawn (px, top-left corner and size), for pictures inside it. */
export interface NodeFrame {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface GraphSceneInput {
	graph: WeightedGraph;
	start?: string;
	/** Goal states are labelled right after the start state when space is short. */
	goals?: readonly string[];
	heuristic?: Readonly<Record<string, number>>;
	nodeShape?: NodeShape;
	showCosts?: boolean;
	/**
	 * Label of each edge (`index` into `graph.edges`), drawn instead of its cost;
	 * null draws none. With it, every edge is drawn: parallel edges bend apart
	 * and several self-loops on one state go to different sides.
	 */
	edgeLabel?: (edge: GraphEdge, index: number) => string | null;
	/** Side of each self-loop when `edgeLabel` is given; null or missing picks a free side. */
	loopSide?: (edge: GraphEdge, index: number) => LoopSide | null;
	/** Draw each state as a box of this size (px) instead of `nodeShape`; it shrinks when states crowd. */
	nodeBox?: { width: number; height: number };
}

interface PreparedEdge {
	from: string;
	to: string;
	cost: number;
	kind: 'line' | 'curve' | 'loop';
	directed: boolean;
	/** Index into `graph.edges`. */
	index: number;
	/** Unique among the drawn edges. */
	key: string;
	/** Curves: bend in units of the default curve, toward the edge's left (negative: right). */
	bend: number;
	/** Loops: the side of the state, and how many loops on that side are inside this one. */
	side: LoopSide;
	nest: number;
	/** Label text (the cost, or `edgeLabel`); null for none. */
	text: string | null;
}

export interface PreparedGraph {
	ids: string[];
	/** Positions in drawing units. */
	pos: Map<string, Point>;
	edges: PreparedEdge[];
	/** Smallest distance between two distinct node positions (drawing units; Infinity for < 2 nodes). */
	minDist: number;
	shape: NodeShape;
	/** Box size of every node (`nodeBox`), or null. */
	box: { width: number; height: number } | null;
	/** Edges carry `edgeLabel` labels (left out when states crowd together). */
	labelled: boolean;
	showCosts: boolean;
	start: string | null;
	/** "h=366" per node, when a heuristic is given. */
	hText: Map<string, string>;
	/** Label placement order: start, goals, then the rest in declaration order. */
	labelOrder: string[];
	/** Start and goal states: their names are always shown. */
	pinned: Set<string>;
	/** Signature of the drawing's structure; changes when the view should refit. */
	signature: string;
}

export interface SceneLabel {
	/** Left out because it would cover another label (crowded drawings); still placed. */
	hidden?: boolean;
	/** Text anchor point of each line (dominant-baseline: central). */
	lines: { text: string; x: number; y: number; kind: 'name' | 'h' }[];
	anchor: 'start' | 'middle' | 'end';
	box: Box;
}

export interface SceneNode {
	id: string;
	x: number;
	y: number;
	outline: NodeOutline;
	fontSize: number;
	/** Name label: inside the node for circles, beside the marker for squares (with h below it). */
	label: SceneLabel;
	/** Heuristic label next to a circle node. */
	h: SceneLabel | null;
	ext: Extent;
}

export interface SceneEdge {
	from: string;
	to: string;
	/** Index into `graph.edges`. */
	index: number;
	/** Unique among the drawn edges (for keyed lists). */
	key: string;
	directed: boolean;
	d: string;
	head: string | null;
	/** Path-highlight variant: a larger arrowhead for the thick stroke. */
	headBold: string | null;
	/** Cost label centered at (x, y), `width` px wide including its padding. */
	label: { x: number; y: number; text: string; width: number } | null;
}

export interface GraphScene {
	k: number;
	nodes: SceneNode[];
	byId: Map<string, SceneNode>;
	edges: SceneEdge[];
	start: {
		d: string;
		head: string;
		label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
	} | null;
	/** Font sizes in px (smaller when states crowd together). */
	fonts: { name: number; h: number; cost: number };
	/** Whether h values are drawn (they are left out when states crowd together). */
	showH: boolean;
}

export const NODE_R = 16;
export const SQUARE_HALF = 5;
const LOOP_HEIGHT = 26;
/** Below this distance between states (px), `edgeLabel` labels are left out. */
const LABEL_CROWD = 30;
const START_LENGTH = 30;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** `u` turned by `angle` radians (clockwise on screen, y down). */
const rotate = (u: Point, angle: number): Point => ({
	x: u.x * Math.cos(angle) - u.y * Math.sin(angle),
	y: u.x * Math.sin(angle) + u.y * Math.cos(angle)
});

/** Point of a cubic Bézier at t. */
function cubicAt(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
	const s = 1 - t;
	const a = s * s * s;
	const b = 3 * s * s * t;
	const c = 3 * s * t * t;
	const d = t * t * t;
	return {
		x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
		y: a * p0.y + b * c1.y + c * c2.y + d * p3.y
	};
}

/** Smallest box containing both. */
function union(a: Box, b: Box): Box {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	return {
		x,
		y,
		width: Math.max(a.x + a.width, b.x + b.width) - x,
		height: Math.max(a.y + a.height, b.y + b.height) - y
	};
}

/** Positions, deduplicated edges, and text for a graph; independent of the zoom. */
export function prepareGraph(input: GraphSceneInput): PreparedGraph {
	const { graph } = input;
	const pos = layoutGraph(graph);
	const ids = graph.nodes.map((n) => n.id);
	const known = new Set(ids);

	const showCosts = input.showCosts ?? true;
	const labelOf = input.edgeLabel;
	const edges = labelOf
		? everyEdge(graph, known, pos, labelOf, input.loopSide)
		: mergedEdges(graph, known, showCosts);

	let minDist = Infinity;
	const pts = ids.map((id) => pos.get(id)!);
	for (let i = 0; i < pts.length; i++)
		for (let j = i + 1; j < pts.length; j++) {
			const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
			if (d > 1e-6) minDist = Math.min(minDist, d);
		}

	const hText = new Map<string, string>();
	if (input.heuristic) {
		for (const id of ids) {
			const v = input.heuristic[id];
			if (v !== undefined) hText.set(id, `h=${formatNumber(v)}`);
		}
	}

	const start = input.start && known.has(input.start) ? input.start : null;
	const shape = input.nodeShape ?? 'circle';
	const box =
		input.nodeBox && input.nodeBox.width > 0 && input.nodeBox.height > 0
			? { width: input.nodeBox.width, height: input.nodeBox.height }
			: null;
	const signature = JSON.stringify([
		graph.directed,
		ids.map((id) => [id, pos.get(id)!.x, pos.get(id)!.y]),
		labelOf
			? edges.map((e) => [e.from, e.to, e.cost, e.text, e.side])
			: edges.map((e) => [e.from, e.to, e.cost]),
		start,
		shape,
		showCosts,
		[...hText],
		...(box ? [box.width, box.height] : [])
	]);
	const first = [start, ...(input.goals ?? [])].filter(
		(id, i, all): id is string => id !== null && known.has(id) && all.indexOf(id) === i
	);
	const labelOrder = [...first, ...ids.filter((id) => !first.includes(id))];
	return {
		ids,
		pos,
		edges,
		minDist,
		shape,
		box,
		labelled: labelOf !== undefined,
		showCosts,
		start,
		hText,
		labelOrder,
		pinned: new Set(first),
		signature
	};
}

/** One edge per pair of states (per direction in directed graphs); later duplicates are dropped. */
function mergedEdges(graph: WeightedGraph, known: Set<string>, showCosts: boolean): PreparedEdge[] {
	const seen = new Set<string>();
	const directedPairs = new Set<string>();
	const kept: { e: GraphEdge; index: number }[] = [];
	graph.edges.forEach((e, index) => {
		if (!known.has(e.from) || !known.has(e.to)) return;
		const key =
			graph.directed || e.from === e.to ? `${e.from}\u0000${e.to}` : pairKey(e.from, e.to);
		if (seen.has(key)) return;
		seen.add(key);
		kept.push({ e, index });
		if (graph.directed) directedPairs.add(`${e.from}\u0000${e.to}`);
	});
	return kept.map(({ e, index }) => {
		const kind =
			e.from === e.to
				? 'loop'
				: graph.directed && directedPairs.has(`${e.to}\u0000${e.from}`)
					? 'curve'
					: 'line';
		return {
			from: e.from,
			to: e.to,
			cost: e.cost,
			directed: graph.directed,
			kind,
			index,
			key: edgeKey(e.from, e.to),
			bend: kind === 'curve' ? 1 : 0,
			side: 'top',
			nest: 0,
			text: showCosts ? formatNumber(e.cost) : null
		};
	});
}

const LOOP_SIDES: readonly LoopSide[] = ['top', 'bottom', 'left', 'right'];
const SIDE_DIR: Record<LoopSide, Point> = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 }
};

/**
 * Every edge, labelled: the edges between two states spread over lanes 2
 * units of bend apart (a single edge stays straight), and self-loops take the
 * side asked for or the one farthest from the state's other edges and loops.
 */
function everyEdge(
	graph: WeightedGraph,
	known: Set<string>,
	pos: Map<string, Point>,
	labelOf: (edge: GraphEdge, index: number) => string | null,
	sideOf?: (edge: GraphEdge, index: number) => LoopSide | null
): PreparedEdge[] {
	const kept: { e: GraphEdge; index: number }[] = [];
	graph.edges.forEach((e, index) => {
		if (known.has(e.from) && known.has(e.to)) kept.push({ e, index });
	});

	// Lanes of the edges between each pair, counted from the pair's first state (name order).
	const lanes = new Map<string, number[]>();
	for (const { e, index } of kept) {
		if (e.from === e.to) continue;
		const key = pairKey(e.from, e.to);
		if (!lanes.has(key)) lanes.set(key, []);
		lanes.get(key)!.push(index);
	}
	const bendOf = new Map<number, number>();
	for (const indices of lanes.values()) {
		const m = indices.length;
		indices.forEach((index, i) => {
			const e = graph.edges[index];
			const lane = (i - (m - 1) / 2) * 2;
			bendOf.set(index, lane === 0 ? 0 : e.from < e.to ? lane : -lane);
		});
	}

	// Loop sides: requested ones first, then free ones.
	const dirs = new Map<string, Point[]>();
	const addDir = (id: string, d: Point) => {
		if (!dirs.has(id)) dirs.set(id, []);
		dirs.get(id)!.push(d);
	};
	for (const { e } of kept) {
		if (e.from === e.to) continue;
		const a = pos.get(e.from)!;
		const b = pos.get(e.to)!;
		addDir(e.from, unit(b.x - a.x, b.y - a.y));
		addDir(e.to, unit(a.x - b.x, a.y - b.y));
	}
	const sides = new Map<number, LoopSide>();
	const loops = kept.filter(({ e }) => e.from === e.to);
	for (const { e, index } of loops) {
		const side = sideOf?.(e, index) ?? null;
		if (side && LOOP_SIDES.includes(side)) {
			sides.set(index, side);
			addDir(e.from, SIDE_DIR[side]);
		}
	}
	for (const { e, index } of loops) {
		if (sides.has(index)) continue;
		const taken = dirs.get(e.from) ?? [];
		let best: LoopSide = 'top';
		let bestScore = -Infinity;
		for (const side of LOOP_SIDES) {
			const u = SIDE_DIR[side];
			let score = Math.PI;
			for (const d of taken) score = Math.min(score, Math.acos(clamp(u.x * d.x + u.y * d.y)));
			if (score > bestScore + 1e-9) {
				bestScore = score;
				best = side;
			}
		}
		sides.set(index, best);
		addDir(e.from, SIDE_DIR[best]);
	}
	const nests = new Map<string, number>();

	return kept.map(({ e, index }) => {
		const loop = e.from === e.to;
		const bend = loop ? 0 : (bendOf.get(index) ?? 0);
		const side = sides.get(index) ?? 'top';
		let nest = 0;
		if (loop) {
			const key = `${e.from}\u0000${side}`;
			nest = nests.get(key) ?? 0;
			nests.set(key, nest + 1);
		}
		return {
			from: e.from,
			to: e.to,
			cost: e.cost,
			directed: graph.directed,
			kind: loop ? 'loop' : bend === 0 ? 'line' : 'curve',
			index,
			key: `${e.from}\u0000${e.to}\u0000${index}`,
			bend,
			side,
			nest,
			text: labelOf(e, index)
		};
	});
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x));

/** Key of the edge from `from` to `to` in `pathEdgeKeys`. */
export const edgeKey = (from: string, to: string): string => `${from}\u0000${to}`;

/**
 * Keys of the edges a path of states runs along, for highlighting: each step
 * from one state to the next, and back again in an undirected graph.
 */
export function pathEdgeKeys(path: readonly string[], directed: boolean): Set<string> {
	const keys = new Set<string>();
	for (let i = 1; i < path.length; i++) {
		keys.add(edgeKey(path[i - 1], path[i]));
		if (!directed) keys.add(edgeKey(path[i], path[i - 1]));
	}
	return keys;
}

function pairKey(a: string, b: string): string {
	return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

// ---------------------------------------------------------------------------
// Label placement
// ---------------------------------------------------------------------------

type Slot = 'E' | 'NE' | 'SE' | 'W' | 'N' | 'S' | 'NW' | 'SW';

interface Obstacles {
	boxes: { box: Box; owner: string; weight: number }[];
	segments: { a: Point; b: Point; owner: string[] }[];
	hull: Box;
}

/** Half width and half height of an outline. */
export function halfSize(o: NodeOutline): { hw: number; hh: number } {
	switch (o.kind) {
		case 'square':
			return { hw: o.half, hh: o.half };
		case 'rect':
			return { hw: o.halfW, hh: o.halfH };
		default:
			return { hw: o.halfW, hh: o.r };
	}
}

/** Distance from the center to the outline along the unit direction `d`. */
export function outlineDistance(o: NodeOutline, d: Point): number {
	if (o.kind !== 'rect') return boundaryDistance(o, d);
	const tx = Math.abs(d.x) > 1e-9 ? o.halfW / Math.abs(d.x) : Infinity;
	const ty = Math.abs(d.y) > 1e-9 ? o.halfH / Math.abs(d.y) : Infinity;
	const t = Math.min(tx, ty);
	return Number.isFinite(t) ? t : Math.min(o.halfW, o.halfH);
}

/** Point on the outline centered at `c` in the direction of `toward`. */
function outlinePoint(c: Point, o: NodeOutline, toward: Point): Point {
	const d = unit(toward.x - c.x, toward.y - c.y);
	const t = outlineDistance(o, d);
	return { x: c.x + d.x * t, y: c.y + d.y * t };
}

function slotBox(
	c: Point,
	o: NodeOutline,
	slot: Slot,
	w: number,
	h: number,
	gap: number
): { box: Box; anchor: SceneLabel['anchor'] } {
	const { hw, hh } = halfSize(o);
	const corner = o.kind !== 'stadium';
	const diagX = corner ? hw : hw * 0.72;
	const diagY = corner ? hh : hh * 0.72;
	switch (slot) {
		case 'E':
			return { box: { x: c.x + hw + gap, y: c.y - h / 2, width: w, height: h }, anchor: 'start' };
		case 'W':
			return { box: { x: c.x - hw - gap - w, y: c.y - h / 2, width: w, height: h }, anchor: 'end' };
		case 'N':
			return {
				box: { x: c.x - w / 2, y: c.y - hh - gap - h, width: w, height: h },
				anchor: 'middle'
			};
		case 'S':
			return { box: { x: c.x - w / 2, y: c.y + hh + gap, width: w, height: h }, anchor: 'middle' };
		case 'NE':
			return {
				box: { x: c.x + diagX + gap / 2, y: c.y - diagY - gap / 2 - h, width: w, height: h },
				anchor: 'start'
			};
		case 'SE':
			return {
				box: { x: c.x + diagX + gap / 2, y: c.y + diagY + gap / 2, width: w, height: h },
				anchor: 'start'
			};
		case 'NW':
			return {
				box: { x: c.x - diagX - gap / 2 - w, y: c.y - diagY - gap / 2 - h, width: w, height: h },
				anchor: 'end'
			};
		case 'SW':
			return {
				box: { x: c.x - diagX - gap / 2 - w, y: c.y + diagY + gap / 2, width: w, height: h },
				anchor: 'end'
			};
	}
}

function placeLabel(
	owner: string,
	c: Point,
	o: NodeOutline,
	w: number,
	h: number,
	gap: number,
	slots: readonly Slot[],
	obstacles: Obstacles
): { box: Box; anchor: SceneLabel['anchor']; collides: boolean } {
	let best: { box: Box; anchor: SceneLabel['anchor'] } | null = null;
	let bestScore = Infinity;
	let bestCollides = false;
	slots.forEach((slot, rank) => {
		const cand = slotBox(c, o, slot, w, h, gap);
		const b = cand.box;
		let score = rank * 0.6;
		let collides = false;
		for (const ob of obstacles.boxes) {
			if (ob.owner === owner && ob.weight >= 50) continue;
			const area = overlapArea(b, ob.box);
			if (area > 0) {
				score += ob.weight + area / 20;
				if (ob.weight >= HARD) collides = true;
			}
		}
		const tight = grow(b, -1);
		for (const s of obstacles.segments) {
			if (segmentHitsBox(s.a, s.b, tight)) score += 9;
		}
		const hull = obstacles.hull;
		const out =
			Math.max(0, hull.x - b.x) +
			Math.max(0, b.x + b.width - (hull.x + hull.width)) +
			Math.max(0, hull.y - b.y) +
			Math.max(0, b.y + b.height - (hull.y + hull.height));
		if (out > 0) score += 4 + out / 25;
		if (score < bestScore) {
			bestScore = score;
			best = cand;
			bestCollides = collides;
		}
	});
	return { ...best!, collides: bestCollides };
}

/** Obstacle weight of markers and labels: a label may not cover them when space is short. */
const HARD = 45;

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

/** The drawing at magnification `k` (px per drawing unit), with the drawing origin at (0, 0). */
export function sceneAt(prep: PreparedGraph, k: number): GraphScene {
	const box = prep.box;
	const square = prep.shape === 'square' && !box;
	// Level of detail: when states crowd together (a big map on a phone), text and
	// markers shrink a little and h values are left out; zooming in brings them back.
	const crowd = prep.minDist * k;
	const textScale = Math.max(0.8, Math.min(1, 0.55 + crowd / 100));
	const showH = crowd >= 32;
	const half = crowd < 36 ? SQUARE_HALF - 1 : SQUARE_HALF;
	const r = square ? half : crowd < 46 ? Math.max(10, Math.min(NODE_R, crowd * 0.36)) : NODE_R;
	// Boxes shrink down to 45% when states crowd together.
	const boxScale = box ? Math.max(0.45, Math.min(1, (0.72 * crowd) / box.width)) : 1;
	// Self-loops shrink with the boxes; edge labels are left out when states crowd.
	const loopScale = box ? boxScale : 1;
	const edgeText = !prep.labelled || crowd >= LABEL_CROWD;
	const fontSize = r2((square ? 12.5 : box ? 12 : r >= 14 ? 13 : 11.5) * textScale);
	const hFont = r2(11 * textScale);
	const costFont = r2(12 * textScale);
	const lineH = (square ? 14 : 13) * textScale;

	const at = new Map<string, Point>();
	for (const id of prep.ids) {
		const p = prep.pos.get(id)!;
		at.set(id, { x: r2(p.x * k), y: r2(p.y * k) });
	}
	const outlines = new Map<string, NodeOutline>();
	for (const id of prep.ids) {
		if (box) {
			outlines.set(id, {
				kind: 'rect',
				halfW: r2((box.width * boxScale) / 2),
				halfH: r2((box.height * boxScale) / 2)
			});
		} else if (square) outlines.set(id, { kind: 'square', half });
		else {
			const tw = textWidth(id, fontSize, 'sans', 500);
			outlines.set(id, { kind: 'stadium', halfW: Math.max(r, tw / 2 + 8), r });
		}
	}

	// Edges.
	const edges: SceneEdge[] = [];
	const segments: Obstacles['segments'] = [];
	const costBoxes: Box[] = [];
	/** Space taken by each state's self-loops (curve and label). */
	const loopBoxes = new Map<string, Box[]>();
	for (const e of prep.edges) {
		const a = at.get(e.from)!;
		const b = at.get(e.to)!;
		const oa = outlines.get(e.from)!;
		const ob = outlines.get(e.to)!;
		const arrow = e.directed;
		const text = edgeText ? e.text : null;
		const labelW = text === null ? 0 : r2(textWidth(text, costFont) + 6);
		let d: string;
		let head: string | null = null;
		let headBold: string | null = null;
		let mid: Point;
		if (e.kind === 'loop') {
			// Drawn for the top side and rotated to the others: from the left of the
			// side (seen from outside) around to its right, clockwise.
			const u = SIDE_DIR[e.side];
			const v = { x: -u.y, y: u.x };
			const along = outlineDistance(oa, u);
			const size = (LOOP_HEIGHT + e.nest * 14) * loopScale;
			let p0: Point;
			let p3: Point;
			let lateral: number;
			if (oa.kind === 'rect') {
				const across = e.side === 'top' || e.side === 'bottom' ? oa.halfW : oa.halfH;
				const w = Math.max(2, Math.min(across - 1.5, Math.max(6, across * 0.5)));
				p0 = { x: a.x + u.x * along - v.x * w, y: a.y + u.y * along - v.y * w };
				p3 = { x: a.x + u.x * along + v.x * w, y: a.y + u.y * along + v.y * w };
				lateral = w + (11 + e.nest * 6) * loopScale;
			} else {
				const { hw, hh } = halfSize(oa);
				const across = e.side === 'top' || e.side === 'bottom' ? hw : hh;
				const spread =
					oa.kind === 'stadium' ? Math.min(0.5, (along * 0.9) / Math.max(across, 1)) : 0.6;
				const dir1 = rotate(u, -spread);
				const dir2 = rotate(u, spread);
				const t1 = outlineDistance(oa, dir1);
				const t2 = outlineDistance(oa, dir2);
				p0 = { x: a.x + dir1.x * t1, y: a.y + dir1.y * t1 };
				p3 = { x: a.x + dir2.x * t2, y: a.y + dir2.y * t2 };
				lateral = 20 + e.nest * 6;
			}
			const reach = along + size + 6 * loopScale;
			const c1 = { x: a.x + u.x * reach - v.x * lateral, y: a.y + u.y * reach - v.y * lateral };
			const c2 = { x: a.x + u.x * reach + v.x * lateral, y: a.y + u.y * reach + v.y * lateral };
			const angle = Math.atan2(p3.y - c2.y, p3.x - c2.x);
			const end = arrow ? { x: p3.x - Math.cos(angle) * 6, y: p3.y - Math.sin(angle) * 6 } : p3;
			d = `M${r2(p0.x)} ${r2(p0.y)}C${r2(c1.x)} ${r2(c1.y)} ${r2(c2.x)} ${r2(c2.y)} ${r2(end.x)} ${r2(end.y)}`;
			if (arrow) {
				head = arrowHead(p3, angle);
				headBold = arrowHead(p3, angle, 12, 5.5);
			}
			// Beyond the loop's far end; a wide label on a left or right loop moves out further.
			const extra = Math.max(0, Math.abs(u.x) * (labelW / 2 - costFont * 0.62));
			const dist = along + size + 8 + extra;
			mid = { x: a.x + u.x * dist, y: a.y + u.y * dist };
			const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => cubicAt(p0, c1, c2, p3, t));
			const xs = pts.map((p) => p.x);
			const ys = pts.map((p) => p.y);
			let lb: Box = {
				x: Math.min(...xs) - 2,
				y: Math.min(...ys) - 2,
				width: Math.max(...xs) - Math.min(...xs) + 4,
				height: Math.max(...ys) - Math.min(...ys) + 4
			};
			if (text !== null) {
				lb = union(lb, {
					x: mid.x - labelW / 2,
					y: mid.y - costFont * 0.65,
					width: labelW,
					height: costFont * 1.3
				});
			}
			if (!loopBoxes.has(e.from)) loopBoxes.set(e.from, []);
			loopBoxes.get(e.from)!.push(lb);
		} else if (e.kind === 'curve') {
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			const u = unit(b.x - a.x, b.y - a.y);
			const n = { x: u.y, y: -u.x };
			const bend = Math.max(12, Math.min(30, len * 0.16)) * e.bend;
			const ctrl = { x: (a.x + b.x) / 2 + n.x * bend * 2, y: (a.y + b.y) / 2 + n.y * bend * 2 };
			const p0 = outlinePoint(a, oa, ctrl);
			const tip = outlinePoint(b, ob, ctrl);
			const tipGap = unit(tip.x - ctrl.x, tip.y - ctrl.y);
			const p2 = arrow ? { x: tip.x - tipGap.x * 1.5, y: tip.y - tipGap.y * 1.5 } : tip;
			const angle = Math.atan2(p2.y - ctrl.y, p2.x - ctrl.x);
			const end = arrow ? { x: p2.x - Math.cos(angle) * 6, y: p2.y - Math.sin(angle) * 6 } : p2;
			d = `M${r2(p0.x)} ${r2(p0.y)}Q${r2(ctrl.x)} ${r2(ctrl.y)} ${r2(end.x)} ${r2(end.y)}`;
			if (arrow) {
				head = arrowHead(p2, angle);
				headBold = arrowHead(p2, angle, 12, 5.5);
			}
			mid = quadAt(p0, ctrl, p2, 0.5);
			const q1 = quadAt(p0, ctrl, p2, 0.33);
			const q2 = quadAt(p0, ctrl, p2, 0.66);
			segments.push({ a: p0, b: q1, owner: [e.from, e.to] });
			segments.push({ a: q1, b: q2, owner: [e.from, e.to] });
			segments.push({ a: q2, b: p2, owner: [e.from, e.to] });
		} else {
			const p0 = outlinePoint(a, oa, b);
			const tip = outlinePoint(b, ob, a);
			const u = unit(tip.x - p0.x, tip.y - p0.y);
			const p2 = arrow ? { x: tip.x - u.x * 1.5, y: tip.y - u.y * 1.5 } : tip;
			const angle = Math.atan2(u.y, u.x);
			const end = arrow ? { x: p2.x - u.x * 6, y: p2.y - u.y * 6 } : p2;
			d = `M${r2(p0.x)} ${r2(p0.y)}L${r2(end.x)} ${r2(end.y)}`;
			if (arrow) {
				head = arrowHead(p2, angle);
				headBold = arrowHead(p2, angle, 12, 5.5);
			}
			mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
			segments.push({ a: p0, b: p2, owner: [e.from, e.to] });
		}
		let label: SceneEdge['label'] = null;
		if (text !== null) {
			label = { x: r2(mid.x), y: r2(mid.y), text, width: labelW };
			costBoxes.push({
				x: mid.x - labelW / 2,
				y: mid.y - costFont * 0.65,
				width: labelW,
				height: costFont * 1.3
			});
		}
		edges.push({
			from: e.from,
			to: e.to,
			index: e.index,
			key: e.key,
			directed: e.directed,
			d,
			head,
			headBold,
			label
		});
	}

	// Hull of the node positions, for keeping labels inside the drawing.
	let hx0 = Infinity;
	let hx1 = -Infinity;
	let hy0 = Infinity;
	let hy1 = -Infinity;
	for (const p of at.values()) {
		hx0 = Math.min(hx0, p.x);
		hx1 = Math.max(hx1, p.x);
		hy0 = Math.min(hy0, p.y);
		hy1 = Math.max(hy1, p.y);
	}
	const hullPad = square ? 14 : r + 18;
	const hull: Box = {
		x: hx0 - hullPad,
		y: hy0 - hullPad,
		width: hx1 - hx0 + 2 * hullPad,
		height: hy1 - hy0 + 2 * hullPad
	};

	const obstacles: Obstacles = { boxes: [], segments, hull };
	for (const id of prep.ids) {
		const p = at.get(id)!;
		const { hw, hh } = halfSize(outlines.get(id)!);
		obstacles.boxes.push({
			box: { x: p.x - hw - 2, y: p.y - hh - 2, width: 2 * hw + 4, height: 2 * hh + 4 },
			owner: id,
			weight: 60
		});
		for (const lb of loopBoxes.get(id) ?? []) {
			obstacles.boxes.push({ box: lb, owner: id, weight: 30 });
		}
	}
	for (const b of costBoxes) obstacles.boxes.push({ box: b, owner: '', weight: 25 });

	// Start arrow: from the freest direction, preferring the left.
	let start: GraphScene['start'] = null;
	if (prep.start) {
		const c = at.get(prep.start)!;
		const o = outlines.get(prep.start)!;
		const dirs: Point[] = [];
		for (const e of prep.edges) {
			if (e.kind === 'loop') {
				if (e.from === prep.start) dirs.push(SIDE_DIR[e.side]);
				continue;
			}
			const other = e.from === prep.start ? e.to : e.to === prep.start ? e.from : null;
			if (other === null) continue;
			const q = at.get(other)!;
			dirs.push(unit(q.x - c.x, q.y - c.y));
		}
		const candidates = [180, 225, 135, 270, 90, 0, 315, 45];
		let bestAngle = 180;
		let bestScore = -Infinity;
		candidates.forEach((deg, rank) => {
			const t = (deg * Math.PI) / 180;
			const u = { x: Math.cos(t), y: Math.sin(t) };
			let minAngle = Math.PI;
			for (const d of dirs)
				minAngle = Math.min(minAngle, Math.acos(Math.max(-1, Math.min(1, u.x * d.x + u.y * d.y))));
			const tail = {
				x: c.x + u.x * (outlineDistance(o, u) + START_LENGTH),
				y: c.y + u.y * (outlineDistance(o, u) + START_LENGTH)
			};
			let crowded = 0;
			for (const [id, q] of at) {
				if (id !== prep.start && Math.hypot(q.x - tail.x, q.y - tail.y) < 28) crowded++;
			}
			const score = Math.min(minAngle, Math.PI / 2) * 10 - crowded * 8 - rank * 0.8;
			if (score > bestScore) {
				bestScore = score;
				bestAngle = deg;
			}
		});
		const t = (bestAngle * Math.PI) / 180;
		const u = { x: Math.cos(t), y: Math.sin(t) };
		const bd = outlineDistance(o, u);
		const tip = { x: c.x + u.x * (bd + 1.5), y: c.y + u.y * (bd + 1.5) };
		const tail = { x: c.x + u.x * (bd + START_LENGTH), y: c.y + u.y * (bd + START_LENGTH) };
		const angle = Math.atan2(-u.y, -u.x);
		const end = { x: tip.x + u.x * 6, y: tip.y + u.y * 6 };
		const anchor: 'start' | 'middle' | 'end' = u.x < -0.3 ? 'end' : u.x > 0.3 ? 'start' : 'middle';
		const label = {
			x: r2(tail.x + u.x * 4),
			y: r2(tail.y + u.y * 4 + (u.y < -0.3 ? -5 : u.y > 0.3 ? 6 : 0)),
			anchor
		};
		start = {
			d: `M${r2(tail.x)} ${r2(tail.y)}L${r2(end.x)} ${r2(end.y)}`,
			head: arrowHead(tip, angle),
			label
		};
		segments.push({ a: tail, b: tip, owner: [prep.start] });
		const lw = textWidth('start', 11.5) + 2;
		const lx = anchor === 'end' ? label.x - lw : anchor === 'start' ? label.x : label.x - lw / 2;
		obstacles.boxes.push({
			box: { x: lx, y: label.y - 7, width: lw, height: 14 },
			owner: '',
			weight: 30
		});
	}

	// Nodes and their labels.
	// When crowded, a label that would cover another label or marker is left out
	// (zoom in to see it); start and goal states are labelled first and always.
	const cull = crowd < 40;
	const built = new Map<string, SceneNode>();
	const nameSlots: Slot[] = ['E', 'NE', 'SE', 'W', 'N', 'S', 'NW', 'SW'];
	const hSlots: Slot[] = ['S', 'E', 'W', 'N', 'SE', 'SW', 'NE', 'NW'];
	for (const id of prep.labelOrder) {
		const c = at.get(id)!;
		const o = outlines.get(id)!;
		const hText = showH ? (prep.hText.get(id) ?? null) : null;
		let label: SceneLabel;
		let h: SceneLabel | null = null;
		if (square) {
			const nameW = textWidth(id, fontSize, 'sans', 500);
			const hW = hText ? textWidth(hText, hFont, 'mono') : 0;
			const w = Math.max(nameW, hW) + 2;
			const height = (hText ? 2 : 1) * lineH;
			const place = placeLabel(id, c, o, w, height, 4, nameSlots, obstacles);
			label = linesIn(place.box, place.anchor, hText ? [id, hText] : [id], lineH);
			if (cull && place.collides && !prep.pinned.has(id)) label.hidden = true;
			else obstacles.boxes.push({ box: place.box, owner: id, weight: 45 });
		} else {
			const { hw, hh } = halfSize(o);
			label = {
				lines: [{ text: id, x: c.x, y: c.y, kind: 'name' }],
				anchor: 'middle',
				box: { x: c.x - hw, y: c.y - hh, width: 2 * hw, height: 2 * hh }
			};
			if (hText) {
				const w = textWidth(hText, hFont, 'mono') + 2;
				const place = placeLabel(id, c, o, w, lineH, 3, hSlots, obstacles);
				h = linesIn(place.box, place.anchor, [hText], lineH, true);
				if (cull && place.collides) h.hidden = true;
				else obstacles.boxes.push({ box: place.box, owner: id, weight: 45 });
			}
		}
		const { hw, hh } = halfSize(o);
		const boxes = [{ x: c.x - hw - 3, y: c.y - hh - 3, width: 2 * hw + 6, height: 2 * hh + 6 }];
		if (!label.hidden) boxes.push(label.box);
		if (h && !h.hidden) boxes.push(h.box);
		boxes.push(...(loopBoxes.get(id) ?? []));
		if (start && id === prep.start) {
			const sx = [c.x, c.x];
			const tailX = start.label.x;
			sx.push(
				tailX + (start.label.anchor === 'end' ? -32 : start.label.anchor === 'start' ? 32 : 0)
			);
			boxes.push({
				x: Math.min(...sx),
				y: Math.min(c.y, start.label.y - 8),
				width: Math.max(...sx) - Math.min(...sx),
				height: Math.abs(start.label.y - c.y) + 16
			});
		}
		const ext: Extent = { left: 0, right: 0, top: 0, bottom: 0 };
		for (const b of boxes) {
			ext.left = Math.max(ext.left, c.x - b.x);
			ext.right = Math.max(ext.right, b.x + b.width - c.x);
			ext.top = Math.max(ext.top, c.y - b.y);
			ext.bottom = Math.max(ext.bottom, b.y + b.height - c.y);
		}
		built.set(id, { id, x: c.x, y: c.y, outline: o, fontSize, label, h, ext });
	}
	const nodes = prep.ids.map((id) => built.get(id)!);

	return {
		k,
		nodes,
		byId: new Map(nodes.map((n) => [n.id, n])),
		edges,
		start,
		fonts: { name: fontSize, h: hFont, cost: costFont },
		showH
	};
}

function linesIn(
	box: Box,
	anchor: SceneLabel['anchor'],
	texts: string[],
	lineH: number,
	allH = false
): SceneLabel {
	const x =
		anchor === 'start'
			? box.x + 1
			: anchor === 'end'
				? box.x + box.width - 1
				: box.x + box.width / 2;
	return {
		anchor,
		box,
		lines: texts.map((text, i) => ({
			text,
			x: r2(x),
			y: r2(box.y + lineH * (i + 0.5)),
			kind: allH || i > 0 ? 'h' : 'name'
		}))
	};
}

/**
 * The camera that fits the whole drawing into the viewport. Node sizes are
 * fixed in pixels, so the fit is solved with each node's pixel extent (its
 * outline plus labels, placed at a first estimate of the magnification).
 */
export function fitGraph(prep: PreparedGraph, vp: Viewport, maxK = 1.6): Camera {
	if (prep.ids.length === 0) return { cx: 0, cy: 0, k: 1 };
	const items = (scene: GraphScene | null) =>
		prep.ids.map((id) => {
			const p = prep.pos.get(id)!;
			const box = prep.box;
			const ext: Extent = scene
				? scene.byId.get(id)!.ext
				: box
					? {
							left: box.width / 2 + 4,
							right: box.width / 2 + 4,
							top: box.height / 2 + 4,
							bottom: box.height / 2 + 4
						}
					: prep.shape === 'square'
						? { left: 8, right: 8 + textWidth(id, 12.5, 'sans', 500), top: 14, bottom: 14 }
						: { left: NODE_R + 8, right: NODE_R + 8, top: NODE_R + 4, bottom: NODE_R + 18 };
			return { x: p.x, y: p.y, ext };
		});
	const first = fitCamera(items(null), vp, { maxK });
	return fitCamera(items(sceneAt(prep, first.k)), vp, { maxK });
}
