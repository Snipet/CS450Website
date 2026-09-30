import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import {
	boardDiagnostics,
	formatBoard,
	isTerminal,
	result,
	toMove
} from '$lib/theory/games/tictactoe';
import { minimax, minimaxValue } from '$lib/theory/games/tictactoe-search';
import { defaultTicTacToeState } from './state';
import { DEFAULT_PRESET, HORIZON_BOARD, TIC_TAC_TOE_PRESETS, matchPreset } from './presets';

const preset = (id: string) => TIC_TAC_TOE_PRESETS.find((p) => p.id === id)!;
const oneBased = (squares: number[]) => squares.map((s) => s + 1);

describe('TIC_TAC_TOE_PRESETS', () => {
	it('has unique ids, possible boards, and citations of existing slides', () => {
		expect(new Set(TIC_TAC_TOE_PRESETS.map((p) => p.id)).size).toBe(TIC_TAC_TOE_PRESETS.length);
		for (const p of TIC_TAC_TOE_PRESETS) {
			expect(boardDiagnostics(p.value.board), p.id).toEqual([]);
			expect(isTerminal(p.value.board), p.id).toBe(false);
			expect(p.cite?.deck, p.id).toBe('adversarial');
			expect(p.cite!.slide as number).toBeLessThanOrEqual(decks.adversarial.slides);
			if (p.id !== 'empty') expect(p.description, p.id).toContain(formatBoard(p.value.board));
		}
		expect(DEFAULT_PRESET.id).toBe('empty');
	});

	it('empty board: minimax value 0', () => {
		expect(minimaxValue(preset('empty').value.board)).toBe(0);
	});

	it('X can force a win with squares 4, 5 and 7', () => {
		const b = preset('forced-win').value.board;
		expect(toMove(b)).toBe('X');
		const r = minimax(b);
		expect(r.value).toBe(1);
		expect(oneBased(r.best)).toEqual([4, 5, 7]);
	});

	it('O must block on square 3', () => {
		const b = preset('block').value.board;
		expect(toMove(b)).toBe('O');
		const r = minimax(b);
		expect(r.value).toBe(0);
		expect(oneBased(r.best)).toEqual([3]);
		expect(r.moves.filter((m) => m.square !== 2).every((m) => m.value === 1)).toBe(true);
	});

	it('drawn endgame: squares 5 and 9 hold the draw, 6 and 7 lose', () => {
		const b = preset('endgame').value.board;
		expect(toMove(b)).toBe('O');
		expect([...b].filter((c) => c === '.')).toHaveLength(4);
		const r = minimax(b);
		expect(r.value).toBe(0);
		expect(oneBased(r.best)).toEqual([5, 9]);
		expect(r.moves.filter((m) => m.value === 1).map((m) => m.square + 1)).toEqual([6, 7]);
	});

	it('horizon effect: cutoff 3 picks square 9 (Eval −4), a loss for O', () => {
		const p = preset('horizon');
		expect(p.value).toMatchObject({ board: HORIZON_BOARD, o: 'depth', depth: 3, values: 'depth' });
		const shallow = minimax(HORIZON_BOARD, { depth: 3 });
		expect(shallow.move).toBe(8);
		expect(shallow.value).toBe(-4);
		expect(minimaxValue(HORIZON_BOARD)).toBe(0);
		// X's reply on square 1 is forced and threatens squares 3 and 7.
		const afterO = result(HORIZON_BOARD, 8);
		expect(minimax(afterO).best).toEqual([0]);
		expect(minimaxValue(afterO)).toBe(1);
	});
});

describe('matchPreset', () => {
	it('matches a preset’s board with no moves and its players', () => {
		const s = defaultTicTacToeState();
		expect(matchPreset(s)?.id).toBe('empty');
		expect(matchPreset({ ...s, moves: '5' })).toBeNull();
		expect(matchPreset({ ...s, board: HORIZON_BOARD })).toBeNull();
		expect(matchPreset({ ...s, board: HORIZON_BOARD, o: 'depth', depth: 3 })?.id).toBe('horizon');
		expect(matchPreset({ ...s, board: 'XO.......' })?.id).toBe('forced-win');
	});
});
