/**
 * Geometry of a state-graph drawing (docs/ARCHITECTURE.md §3.2): node
 * outlines, edges with arrowheads and cost labels, the start arrow, and
 * label placement, all in screen pixels for a given magnification. Pure TS so
 * `StateGraph.svelte` only renders.
 *
 * Positions come from `layoutGraph` (drawing units). Nodes, text, and arrows
 * keep a fixed pixel size at every zoom level; zooming spreads the positions.
 */
import { layoutGraph, type WeightedGraph } from '$lib/theory/graphs';
import { formatNumber } from './describe';
import {
	arrowHead,
	boundaryDistance,
	boundaryPoint,
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

export interface GraphSceneInput {
	graph: WeightedGraph;
	start?: string;
	/** Goal states are labelled right after the start state when space is short. */
	goals?: readonly string[];
	heuristic?: Readonly<Record<string, number>>;
	nodeShape?: NodeShape;
	showCosts?: boolean;
}

interface PreparedEdge {
	from: string;
	to: string;
	cost: number;
	kind: 'line' | 'curve' | 'loop';
	directed: boolean;
}

export interface PreparedGraph {
	ids: string[];
	/** Positions in drawing units. */
	pos: Map<string, Point>;
	edges: PreparedEdge[];
	/** Smallest distance between two distinct node positions (drawing units; Infinity for < 2 nodes). */
	minDist: number;
	shape: NodeShape;
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
	outline: Outline;
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
const START_LENGTH = 30;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Positions, deduplicated edges, and text for a graph; independent of the zoom. */
export function prepareGraph(input: GraphSceneInput): PreparedGraph {
	const { graph } = input;
	const pos = layoutGraph(graph);
	const ids = graph.nodes.map((n) => n.id);
	const known = new Set(ids);

	const seen = new Set<string>();
	const directedPairs = new Set<string>();
	const kept: { from: string; to: string; cost: number }[] = [];
	for (const e of graph.edges) {
		if (!known.has(e.from) || !known.has(e.to)) continue;
		const key =
			graph.directed || e.from === e.to ? `${e.from}\u0000${e.to}` : pairKey(e.from, e.to);
		if (seen.has(key)) continue;
		seen.add(key);
		kept.push(e);
		if (graph.directed) directedPairs.add(`${e.from}\u0000${e.to}`);
	}
	const edges: PreparedEdge[] = kept.map((e) => ({
		from: e.from,
		to: e.to,
		cost: e.cost,
		directed: graph.directed,
		kind:
			e.from === e.to
				? 'loop'
				: graph.directed && directedPairs.has(`${e.to}\u0000${e.from}`)
					? 'curve'
					: 'line'
	}));

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
	const showCosts = input.showCosts ?? true;
	const signature = JSON.stringify([
		graph.directed,
		ids.map((id) => [id, pos.get(id)!.x, pos.get(id)!.y]),
		edges.map((e) => [e.from, e.to, e.cost]),
		start,
		shape,
		showCosts,
		[...hText]
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
		showCosts,
		start,
		hText,
		labelOrder,
		pinned: new Set(first),
		signature
	};
}

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

function slotBox(
	c: Point,
	o: Outline,
	slot: Slot,
	w: number,
	h: number,
	gap: number
): { box: Box; anchor: SceneLabel['anchor'] } {
	const hw = o.kind === 'square' ? o.half : o.halfW;
	const hh = o.kind === 'square' ? o.half : o.r;
	const diagX = o.kind === 'square' ? hw : hw * 0.72;
	const diagY = o.kind === 'square' ? hh : hh * 0.72;
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
	o: Outline,
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
	const square = prep.shape === 'square';
	// Level of detail: when states crowd together (a big map on a phone), text and
	// markers shrink a little and h values are left out; zooming in brings them back.
	const crowd = prep.minDist * k;
	const textScale = Math.max(0.8, Math.min(1, 0.55 + crowd / 100));
	const showH = crowd >= 32;
	const half = crowd < 36 ? SQUARE_HALF - 1 : SQUARE_HALF;
	const r = square ? half : crowd < 46 ? Math.max(10, Math.min(NODE_R, crowd * 0.36)) : NODE_R;
	const fontSize = r2((square ? 12.5 : r >= 14 ? 13 : 11.5) * textScale);
	const hFont = r2(11 * textScale);
	const costFont = r2(12 * textScale);
	const lineH = (square ? 14 : 13) * textScale;

	const at = new Map<string, Point>();
	for (const id of prep.ids) {
		const p = prep.pos.get(id)!;
		at.set(id, { x: r2(p.x * k), y: r2(p.y * k) });
	}
	const outlines = new Map<string, Outline>();
	for (const id of prep.ids) {
		if (square) outlines.set(id, { kind: 'square', half });
		else {
			const tw = textWidth(id, fontSize, 'sans', 500);
			outlines.set(id, { kind: 'stadium', halfW: Math.max(r, tw / 2 + 8), r });
		}
	}

	// Edges.
	const edges: SceneEdge[] = [];
	const segments: Obstacles['segments'] = [];
	const costBoxes: Box[] = [];
	const loopsAt = new Set<string>();
	for (const e of prep.edges) {
		const a = at.get(e.from)!;
		const b = at.get(e.to)!;
		const oa = outlines.get(e.from)!;
		const ob = outlines.get(e.to)!;
		const arrow = e.directed;
		let d: string;
		let head: string | null = null;
		let headBold: string | null = null;
		let mid: Point;
		if (e.kind === 'loop') {
			loopsAt.add(e.from);
			const up = boundaryDistance(oa, { x: 0, y: -1 });
			const spread =
				oa.kind === 'stadium' ? Math.min(0.5, (oa.r * 0.9) / Math.max(oa.halfW, 1)) : 0.6;
			const a1 = -Math.PI / 2 - spread;
			const a2 = -Math.PI / 2 + spread;
			const dir1 = { x: Math.cos(a1), y: Math.sin(a1) };
			const dir2 = { x: Math.cos(a2), y: Math.sin(a2) };
			const p0 = {
				x: a.x + dir1.x * boundaryDistance(oa, dir1),
				y: a.y + dir1.y * boundaryDistance(oa, dir1)
			};
			const p3 = {
				x: a.x + dir2.x * boundaryDistance(oa, dir2),
				y: a.y + dir2.y * boundaryDistance(oa, dir2)
			};
			const top = a.y - up - LOOP_HEIGHT;
			const c1 = { x: a.x - 20, y: top - 6 };
			const c2 = { x: a.x + 20, y: top - 6 };
			const angle = Math.atan2(p3.y - c2.y, p3.x - c2.x);
			const end = arrow ? { x: p3.x - Math.cos(angle) * 6, y: p3.y - Math.sin(angle) * 6 } : p3;
			d = `M${r2(p0.x)} ${r2(p0.y)}C${r2(c1.x)} ${r2(c1.y)} ${r2(c2.x)} ${r2(c2.y)} ${r2(end.x)} ${r2(end.y)}`;
			if (arrow) {
				head = arrowHead(p3, angle);
				headBold = arrowHead(p3, angle, 12, 5.5);
			}
			mid = { x: a.x, y: top - 8 };
		} else if (e.kind === 'curve') {
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			const u = unit(b.x - a.x, b.y - a.y);
			const n = { x: u.y, y: -u.x };
			const bend = Math.max(12, Math.min(30, len * 0.16));
			const ctrl = { x: (a.x + b.x) / 2 + n.x * bend * 2, y: (a.y + b.y) / 2 + n.y * bend * 2 };
			const p0 = boundaryPoint(a, oa, ctrl);
			const tip = boundaryPoint(b, ob, ctrl);
			const tipGap = unit(tip.x - ctrl.x, tip.y - ctrl.y);
			const p2 = { x: tip.x - tipGap.x * 1.5, y: tip.y - tipGap.y * 1.5 };
			const angle = Math.atan2(p2.y - ctrl.y, p2.x - ctrl.x);
			const end = { x: p2.x - Math.cos(angle) * 6, y: p2.y - Math.sin(angle) * 6 };
			d = `M${r2(p0.x)} ${r2(p0.y)}Q${r2(ctrl.x)} ${r2(ctrl.y)} ${r2(end.x)} ${r2(end.y)}`;
			head = arrowHead(p2, angle);
			headBold = arrowHead(p2, angle, 12, 5.5);
			mid = quadAt(p0, ctrl, p2, 0.5);
			const q1 = quadAt(p0, ctrl, p2, 0.33);
			const q2 = quadAt(p0, ctrl, p2, 0.66);
			segments.push({ a: p0, b: q1, owner: [e.from, e.to] });
			segments.push({ a: q1, b: q2, owner: [e.from, e.to] });
			segments.push({ a: q2, b: p2, owner: [e.from, e.to] });
		} else {
			const p0 = boundaryPoint(a, oa, b);
			const tip = boundaryPoint(b, ob, a);
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
		if (prep.showCosts) {
			const text = formatNumber(e.cost);
			const w = r2(textWidth(text, costFont) + 6);
			label = { x: r2(mid.x), y: r2(mid.y), text, width: w };
			costBoxes.push({
				x: mid.x - w / 2,
				y: mid.y - costFont * 0.65,
				width: w,
				height: costFont * 1.3
			});
		}
		edges.push({ from: e.from, to: e.to, directed: e.directed, d, head, headBold, label });
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
		const o = outlines.get(id)!;
		const hw = o.kind === 'square' ? o.half : o.halfW;
		const hh = o.kind === 'square' ? o.half : o.r;
		obstacles.boxes.push({
			box: { x: p.x - hw - 2, y: p.y - hh - 2, width: 2 * hw + 4, height: 2 * hh + 4 },
			owner: id,
			weight: 60
		});
		if (loopsAt.has(id)) {
			obstacles.boxes.push({
				box: { x: p.x - 24, y: p.y - hh - LOOP_HEIGHT - 16, width: 48, height: LOOP_HEIGHT + 16 },
				owner: id,
				weight: 30
			});
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
				if (e.from === prep.start) dirs.push({ x: 0, y: -1 });
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
				x: c.x + u.x * (boundaryDistance(o, u) + START_LENGTH),
				y: c.y + u.y * (boundaryDistance(o, u) + START_LENGTH)
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
		const bd = boundaryDistance(o, u);
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
			label = {
				lines: [{ text: id, x: c.x, y: c.y, kind: 'name' }],
				anchor: 'middle',
				box: {
					x: c.x - (o as { halfW: number }).halfW,
					y: c.y - r,
					width: 2 * (o as { halfW: number }).halfW,
					height: 2 * r
				}
			};
			if (hText) {
				const w = textWidth(hText, hFont, 'mono') + 2;
				const place = placeLabel(id, c, o, w, lineH, 3, hSlots, obstacles);
				h = linesIn(place.box, place.anchor, [hText], lineH, true);
				if (cull && place.collides) h.hidden = true;
				else obstacles.boxes.push({ box: place.box, owner: id, weight: 45 });
			}
		}
		const hw = o.kind === 'square' ? o.half : o.halfW;
		const hh = o.kind === 'square' ? o.half : o.r;
		const boxes = [{ x: c.x - hw - 3, y: c.y - hh - 3, width: 2 * hw + 6, height: 2 * hh + 6 }];
		if (!label.hidden) boxes.push(label.box);
		if (h && !h.hidden) boxes.push(h.box);
		if (loopsAt.has(id))
			boxes.push({ x: c.x - 26, y: c.y - hh - LOOP_HEIGHT - 16, width: 52, height: 16 });
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
			const ext: Extent = scene
				? scene.byId.get(id)!.ext
				: prep.shape === 'square'
					? { left: 8, right: 8 + textWidth(id, 12.5, 'sans', 500), top: 14, bottom: 14 }
					: { left: NODE_R + 8, right: NODE_R + 8, top: NODE_R + 4, bottom: NODE_R + 18 };
			return { x: p.x, y: p.y, ext };
		});
	const first = fitCamera(items(null), vp, { maxK });
	return fitCamera(items(sceneAt(prep, first.k)), vp, { maxK });
}
