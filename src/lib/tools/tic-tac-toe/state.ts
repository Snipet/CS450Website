/**
 * The tic-tac-toe tool's share-link state. It accepts
 * `LinkStates['tic-tac-toe']` (`{ board? }`, nine characters X, O, or .) and
 * adds the moves played since, the players, the cutoff settings, and the
 * view options.
 */
import {
	EMPTY_BOARD,
	moveText,
	parseBoard,
	parseMoveText,
	type Board
} from '$lib/theory/games/tictactoe';
import {
	DEFAULT_WEIGHTS,
	MAX_DEPTH,
	MIN_DEPTH,
	isWeights,
	type Weights
} from '$lib/theory/games/tictactoe-search';
import type { LinkStates } from '$lib/tools/links';
import { VALUE_MODES, type ValueMode } from './analysis';
import { gameBoards } from './game';
import { isPlayerKind, type PlayerKind } from './players';

export interface TicTacToeState {
	/** The position the game started from (nine characters, row by row). */
	board: Board;
	/** Squares played since, as digits 1–9 ("519"). */
	moves: string;
	x: PlayerKind;
	o: PlayerKind;
	/** Cutoff depth of the depth-limited player and values. */
	depth: number;
	/** Evaluation weights w1…w4 of X₂, X₁, O₂, O₁. */
	weights: [number, number, number, number];
	/** Values shown on the empty squares. */
	values: ValueMode;
	/** Highlight the best moves. */
	best: boolean;
	/** Levels drawn below the position in the game tree view. */
	levels: 1 | 2;
	/** Square 1–9 whose children the tree view draws at level 2; 0: the move minimax returns. */
	expand: number;
}

export type SavedTicTacToeState = LinkStates['tic-tac-toe'] &
	Partial<Omit<TicTacToeState, 'board'>>;

export const DEFAULT_DEPTH = 3;

export function defaultTicTacToeState(): TicTacToeState {
	return {
		board: EMPTY_BOARD,
		moves: '',
		x: 'human',
		o: 'minimax',
		depth: DEFAULT_DEPTH,
		weights: [...DEFAULT_WEIGHTS] as TicTacToeState['weights'],
		values: 'minimax',
		best: true,
		levels: 1,
		expand: 0
	};
}

const isInt = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Whether a decoded hash has the right shape: every field optional, each of
 * the right type and range; a board must be a possible position.
 */
export function isSavedTicTacToeState(value: unknown): value is SavedTicTacToeState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (v.board !== undefined && (typeof v.board !== 'string' || !parseBoard(v.board).board)) {
		return false;
	}
	if (v.moves !== undefined && (typeof v.moves !== 'string' || !parseMoveText(v.moves)))
		return false;
	if (v.x !== undefined && !isPlayerKind(v.x)) return false;
	if (v.o !== undefined && !isPlayerKind(v.o)) return false;
	if (v.depth !== undefined && !isInt(v.depth, MIN_DEPTH, MAX_DEPTH)) return false;
	if (v.weights !== undefined && !isWeights(v.weights)) return false;
	if (v.values !== undefined && !VALUE_MODES.includes(v.values as ValueMode)) return false;
	if (v.best !== undefined && typeof v.best !== 'boolean') return false;
	if (v.levels !== undefined && v.levels !== 1 && v.levels !== 2) return false;
	if (v.expand !== undefined && !isInt(v.expand, 0, 9)) return false;
	return true;
}

/** A saved state with defaults for missing fields; moves are cut at the first illegal one. */
export function completeTicTacToeState(saved: SavedTicTacToeState): TicTacToeState {
	const d = defaultTicTacToeState();
	const board = (saved.board !== undefined && parseBoard(saved.board).board) || d.board;
	const squares = parseMoveText(saved.moves ?? '') ?? [];
	const legal = gameBoards(board, squares).length - 1;
	const weights: Weights = saved.weights ?? d.weights;
	return {
		board,
		moves: moveText(squares.slice(0, legal)),
		x: saved.x ?? d.x,
		o: saved.o ?? d.o,
		depth: saved.depth ?? d.depth,
		weights: [weights[0], weights[1], weights[2], weights[3]],
		values: saved.values ?? d.values,
		best: saved.best ?? d.best,
		levels: saved.levels ?? d.levels,
		expand: saved.expand ?? d.expand
	};
}
