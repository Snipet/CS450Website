import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { STATE_OF_THE_ART } from '../history/content';
import {
	BOARD_PRESETS,
	MAX_ITEMS,
	MAX_TEXT_LENGTH,
	addItem,
	checkNewItem,
	cleanText,
	countsByApproach,
	isBoard,
	itemsIn,
	placeItem,
	placedCount,
	removeItem,
	stateOfTheArtBoard,
	type BoardItem
} from './board';

const sample = (): BoardItem[] => [
	{ text: 'Medicine', at: null },
	{ text: 'Game playing', at: 'acting-rationally' },
	{ text: 'Chatbot', at: 'acting-humanly' }
];

describe('cleanText', () => {
	it('trims and collapses whitespace', () => {
		expect(cleanText('  Spam   filter \n')).toBe('Spam filter');
		expect(cleanText('   ')).toBe('');
	});
});

describe('addItem / checkNewItem', () => {
	it('adds a cleaned, unplaced item at the end', () => {
		const board = sample();
		const r = addItem(board, '  Spam  filter ');
		expect(r.diagnostics).toEqual([]);
		expect(r.index).toBe(3);
		expect(r.board[3]).toEqual({ text: 'Spam filter', at: null });
		expect(board).toHaveLength(3);
	});

	it('can add straight into an approach', () => {
		expect(addItem([], 'Chess', 'acting-rationally').board).toEqual([
			{ text: 'Chess', at: 'acting-rationally' }
		]);
	});

	it('reports empty, too long, duplicate, and full boards as diagnostics', () => {
		const board = sample();
		const empty = addItem(board, '   ');
		expect(empty.index).toBeNull();
		expect(empty.board).toEqual(board);
		expect(empty.diagnostics[0]).toMatchObject({ severity: 'error' });

		expect(checkNewItem(board, 'x'.repeat(MAX_TEXT_LENGTH + 1))[0].message).toMatch(
			String(MAX_TEXT_LENGTH)
		);
		expect(checkNewItem(board, 'x'.repeat(MAX_TEXT_LENGTH))).toEqual([]);
		expect(checkNewItem(board, 'game  PLAYING')[0].message).toBe(
			'“game PLAYING” is already on the board.'
		);

		const full = Array.from({ length: MAX_ITEMS }, (_, i) => ({ text: `App ${i}`, at: null }));
		expect(checkNewItem(full, 'One more')[0].message).toMatch(String(MAX_ITEMS));
	});
});

describe('placeItem / removeItem', () => {
	it('moves an item without mutating the board', () => {
		const board = sample();
		const next = placeItem(board, 0, 'thinking-humanly');
		expect(next[0]).toEqual({ text: 'Medicine', at: 'thinking-humanly' });
		expect(board[0].at).toBeNull();
		expect(placeItem(next, 0, null)[0].at).toBeNull();
		expect(placeItem(board, 9, 'acting-humanly')).toEqual(board);
	});

	it('removes an item by index', () => {
		expect(removeItem(sample(), 1).map((i) => i.text)).toEqual(['Medicine', 'Chatbot']);
		expect(removeItem(sample(), 7)).toEqual(sample());
	});
});

describe('queries', () => {
	it('lists items per place with their indices', () => {
		const board = sample();
		expect(itemsIn(board, null)).toEqual([{ item: board[0], index: 0 }]);
		expect(itemsIn(board, 'acting-humanly')).toEqual([{ item: board[2], index: 2 }]);
		expect(itemsIn(board, 'thinking-rationally')).toEqual([]);
	});

	it('counts placed items, overall and per approach', () => {
		expect(placedCount(sample())).toBe(2);
		expect(placedCount([])).toBe(0);
		expect(countsByApproach(sample())).toEqual({
			'acting-humanly': 1,
			'acting-rationally': 1,
			'thinking-humanly': 0,
			'thinking-rationally': 0
		});
	});
});

describe('stateOfTheArtBoard and presets', () => {
	it('starts with the ten slide 27 areas, unplaced', () => {
		const board = stateOfTheArtBoard();
		expect(board).toHaveLength(10);
		expect(board.map((i) => i.text)).toEqual(STATE_OF_THE_ART);
		expect(board.every((i) => i.at === null)).toBe(true);
		expect(isBoard(board)).toBe(true);
	});

	it('have unique ids, valid boards, and slide citations within the deck', () => {
		const ids = BOARD_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of BOARD_PRESETS) {
			expect(isBoard(p.value)).toBe(true);
			if (typeof p.cite?.slide === 'number') {
				expect(p.cite.slide).toBeLessThanOrEqual(decks[p.cite.deck].slides);
			}
		}
		expect(BOARD_PRESETS[0].cite).toEqual({ deck: 'intro', slide: 27 });
	});
});

describe('isBoard', () => {
	it('accepts clean, distinct items with valid places', () => {
		expect(isBoard([])).toBe(true);
		expect(isBoard(sample())).toBe(true);
	});

	it('rejects anything else', () => {
		expect(isBoard(null)).toBe(false);
		expect(isBoard({})).toBe(false);
		expect(isBoard([null])).toBe(false);
		expect(isBoard([{ text: 3, at: null }])).toBe(false);
		expect(isBoard([{ text: '', at: null }])).toBe(false);
		expect(isBoard([{ text: ' padded ', at: null }])).toBe(false);
		expect(isBoard([{ text: 'x'.repeat(MAX_TEXT_LENGTH + 1), at: null }])).toBe(false);
		expect(isBoard([{ text: 'A', at: 'somewhere' }])).toBe(false);
		expect(isBoard([{ text: 'A' }])).toBe(false);
		expect(
			isBoard([
				{ text: 'Chess', at: null },
				{ text: 'chess', at: null }
			])
		).toBe(false);
		const tooMany = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ text: `A${i}`, at: null }));
		expect(isBoard(tooMany)).toBe(false);
	});
});
