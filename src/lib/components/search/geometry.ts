/**
 * Small 2-D kit shared by the search drawings: text width estimates, node
 * boundaries, arrowheads, a pan/zoom camera, and box/segment tests. Pure TS,
 * all lengths in screen pixels unless noted.
 */

export interface Point {
	x: number;
	y: number;
}

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** Approximate advance widths of Inter, in em. */
function sansAdvance(ch: string): number {
	if (ch === ' ') return 0.28;
	if ("ijl.,:;!|'`".includes(ch)) return 0.27;
	if ('ftr()[]I/-'.includes(ch)) return 0.38;
	if (ch === 'm') return 0.87;
	if (ch === 'w') return 0.78;
	if (ch === 'M' || ch === 'W') return 0.92;
	if (ch >= '0' && ch <= '9') return 0.6;
	if (ch >= 'A' && ch <= 'Z') return 0.69;
	if (ch >= 'a' && ch <= 'z') return 0.57;
	return 0.64;
}

/**
 * Estimated rendered width of `text` in px. `sans` follows Inter's advance
 * widths closely enough for padding boxes; `mono` is exact for a 0.6 em font.
 */
export function textWidth(
	text: string,
	fontSize: number,
	font: 'sans' | 'mono' = 'sans',
	weight = 400
): number {
	if (font === 'mono') return [...text].length * 0.6 * fontSize;
	let em = 0;
	for (const ch of text) em += sansAdvance(ch);
	return em * fontSize * (weight >= 500 ? 1.03 : 1);
}

// ---------------------------------------------------------------------------
// Vectors and shapes
// ---------------------------------------------------------------------------

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function unit(dx: number, dy: number): Point {
	const l = Math.hypot(dx, dy);
	return l < 1e-9 ? { x: 1, y: 0 } : { x: dx / l, y: dy / l };
}

/**
 * A node outline centered on its position: a stadium (a circle when
 * `halfW === r`, otherwise a pill of half-width `halfW` and radius `r`), or an
 * axis-aligned square of half-size `half`.
 */
export type Outline =
	{ kind: 'stadium'; halfW: number; r: number } | { kind: 'square'; half: number };

/** Distance from the center to the outline along the unit direction `d`. */
export function boundaryDistance(o: Outline, d: Point): number {
	if (o.kind === 'square') {
		const m = Math.max(Math.abs(d.x), Math.abs(d.y));
		return m < 1e-9 ? o.half : o.half / m;
	}
	const r = o.r;
	const L = Math.max(0, o.halfW - r);
	if (Math.abs(d.y) > 1e-9) {
		const t = r / Math.abs(d.y);
		if (Math.abs(t * d.x) <= L) return t;
	}
	const cx = Math.sign(d.x) * L;
	const dc = d.x * cx;
	const disc = dc * dc - cx * cx + r * r;
	return dc + Math.sqrt(Math.max(0, disc));
}

/** Point on the outline centered at `c` in the direction of `toward`. */
export function boundaryPoint(c: Point, o: Outline, toward: Point): Point {
	const d = unit(toward.x - c.x, toward.y - c.y);
	const t = boundaryDistance(o, d);
	return { x: c.x + d.x * t, y: c.y + d.y * t };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A slim arrowhead (filled path) with its tip at `tip`, pointing along `angle` (radians). */
export function arrowHead(tip: Point, angle: number, length = 9, halfWidth = 4): string {
	const dx = Math.cos(angle);
	const dy = Math.sin(angle);
	const bx = tip.x - dx * length;
	const by = tip.y - dy * length;
	const nx = -dy * halfWidth;
	const ny = dx * halfWidth;
	const notchX = bx + dx * length * 0.2;
	const notchY = by + dy * length * 0.2;
	return `M${r2(tip.x)} ${r2(tip.y)}L${r2(bx + nx)} ${r2(by + ny)}L${r2(notchX)} ${r2(notchY)}L${r2(bx - nx)} ${r2(by - ny)}Z`;
}

/** Point of a quadratic Bézier at t. */
export function quadAt(p0: Point, c: Point, p2: Point, t: number): Point {
	const s = 1 - t;
	return {
		x: s * s * p0.x + 2 * s * t * c.x + t * t * p2.x,
		y: s * s * p0.y + 2 * s * t * c.y + t * t * p2.y
	};
}

// ---------------------------------------------------------------------------
// Boxes and segments
// ---------------------------------------------------------------------------

/** Overlap area of two boxes (0 when disjoint). */
export function overlapArea(a: Box, b: Box): number {
	const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	return w > 0 && h > 0 ? w * h : 0;
}

export const grow = (b: Box, m: number): Box => ({
	x: b.x - m,
	y: b.y - m,
	width: b.width + 2 * m,
	height: b.height + 2 * m
});

/** Whether the segment a–b passes through the box (Liang–Barsky clipping). */
export function segmentHitsBox(a: Point, b: Point, box: Box): boolean {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	let t0 = 0;
	let t1 = 1;
	const clip = (p: number, q: number) => {
		if (Math.abs(p) < 1e-12) return q >= 0;
		const r = q / p;
		if (p < 0) {
			if (r > t1) return false;
			if (r > t0) t0 = r;
		} else {
			if (r < t0) return false;
			if (r < t1) t1 = r;
		}
		return true;
	};
	return (
		clip(-dx, a.x - box.x) &&
		clip(dx, box.x + box.width - a.x) &&
		clip(-dy, a.y - box.y) &&
		clip(dy, box.y + box.height - a.y)
	);
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/**
 * Maps drawing units to screen pixels: the drawing point (cx, cy) appears at
 * the center of the viewport, magnified `k` times.
 */
export interface Camera {
	cx: number;
	cy: number;
	k: number;
}

export interface Viewport {
	width: number;
	height: number;
}

export const project = (cam: Camera, vp: Viewport, p: Point): Point => ({
	x: (p.x - cam.cx) * cam.k + vp.width / 2,
	y: (p.y - cam.cy) * cam.k + vp.height / 2
});

export const unproject = (cam: Camera, vp: Viewport, px: Point): Point => ({
	x: (px.x - vp.width / 2) / cam.k + cam.cx,
	y: (px.y - vp.height / 2) / cam.k + cam.cy
});

/** Zoom by `factor` (> 1 magnifies) keeping the screen point `about` fixed. */
export function zoomAbout(cam: Camera, vp: Viewport, factor: number, about: Point): Camera {
	const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
	const p = unproject(cam, vp, about);
	const k = cam.k * f;
	return {
		k,
		cx: p.x - (about.x - vp.width / 2) / k,
		cy: p.y - (about.y - vp.height / 2) / k
	};
}

/** Pan by a screen-space drag of (dx, dy) pixels. */
export const panBy = (cam: Camera, dx: number, dy: number): Camera => ({
	...cam,
	cx: cam.cx - dx / cam.k,
	cy: cam.cy - dy / cam.k
});

/** Space a node takes around its position, in px (fixed on screen, whatever the zoom). */
export interface Extent {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/**
 * The largest magnification (≤ `maxK`) at which every point plus its
 * pixel extent fits into the viewport minus `pad`, centered. Solved exactly
 * over pairs of points for up to 600 points; larger inputs use the widest
 * extents on every side.
 */
export function fitCamera(
	items: readonly { x: number; y: number; ext: Extent }[],
	vp: Viewport,
	opts: { pad?: number; maxK?: number; minK?: number } = {}
): Camera {
	const pad = opts.pad ?? 12;
	const maxK = opts.maxK ?? 1.6;
	const minK = opts.minK ?? 0.02;
	if (items.length === 0) return { cx: 0, cy: 0, k: 1 };
	const availW = Math.max(1, vp.width - 2 * pad);
	const availH = Math.max(1, vp.height - 2 * pad);

	const axisK = (
		pos: (i: number) => number,
		lo: (i: number) => number,
		hi: (i: number) => number,
		avail: number
	) => {
		let k = Infinity;
		const n = items.length;
		if (n <= 600) {
			for (let i = 0; i < n; i++)
				for (let j = 0; j < n; j++) {
					const d = pos(i) - pos(j);
					if (d <= 1e-9) continue;
					k = Math.min(k, (avail - hi(i) - lo(j)) / d);
				}
		} else {
			let min = Infinity;
			let max = -Infinity;
			let loMax = 0;
			let hiMax = 0;
			for (let i = 0; i < n; i++) {
				min = Math.min(min, pos(i));
				max = Math.max(max, pos(i));
				loMax = Math.max(loMax, lo(i));
				hiMax = Math.max(hiMax, hi(i));
			}
			if (max - min > 1e-9) k = (avail - loMax - hiMax) / (max - min);
		}
		return k;
	};

	const kx = axisK(
		(i) => items[i].x,
		(i) => items[i].ext.left,
		(i) => items[i].ext.right,
		availW
	);
	const ky = axisK(
		(i) => items[i].y,
		(i) => items[i].ext.top,
		(i) => items[i].ext.bottom,
		availH
	);
	const k = Math.max(minK, Math.min(maxK, kx, ky));

	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	for (const it of items) {
		x0 = Math.min(x0, it.x * k - it.ext.left);
		x1 = Math.max(x1, it.x * k + it.ext.right);
		y0 = Math.min(y0, it.y * k - it.ext.top);
		y1 = Math.max(y1, it.y * k + it.ext.bottom);
	}
	return { k, cx: (x0 + x1) / 2 / k, cy: (y0 + y1) / 2 / k };
}
