/**
 * What the tic-tac-toe page shows about a position: the value on each empty
 * square, the node counts of minimax and alpha-beta under each move
 * ordering, and how a depth-limited search compares with the full search.
 */
import { EMPTY_BOARD, isTerminal, result, type Board } from '$lib/theory/games/tictactoe';
import {
	ORDERING_INFO,
	alphaBeta,
	minimax,
	minimaxValue,
	type GameSearch,
	type MoveOrdering,
	type SearchCounts,
	type Weights
} from '$lib/theory/games/tictactoe-search';

export type ValueMode = 'minimax' | 'depth' | 'off';

export const VALUE_MODES: readonly ValueMode[] = ['minimax', 'depth', 'off'];

export interface MoveAnnotations {
	/** Value per square (index 0–8); null for occupied squares or when values are off. */
	values: (number | null)[];
	/** Squares with the best value for the side to move. */
	best: number[];
	/** Every legal move has the best value (nothing to single out). */
	allBest: boolean;
	search: GameSearch | null;
}

/**
 * Values for the side to move: minimax values (+1, 0, −1 for MAX) or the
 * depth-limited values with the evaluation function. `best` is filled even
 * when values are off, so the best moves can be highlighted on their own.
 */
export function moveAnnotations(
	board: Board,
	mode: ValueMode,
	cutoff: { depth: number; weights: Weights }
): MoveAnnotations {
	const values: (number | null)[] = new Array(9).fill(null);
	if (isTerminal(board)) return { values, best: [], allBest: false, search: null };
	const search =
		mode === 'depth'
			? minimax(board, { depth: cutoff.depth, weights: cutoff.weights })
			: minimax(board);
	if (mode !== 'off') for (const m of search.moves) values[m.square] = m.value;
	return { values, best: search.best, allBest: search.best.length === search.moves.length, search };
}

export interface StatsRow {
	id: 'minimax' | `alphabeta-${MoveOrdering}`;
	label: string;
	/** The move ordering, for alpha-beta rows. */
	ordering: MoveOrdering | null;
	counts: SearchCounts;
}

const statsCache = new Map<Board, StatsRow[]>();
const STATS_CACHE_SIZE = 64;

/** Node counts of minimax and of alpha-beta under each ordering, from `board`. */
export function searchStats(board: Board): StatsRow[] {
	const hit = statsCache.get(board);
	if (hit) return hit;
	const orderings: MoveOrdering[] = ['squares', 'center', 'best'];
	const rows: StatsRow[] = [
		{ id: 'minimax', label: 'Minimax', ordering: null, counts: minimax(board).counts },
		...orderings.map((ordering) => ({
			id: `alphabeta-${ordering}` as const,
			label: `Alpha-beta, ${ORDERING_INFO[ordering].label.toLowerCase()}`,
			ordering,
			counts: alphaBeta(board, { ordering }).counts
		}))
	];
	if (statsCache.size >= STATS_CACHE_SIZE) {
		statsCache.delete(statsCache.keys().next().value as Board);
	}
	statsCache.set(board, rows);
	return rows;
}

/** `searchStats` of the empty board. */
export const emptyBoardStats = (): StatsRow[] => searchStats(EMPTY_BOARD);

/** Share of `part` in `whole` as a percentage string: "3.3%", "0.42%", "100%". */
export function percent(part: number, whole: number): string {
	if (whole <= 0) return '—';
	const p = (100 * part) / whole;
	if (p >= 99.95) return '100%';
	if (p >= 10) return `${p.toFixed(0)}%`;
	if (p >= 1) return `${p.toFixed(1)}%`;
	return `${p.toFixed(2)}%`;
}

export interface CutoffRow {
	square: number;
	/** Depth-limited value (Eval at the cutoff, ±100 for a win found in time). */
	limited: number;
	/** Minimax value of the move (+1, 0, −1). */
	exact: number;
}

export interface CutoffReport {
	/** Depth-limited minimax: every move's backed-up value. */
	search: GameSearch;
	/** The same cutoff with alpha-beta (what the depth-limited player runs). */
	pruned: GameSearch;
	rows: CutoffRow[];
	/** The move the depth-limited search returns. */
	chosen: number;
	/** Minimax value of the chosen move. */
	chosenValue: number;
	/** Minimax value of the position. */
	value: number;
	/** The chosen move is worse for the side to move than its best move. */
	worse: boolean;
	/** The cutoff covers the rest of the game (no state is scored with Eval). */
	complete: boolean;
}

/** Depth-limited search from `board` next to the full minimax values; null when the game is over. */
export function cutoffReport(board: Board, depth: number, weights: Weights): CutoffReport | null {
	if (isTerminal(board)) return null;
	const search = minimax(board, { depth, weights });
	const pruned = alphaBeta(board, { depth, weights });
	const rows = search.moves.map((m) => ({
		square: m.square,
		limited: m.value,
		exact: minimaxValue(result(board, m.square))
	}));
	const chosen = search.move!;
	const chosenValue = minimaxValue(result(board, chosen));
	const value = minimaxValue(board);
	const sign = search.player === 'MAX' ? 1 : -1;
	return {
		search,
		pruned,
		rows,
		chosen,
		chosenValue,
		value,
		worse: sign * chosenValue < sign * value,
		complete: search.counts.evaluations === 0
	};
}
