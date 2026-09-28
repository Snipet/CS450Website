/**
 * What the grid drawing shows at each step of a search, derived once per
 * search result in O(nodes) and then per step in O(cells):
 *
 * - a cell enters the frontier at the step that first added a node for it
 *   (a cheaper node replacing it keeps the cell on the frontier);
 * - it leaves the frontier at the step that takes it off (graph search takes
 *   every cell off at most once), and from then on it is explored;
 * - the cell taken off at the current step is the one being expanded.
 */
import type { SearchResult } from '$lib/theory/search';

export interface RunTimeline {
	/** Number of cells on the grid. */
	cells: number;
	/** Number of steps (`result.steps.length`). */
	steps: number;
	/** Step at which each cell first entered the frontier, or -1. */
	opened: Int32Array;
	/** Step at which each cell was taken off the frontier, or -1. */
	closed: Int32Array;
	/** Cell taken off the frontier at each step (-1 for `init` and `fail`). */
	stepCell: Int32Array;
	/** Frontier size after each step. */
	frontier: Int32Array;
	/** Largest frontier size up to and including each step. */
	maxFrontier: Int32Array;
	/** The step that found the goal, or null. */
	goalStep: number | null;
	/** Cells on the solution path, start to goal, or null. */
	path: number[] | null;
}

const cellOf = (key: string) => Number(key);

/** Per-cell timing of a grid search recorded with `record: 'nodes'` or `'full'`. */
export function runTimeline(result: SearchResult, cells: number): RunTimeline {
	const steps = result.steps.length;
	const opened = new Int32Array(cells).fill(-1);
	const closed = new Int32Array(cells).fill(-1);
	const stepCell = new Int32Array(steps).fill(-1);
	const delta = new Int32Array(steps + 1);

	for (const n of result.nodes) {
		const added = n.outcome === null || n.outcome === 'added' || n.outcome === 'replaced';
		if (!added) continue;
		const cell = cellOf(n.key);
		if (cell >= 0 && cell < cells && (opened[cell] < 0 || n.created < opened[cell]))
			opened[cell] = n.created;
		delta[n.created]++;
		const gone =
			n.closed !== null && n.replacedAt !== null
				? Math.min(n.closed, n.replacedAt)
				: (n.closed ?? n.replacedAt);
		if (gone !== null) delta[gone]--;
		if (n.closed !== null && cell >= 0 && cell < cells) {
			closed[cell] = n.closed;
			if (n.closed < steps) stepCell[n.closed] = cell;
		}
	}

	const frontier = new Int32Array(steps);
	const maxFrontier = new Int32Array(steps);
	let size = 0;
	let max = 0;
	for (let i = 0; i < steps; i++) {
		size += delta[i];
		max = Math.max(max, size);
		frontier[i] = size;
		maxFrontier[i] = max;
	}

	const solution = result.solution;
	const goalStep = solution ? (result.nodes[solution.node].closed ?? steps - 1) : null;
	const path = solution ? solution.path.map((id) => cellOf(result.nodes[id].key)) : null;
	return { cells, steps, opened, closed, stepCell, frontier, maxFrontier, goalStep, path };
}

export interface CellLayers {
	/** Explored cells (expanded before this step), split into `buckets` groups by expansion order, oldest first. */
	explored: number[][];
	/** Cells on the frontier after this step. */
	frontier: number[];
	/** The cell taken off the frontier at this step, if any. */
	current: number | null;
	/** Solution path cells once the goal has been found. */
	path: number[] | null;
}

/**
 * Cells by status after step `step`. With `buckets > 1`, explored cells are
 * grouped by when they were expanded, relative to the current step (the last
 * group holds the most recent expansions).
 */
export function cellLayers(t: RunTimeline, step: number, buckets = 1): CellLayers {
	const s = Math.max(0, Math.min(step, t.steps - 1));
	const groups = Math.max(1, Math.floor(buckets));
	const explored: number[][] = Array.from({ length: groups }, () => []);
	const frontier: number[] = [];
	const current = t.steps > 0 && t.stepCell[s] >= 0 ? t.stepCell[s] : null;
	for (let cell = 0; cell < t.cells; cell++) {
		const c = t.closed[cell];
		if (c >= 0 && c <= s) {
			if (c === s) continue;
			const g = groups === 1 ? 0 : Math.min(groups - 1, Math.floor((c / s) * groups));
			explored[g].push(cell);
		} else if (t.opened[cell] >= 0 && t.opened[cell] <= s) frontier.push(cell);
	}
	const found = t.goalStep !== null && s >= t.goalStep;
	return { explored, frontier, current, path: found ? t.path : null };
}

/**
 * SVG path data covering the given cells (ascending indices) in a grid of
 * `width` columns with 1-unit cells; runs of adjacent cells in a row become
 * one rectangle.
 */
export function cellsPath(cells: readonly number[], width: number): string {
	let d = '';
	let i = 0;
	while (i < cells.length) {
		const first = cells[i];
		const row = Math.floor(first / width);
		let len = 1;
		while (
			i + len < cells.length &&
			cells[i + len] === first + len &&
			Math.floor(cells[i + len] / width) === row
		)
			len++;
		d += `M${first % width} ${row}h${len}v1h${-len}z`;
		i += len;
	}
	return d;
}

/** Walls as SVG path data. */
export function wallsPath(walls: readonly boolean[], width: number): string {
	const cells: number[] = [];
	walls.forEach((w, i) => {
		if (w) cells.push(i);
	});
	return cellsPath(cells, width);
}

/** Interior grid lines as SVG path data. */
export function gridLinesPath(width: number, height: number): string {
	let d = '';
	for (let c = 1; c < width; c++) d += `M${c} 0V${height}`;
	for (let r = 1; r < height; r++) d += `M0 ${r}H${width}`;
	return d;
}

/** Cell centers for an SVG polyline, "0.5,1.5 1.5,1.5 …". */
export function pathPoints(cells: readonly number[], width: number): string {
	return cells.map((c) => `${(c % width) + 0.5},${Math.floor(c / width) + 0.5}`).join(' ');
}

/** Cells along a straight line from `a` to `b` (Bresenham), both ends included. */
export function cellsBetween(a: number, b: number, width: number): number[] {
	let x0 = a % width;
	let y0 = Math.floor(a / width);
	const x1 = b % width;
	const y1 = Math.floor(b / width);
	const dx = Math.abs(x1 - x0);
	const dy = -Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx + dy;
	const out: number[] = [];
	for (;;) {
		out.push(y0 * width + x0);
		if (x0 === x1 && y0 === y1) break;
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			x0 += sx;
		}
		if (e2 <= dx) {
			err += dx;
			y0 += sy;
		}
	}
	return out;
}

export interface RunStats {
	/** Nodes expanded so far (successors generated). */
	expanded: number;
	/** Nodes generated so far, including the start and dropped children. */
	generated: number;
	frontier: number;
	maxFrontier: number;
	/** Whether the search has ended at this step. */
	done: boolean;
	/** Set once the goal is found. */
	path: { moves: number; cost: number } | null;
	/** Set when the search ended without reaching the goal. */
	failed: boolean;
}

/** Counters after step `step`. */
export function runStats(result: SearchResult, t: RunTimeline, step: number): RunStats {
	const s = Math.max(0, Math.min(step, t.steps - 1));
	const st = result.steps[s];
	const done = s >= t.steps - 1;
	const found = t.goalStep !== null && s >= t.goalStep && result.solution !== null;
	return {
		expanded: st?.expanded ?? 0,
		generated: st?.generated ?? 0,
		frontier: t.frontier[s] ?? 0,
		maxFrontier: t.maxFrontier[s] ?? 0,
		done,
		path: found ? { moves: result.solution!.depth, cost: result.solution!.cost } : null,
		failed: done && result.solution === null
	};
}

/** Whether a path cost is optimal, allowing for rounding in sums of √2. */
export function isOptimalCost(cost: number, optimal: number | null): boolean {
	return optimal !== null && Math.abs(cost - optimal) < 1e-9;
}
