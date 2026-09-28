/**
 * Positions for drawing a graph. Nodes that carry `x`/`y` keep them; the rest
 * are placed by a deterministic force-directed layout (same graph, same
 * picture), so typed-in graphs draw without coordinates.
 */
import type { WeightedGraph } from './types';

export interface Point {
	x: number;
	y: number;
}

/** Target distance between neighboring nodes, in drawing units. */
export const LAYOUT_SPACING = 120;

const ITERATIONS = 400;
const GRAVITY = 0.3;

/** A position for every node, keyed by name. */
export function layoutGraph(graph: WeightedGraph): Map<string, Point> {
	const ids = graph.nodes.map((n) => n.id);
	const index = new Map(ids.map((id, i) => [id, i]));
	const fixed = graph.nodes.map((n) => n.x !== undefined && n.y !== undefined);
	const out = new Map<string, Point>();
	if (fixed.every(Boolean)) {
		for (const n of graph.nodes) out.set(n.id, { x: n.x!, y: n.y! });
		return out;
	}

	const n = ids.length;
	const edges: [number, number][] = [];
	for (const e of graph.edges) {
		const a = index.get(e.from);
		const b = index.get(e.to);
		if (a !== undefined && b !== undefined && a !== b) edges.push([a, b]);
	}

	// Start free nodes on a circle (declaration order); fixed nodes where they are.
	const k = LAYOUT_SPACING;
	const radius = Math.max(k, (k * n) / (2 * Math.PI));
	const xs = new Float64Array(n);
	const ys = new Float64Array(n);
	graph.nodes.forEach((node, i) => {
		if (fixed[i]) {
			xs[i] = node.x!;
			ys[i] = node.y!;
		} else {
			const angle = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
			xs[i] = radius * Math.cos(angle);
			ys[i] = radius * Math.sin(angle);
		}
	});

	// Fruchterman–Reingold with linear cooling.
	const dx = new Float64Array(n);
	const dy = new Float64Array(n);
	let temperature = radius / 2;
	const cool = temperature / (ITERATIONS + 1);
	for (let it = 0; it < ITERATIONS; it++) {
		dx.fill(0);
		dy.fill(0);
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				let ux = xs[i] - xs[j];
				let uy = ys[i] - ys[j];
				let d = Math.hypot(ux, uy);
				if (d < 1e-6) {
					// Coincident nodes: separate them along a fixed direction.
					ux = 1e-3 * (j - i);
					uy = 1e-3;
					d = Math.hypot(ux, uy);
				}
				const f = (k * k) / d;
				dx[i] += (ux / d) * f;
				dy[i] += (uy / d) * f;
				dx[j] -= (ux / d) * f;
				dy[j] -= (uy / d) * f;
			}
		}
		for (const [a, b] of edges) {
			const ux = xs[a] - xs[b];
			const uy = ys[a] - ys[b];
			const d = Math.max(1e-6, Math.hypot(ux, uy));
			const f = (d * d) / k;
			dx[a] -= (ux / d) * f;
			dy[a] -= (uy / d) * f;
			dx[b] += (ux / d) * f;
			dy[b] += (uy / d) * f;
		}
		// Weak pull toward the centroid, so parts of a disconnected graph stay near
		// each other instead of drifting apart.
		let cx = 0;
		let cy = 0;
		for (let i = 0; i < n; i++) {
			cx += xs[i];
			cy += ys[i];
		}
		cx /= n;
		cy /= n;
		for (let i = 0; i < n; i++) {
			dx[i] -= GRAVITY * (xs[i] - cx);
			dy[i] -= GRAVITY * (ys[i] - cy);
		}
		for (let i = 0; i < n; i++) {
			if (fixed[i]) continue;
			const d = Math.hypot(dx[i], dy[i]);
			if (d < 1e-9) continue;
			const step = Math.min(d, temperature);
			xs[i] += (dx[i] / d) * step;
			ys[i] += (dy[i] / d) * step;
		}
		temperature = Math.max(1, temperature - cool);
	}

	// With no fixed nodes, move the drawing so its top-left corner is at (0, 0).
	let ox = 0;
	let oy = 0;
	if (!fixed.some(Boolean) && n > 0) {
		ox = Math.min(...xs);
		oy = Math.min(...ys);
	}
	ids.forEach((id, i) => out.set(id, { x: round(xs[i] - ox), y: round(ys[i] - oy) }));
	return out;
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Bounding box of a set of points (all zeros when empty). */
export function boundsOf(points: Iterable<Point>): {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
} {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const p of points) {
		minX = Math.min(minX, p.x);
		minY = Math.min(minY, p.y);
		maxX = Math.max(maxX, p.x);
		maxY = Math.max(maxY, p.y);
	}
	if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	return { minX, minY, maxX, maxY };
}
