/**
 * Geometry for the score-over-time chart: nice axis ticks, scales, and the
 * line path. Pure, so the Svelte component only draws.
 */

export interface ChartPoint {
	/** Time step (0 = before the first step). */
	t: number;
	/** Score after step t. */
	score: number;
}

/** Score after each step, starting from 0 at t = 0. */
export function scorePoints(totals: readonly number[]): ChartPoint[] {
	return [{ t: 0, score: 0 }, ...totals.map((score, i) => ({ t: i + 1, score }))];
}

/**
 * Round tick values covering [min, max] with about `count` intervals: steps of
 * 1, 2, or 5 times a power of ten. The first tick is ≤ min and the last ≥ max.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
	if (min > max) [min, max] = [max, min];
	if (min === max) {
		min = Math.min(0, min);
		max = max === min ? min + 1 : max;
	}
	const raw = (max - min) / Math.max(1, count);
	const power = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
	const start = Math.floor(min / step) * step;
	const end = Math.ceil(max / step) * step;
	const out: number[] = [];
	for (let v = start; v <= end + step / 2; v += step) out.push(Number(v.toFixed(10)));
	return out;
}

/** Integer ticks for the time axis: at most `count` + 1 values from 0 to `last`. */
export function timeTicks(last: number, count = 5): number[] {
	if (last <= 0) return [0];
	const ticks = niceTicks(0, last, count).filter((t) => t <= last && Number.isInteger(t));
	if (ticks[ticks.length - 1] !== last && last - ticks[ticks.length - 1] > (ticks[1] ?? 1) / 2) {
		ticks.push(last);
	}
	return ticks;
}

/** Maps [d0, d1] onto [r0, r1]. */
export function linearScale(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
	const span = d1 - d0 || 1;
	return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** An SVG path through the points, as straight segments. */
export function linePath(
	points: readonly ChartPoint[],
	x: (t: number) => number,
	y: (s: number) => number
): string {
	return points
		.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(x(p.t))} ${round(y(p.score))}`)
		.join(' ');
}

/** The same path closed down to `baseline` (for the area wash). */
export function areaPath(
	points: readonly ChartPoint[],
	x: (t: number) => number,
	y: (s: number) => number,
	baseline: number
): string {
	if (!points.length) return '';
	const first = points[0];
	const last = points[points.length - 1];
	return `${linePath(points, x, y)} L${round(x(last.t))} ${round(y(baseline))} L${round(x(first.t))} ${round(y(baseline))} Z`;
}

/** The point whose time is nearest to `t` (for the hover crosshair). */
export function nearestPoint(points: readonly ChartPoint[], t: number): ChartPoint | null {
	if (!points.length) return null;
	const i = Math.max(0, Math.min(points.length - 1, Math.round(t - points[0].t)));
	return points[i];
}

function round(v: number): number {
	return Math.round(v * 10) / 10;
}
