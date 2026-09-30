/**
 * Example positions for the tic-tac-toe tool. The values and best moves in
 * the descriptions are checked with minimax in presets.spec.ts.
 */
import type { Preset } from '$lib/components/ui';
import { EMPTY_BOARD, formatBoard, type Board } from '$lib/theory/games/tictactoe';
import type { ValueMode } from './analysis';
import type { PlayerKind } from './players';

export interface TicTacToeScenario {
	board: Board;
	/** Players set by the preset (others are kept). */
	x?: PlayerKind;
	o?: PlayerKind;
	/** Cutoff depth set by the preset. */
	depth?: number;
	/** Values shown on the board. */
	values?: ValueMode;
}

export const HORIZON_BOARD: Board = '.X.XO....';

export const TIC_TAC_TOE_PRESETS: readonly Preset<TicTacToeScenario>[] = [
	{
		id: 'empty',
		label: 'Empty board',
		group: 'Positions',
		description: 'X (MAX) moves first. Minimax value 0: a draw with perfect play by both sides.',
		cite: { deck: 'adversarial', slide: 6 },
		value: { board: EMPTY_BOARD }
	},
	{
		id: 'forced-win',
		label: 'X can force a win',
		group: 'Positions',
		description: `${formatBoard('XO.......')}: X in a corner, O on the next edge square, X to move. Minimax value +1: squares 4, 5 and 7 win by force.`,
		cite: { deck: 'adversarial', slide: 10 },
		value: { board: 'XO.......' }
	},
	{
		id: 'block',
		label: 'O must block',
		group: 'Positions',
		description: `${formatBoard('XX..O....')}: X threatens the top row, O to move. Only square 3 keeps the value at 0; every other move has value +1.`,
		cite: { deck: 'adversarial', slide: 11 },
		value: { board: 'XX..O....' }
	},
	{
		id: 'endgame',
		label: 'Drawn endgame',
		group: 'Positions',
		description: `${formatBoard('XOXO...X.')}: O to move with four squares left. Squares 5 and 9 hold the draw; squares 6 and 7 lose.`,
		cite: { deck: 'adversarial', slide: 11 },
		value: { board: 'XOXO...X.' }
	},
	{
		id: 'horizon',
		label: 'Horizon effect',
		group: 'Evaluation function',
		description: `${formatBoard(HORIZON_BOARD)}: O is played by depth-limited search with cutoff 3. It picks square 9 (Eval −4), but X’s forced reply on square 1 threatens two lines; X wins at ply 4, just past the cutoff.`,
		cite: { deck: 'adversarial', slide: 25 },
		value: { board: HORIZON_BOARD, x: 'human', o: 'depth', depth: 3, values: 'depth' }
	}
];

/** The preset loaded when the page opens. */
export const DEFAULT_PRESET = TIC_TAC_TOE_PRESETS[0];

/** The preset a state shows: its board with no moves played and the players and depth it sets. */
export function matchPreset(state: {
	board: Board;
	moves: string;
	x: PlayerKind;
	o: PlayerKind;
	depth: number;
}): Preset<TicTacToeScenario> | null {
	if (state.moves !== '') return null;
	return (
		TIC_TAC_TOE_PRESETS.find(
			(p) =>
				p.value.board === state.board &&
				(p.value.x === undefined || p.value.x === state.x) &&
				(p.value.o === undefined || p.value.o === state.o) &&
				(p.value.depth === undefined || p.value.depth === state.depth)
		) ?? null
	);
}
