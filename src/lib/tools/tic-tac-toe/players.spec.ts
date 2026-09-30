import { describe, expect, it } from 'vitest';
import { EMPTY_BOARD } from '$lib/theory/games/tictactoe';
import { DEFAULT_WEIGHTS } from '$lib/theory/games/tictactoe-search';
import {
	PLAYER_INFO,
	PLAYER_KINDS,
	computerMove,
	hasHuman,
	isPlayerKind,
	kindOf,
	playerSearch
} from './players';

const settings = { depth: 3, weights: DEFAULT_WEIGHTS };

describe('players', () => {
	it('lists human, minimax, alpha-beta and depth-limited players', () => {
		expect(PLAYER_KINDS).toEqual(['human', 'minimax', 'alphabeta', 'depth']);
		for (const k of PLAYER_KINDS) {
			expect(PLAYER_INFO[k].label.length).toBeGreaterThan(0);
			expect(PLAYER_INFO[k].phrase.length).toBeGreaterThan(0);
		}
		expect(isPlayerKind('alphabeta')).toBe(true);
		expect(isPlayerKind('random')).toBe(false);
		expect(hasHuman({ X: 'minimax', O: 'human' })).toBe(true);
		expect(hasHuman({ X: 'minimax', O: 'depth' })).toBe(false);
		expect(kindOf({ X: 'minimax', O: 'human' }, 'O')).toBe('human');
	});

	it('has no computer move for a human player or a finished game', () => {
		expect(computerMove(EMPTY_BOARD, 'human', settings)).toBeNull();
		expect(computerMove('XOX.X.XOO', 'minimax', settings)).toBeNull();
	});

	it('plays the same move with minimax and alpha-beta, visiting fewer nodes with pruning', () => {
		for (const board of [EMPTY_BOARD, 'XO.......', 'XX..O....', 'XOXO...X.']) {
			const mm = computerMove(board, 'minimax', settings)!;
			const ab = computerMove(board, 'alphabeta', settings)!;
			expect(ab.square, board).toBe(mm.square);
			expect(ab.search.counts.nodes).toBeLessThan(mm.search.counts.nodes);
		}
		expect(computerMove(EMPTY_BOARD, 'minimax', settings)!.search.counts.nodes).toBe(549_946);
		expect(computerMove(EMPTY_BOARD, 'alphabeta', settings)!.search.counts.nodes).toBe(18_297);
	});

	it('runs alpha-beta with the cutoff for the depth-limited player', () => {
		const move = computerMove('.X.XO....', 'depth', settings)!;
		expect(move.kind).toBe('depth');
		expect(move.square).toBe(8);
		expect(move.search.algorithm).toBe('alphabeta');
		expect(move.search.depth).toBe(3);
		expect(playerSearch('.X.XO....', 'depth', { ...settings, depth: 4 }).move).not.toBe(8);
	});
});
