/**
 * Data and scales for the playback chart: h1, h2, and the moves left at each
 * board of a solution.
 */
import { misplacedTiles, manhattanDistance, type Board } from '$lib/theory/puzzle';

export interface ChartPoint {
	/** Moves made so far, g(n). */
	g: number;
	h1: number;
	h2: number;
	/** Moves left on this solution. */
	left: number;
}

export function chartPoints(boards: readonly Board[], goal: Board): ChartPoint[] {
	const last = boards.length - 1;
	return boards.map((b, g) => ({
		g,
		h1: misplacedTiles(b, goal),
		h2: manhattanDistance(b, goal),
		left: last - g
	}));
}

/**
 * Round tick values from 0 up to the first tick at or above `max`: steps of
 * 1, 2 or 5 times a power of ten, about `count` intervals, choosing the
 * smallest top among `count` to `count + 2` intervals.
 */
export function niceTicks(max: number, count = 4): number[] {
	if (!(max > 0) || !Number.isFinite(max)) return [0];
	let best: { step: number; top: number } | null = null;
	for (let n = Math.max(1, count); n <= Math.max(1, count) + 2; n++) {
		const raw = max / n;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
		const top = Math.ceil(max / step) * step;
		if (!best || top < best.top) best = { step, top };
	}
	const { step, top } = best!;
	const out: number[] = [];
	for (let i = 0; i * step <= top + step / 2; i++) out.push(Math.round(i * step * 1e6) / 1e6);
	return out;
}

/** SVG path through points given as [x, y] pairs. */
export function linePath(points: readonly (readonly [number, number])[]): string {
	return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join(' ');
}

const round = (n: number) => Math.round(n * 10) / 10;
