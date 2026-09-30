/**
 * Who plays X and O: a person clicking squares, or a computer player that
 * searches the game tree. Every computer player returns the first square in
 * search order with the best backed-up value, so minimax and alpha-beta
 * (square order) always play the same move; they differ in the nodes visited.
 */
import type { Board, Mark } from '$lib/theory/games/tictactoe';
import {
	alphaBeta,
	minimax,
	type GameSearch,
	type Weights
} from '$lib/theory/games/tictactoe-search';

export type PlayerKind = 'human' | 'minimax' | 'alphabeta' | 'depth';
export type ComputerKind = Exclude<PlayerKind, 'human'>;

export const PLAYER_KINDS: readonly PlayerKind[] = ['human', 'minimax', 'alphabeta', 'depth'];

export const PLAYER_INFO: Record<
	PlayerKind,
	{ label: string; phrase: string; description: string }
> = {
	human: {
		label: 'Human',
		phrase: 'a human player',
		description: 'Moves are played by clicking a square.'
	},
	minimax: {
		label: 'Minimax',
		phrase: 'minimax',
		description:
			'Searches the whole game tree below the position and plays the first square with the best minimax value.'
	},
	alphabeta: {
		label: 'Alpha-beta',
		phrase: 'alpha-beta search',
		description:
			'Minimax with alpha-beta pruning, children in square order: the same move as minimax, fewer nodes visited.'
	},
	depth: {
		label: 'Depth-limited',
		phrase: 'depth-limited search',
		description:
			'Alpha-beta cut off at the cutoff depth; states at the cutoff are scored with the evaluation function.'
	}
};

export function isPlayerKind(value: unknown): value is PlayerKind {
	return PLAYER_KINDS.includes(value as PlayerKind);
}

export interface Players {
	X: PlayerKind;
	O: PlayerKind;
}

export interface ComputerMove {
	kind: ComputerKind;
	square: number;
	/** The search that chose the move. */
	search: GameSearch;
}

export interface CutoffSettings {
	depth: number;
	weights: Weights;
}

/** The search a computer player runs on `board`. */
export function playerSearch(
	board: Board,
	kind: ComputerKind,
	settings: CutoffSettings
): GameSearch {
	switch (kind) {
		case 'minimax':
			return minimax(board);
		case 'alphabeta':
			return alphaBeta(board);
		case 'depth':
			return alphaBeta(board, { depth: settings.depth, weights: settings.weights });
	}
}

/** The move a computer player makes, or null for a human player or a finished game. */
export function computerMove(
	board: Board,
	kind: PlayerKind,
	settings: CutoffSettings
): ComputerMove | null {
	if (kind === 'human') return null;
	const search = playerSearch(board, kind, settings);
	if (search.move === null) return null;
	return { kind, square: search.move, search };
}

/** Player kind of the side to move. */
export const kindOf = (players: Players, mark: Mark): PlayerKind => players[mark];

export const hasHuman = (players: Players): boolean =>
	players.X === 'human' || players.O === 'human';
