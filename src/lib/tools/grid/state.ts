/**
 * The grid tool's URL state: the grid text (`encodeGrid`) plus the search
 * settings. A link carrying only `{ grid }` (LinkStates['grid']) is accepted
 * and the other fields take their defaults.
 */
import { hasErrors } from '$lib/theory/diagnostics';
import { GRID_HEURISTICS, concaveGrid, decodeGrid, encodeGrid } from '$lib/theory/grid';
import type { GridHeuristic } from '$lib/theory/grid';
import type { StrategyId } from '$lib/theory/search';

/** Strategies offered on grids (all run as graph search). */
export type GridAlgorithm = Extract<
	StrategyId,
	'bfs' | 'dfs' | 'ucs' | 'greedy' | 'astar' | 'wastar'
>;

export const GRID_ALGORITHMS: readonly GridAlgorithm[] = [
	'bfs',
	'dfs',
	'ucs',
	'greedy',
	'astar',
	'wastar'
];

/** α for weighted A*: slide 39 uses "5 * Euclidean distance". */
export const DEFAULT_GRID_WEIGHT = 5;
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 20;

export interface GridToolState {
	/** The grid as `encodeGrid` writes it. */
	grid: string;
	algorithm: GridAlgorithm;
	/** A second algorithm run side by side, or null. */
	compare: GridAlgorithm | null;
	/** 8-connected moves. */
	diagonal: boolean;
	heuristic: GridHeuristic;
	/** α for weighted A*. */
	weight: number;
	/** Shade explored cells by expansion order. */
	shade: boolean;
}

/** What the URL may hold: the grid, and any of the other fields. */
export type SavedGridState = { grid: string } & Partial<Omit<GridToolState, 'grid'>>;

/** The page as first opened: A* around the slide 23 obstacle, 8-connected, Euclidean distance. */
export function defaultGridState(): GridToolState {
	return {
		grid: encodeGrid(concaveGrid()),
		algorithm: 'astar',
		compare: null,
		diagonal: true,
		heuristic: 'euclidean',
		weight: DEFAULT_GRID_WEIGHT,
		shade: true
	};
}

export const isGridAlgorithm = (v: unknown): v is GridAlgorithm =>
	typeof v === 'string' && (GRID_ALGORITHMS as readonly string[]).includes(v);

export const isGridHeuristic = (v: unknown): v is GridHeuristic =>
	typeof v === 'string' && (GRID_HEURISTICS as readonly string[]).includes(v);

const isWeight = (v: unknown): v is number =>
	typeof v === 'number' && Number.isFinite(v) && v >= MIN_WEIGHT && v <= MAX_WEIGHT;

/**
 * Accepts saved state whose grid decodes without errors and whose other
 * fields, when present, have the right types. Used as `syncToHash`'s `validate`.
 */
export function isSavedGridState(value: unknown): value is SavedGridState {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	if (typeof v.grid !== 'string') return false;
	if (hasErrors(decodeGrid(v.grid).diagnostics)) return false;
	if (v.algorithm !== undefined && !isGridAlgorithm(v.algorithm)) return false;
	if (v.compare !== undefined && v.compare !== null && !isGridAlgorithm(v.compare)) return false;
	if (v.diagonal !== undefined && typeof v.diagonal !== 'boolean') return false;
	if (v.heuristic !== undefined && !isGridHeuristic(v.heuristic)) return false;
	if (v.weight !== undefined && !isWeight(v.weight)) return false;
	if (v.shade !== undefined && typeof v.shade !== 'boolean') return false;
	return true;
}

/** Saved state with defaults for missing fields. */
export function completeGridState(saved: SavedGridState): GridToolState {
	const d = defaultGridState();
	return {
		grid: saved.grid,
		algorithm: saved.algorithm ?? d.algorithm,
		compare: saved.compare ?? null,
		diagonal: saved.diagonal ?? d.diagonal,
		heuristic: saved.heuristic ?? d.heuristic,
		weight: saved.weight ?? d.weight,
		shade: saved.shade ?? d.shade
	};
}
