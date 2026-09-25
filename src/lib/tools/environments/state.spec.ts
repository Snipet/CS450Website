import { describe, expect, it } from 'vitest';
import { decode, encode } from '$lib/url-state';
import { emptyPeas, peasExample, SLIDE_17_IDS } from '$lib/theory/agents/environments';
import {
	MAX_COLUMNS,
	MAX_NAME_LENGTH,
	MAX_PEAS_LENGTH,
	addCustom,
	addExample,
	columnExample,
	columnName,
	columnPeas,
	columnProfile,
	completeEnvironmentsState,
	defaultEnvironmentsState,
	duplicateColumn,
	findColumn,
	isDefaultTable,
	isEdited,
	isSavedEnvironmentsState,
	nextCustomKey,
	removeColumn,
	renameColumn,
	resetColumn,
	selectColumn,
	setColumnPeas,
	setColumnValue,
	type Column,
	type EnvironmentsToolState
} from './state';

const keys = (s: EnvironmentsToolState) => s.columns.map((c) => c.key);
const col = (s: EnvironmentsToolState, key: string) => {
	const c = findColumn(s, key);
	if (!c) throw new Error(`no column ${key}`);
	return c;
};

describe('default state', () => {
	it('opens on the slide 17 table with Autonomous driving selected', () => {
		const d = defaultEnvironmentsState();
		expect(keys(d)).toEqual(SLIDE_17_IDS);
		expect(d.columns.every((c) => c.kind === 'example' && !c.values)).toBe(true);
		expect(d.selected).toBe('autonomous-driving');
		expect(isDefaultTable(d)).toBe(true);
	});
});

describe('reading columns', () => {
	it('reads example columns', () => {
		const c: Column = { kind: 'example', key: 'chess-clock' };
		expect(columnExample(c)?.name).toBe('Chess with a clock');
		expect(columnName(c)).toBe('Chess with a clock');
		expect(columnProfile(c).static).toBe('semidynamic');
		expect(isEdited(c)).toBe(false);
		expect(columnPeas(c)).toBeNull();
		expect(columnPeas({ kind: 'example', key: 'spam-filter' })).toEqual(
			peasExample('spam-filter')!.peas
		);
		// Autonomous driving shows the autonomous taxi's PEAS (slide 7).
		expect(columnPeas({ kind: 'example', key: 'autonomous-driving' })).toEqual(
			peasExample('taxi')!.peas
		);
	});

	it('reads custom columns', () => {
		const c: Column = {
			kind: 'custom',
			key: 'custom-1',
			name: '  ',
			values: { agents: 'multi' },
			peas: emptyPeas()
		};
		expect(columnName(c)).toBe('Untitled environment');
		expect(columnName({ ...c, name: 'Poker' })).toBe('Poker');
		expect(columnProfile(c)).toEqual({ agents: 'multi' });
		expect(columnExample(c)).toBeUndefined();
		expect(isEdited(c)).toBe(false);
		expect(columnPeas(c)).toEqual(emptyPeas());
		expect(findColumn(defaultEnvironmentsState(), null)).toBeUndefined();
	});
});

describe('changing columns', () => {
	it('adds an example once and selects it', () => {
		const s = addExample(defaultEnvironmentsState(), 'taxi');
		expect(keys(s)).toEqual([...SLIDE_17_IDS, 'taxi']);
		expect(s.selected).toBe('taxi');
		const again = addExample({ ...s, selected: 'scrabble' }, 'taxi');
		expect(keys(again)).toEqual(keys(s));
		expect(again.selected).toBe('taxi');
		expect(addExample(s, 'poker')).toBe(s);
	});

	it('adds custom environments with increasing keys', () => {
		let s = addCustom(defaultEnvironmentsState());
		expect(s.selected).toBe('custom-1');
		const c = col(s, 'custom-1');
		expect(c).toEqual({
			kind: 'custom',
			key: 'custom-1',
			name: 'New environment',
			values: {},
			peas: emptyPeas()
		});
		s = addCustom(s, { name: 'Poker', values: { agents: 'multi' } });
		expect(keys(s).slice(-2)).toEqual(['custom-1', 'custom-2']);
		expect(columnName(col(addCustom(s), 'custom-3'))).toBe('New environment 3');
		s = removeColumn(s, 'custom-1');
		expect(nextCustomKey(s.columns)).toBe('custom-3');
		expect(nextCustomKey([])).toBe('custom-1');
	});

	it('does not grow past MAX_COLUMNS', () => {
		let s: EnvironmentsToolState = { columns: [], selected: null };
		for (let i = 0; i < MAX_COLUMNS + 3; i++) s = addCustom(s);
		expect(s.columns).toHaveLength(MAX_COLUMNS);
		expect(addExample(s, 'taxi')).toBe(s);
	});

	it('duplicates a column as a custom one right after it', () => {
		const s = duplicateColumn(defaultEnvironmentsState(), 'scrabble');
		expect(keys(s)).toEqual([
			'word-jumble',
			'chess-clock',
			'scrabble',
			'custom-1',
			'autonomous-driving'
		]);
		expect(s.selected).toBe('custom-1');
		const copy = col(s, 'custom-1');
		expect(copy).toMatchObject({ kind: 'custom', name: 'Scrabble (copy)' });
		expect(columnProfile(copy)).toEqual(columnProfile(col(s, 'scrabble')));
		expect(columnPeas(copy)).toEqual(emptyPeas());
		const taxi = duplicateColumn(addExample(s, 'taxi'), 'taxi');
		expect(columnPeas(col(taxi, 'custom-2'))).toEqual(peasExample('taxi')!.peas);
		expect(duplicateColumn(s, 'nope')).toBe(s);
	});

	it('keeps duplicated names within the length limit', () => {
		const long = 'x'.repeat(MAX_NAME_LENGTH);
		const s = duplicateColumn(addCustom(defaultEnvironmentsState(), { name: long }), 'custom-1');
		expect(columnName(col(s, 'custom-2'))).toHaveLength(MAX_NAME_LENGTH);
		expect(columnName(col(s, 'custom-2')).endsWith(' (copy)')).toBe(true);
	});

	it('removes a column and moves the selection to a neighbour', () => {
		const d = defaultEnvironmentsState();
		const s = removeColumn(d, 'autonomous-driving');
		expect(keys(s)).toEqual(SLIDE_17_IDS.slice(0, 3));
		expect(s.selected).toBe('scrabble');
		const t = removeColumn({ ...d, selected: 'chess-clock' }, 'chess-clock');
		expect(t.selected).toBe('scrabble');
		expect(removeColumn(d, 'word-jumble').selected).toBe('autonomous-driving');
		let empty = d;
		for (const k of SLIDE_17_IDS) empty = removeColumn(empty, k);
		expect(empty).toEqual({ columns: [], selected: null });
		expect(removeColumn(d, 'nope')).toBe(d);
	});

	it('selects existing columns only', () => {
		const d = defaultEnvironmentsState();
		expect(selectColumn(d, 'scrabble').selected).toBe('scrabble');
		expect(selectColumn(d, 'nope')).toBe(d);
	});

	it('edits an example’s values and drops the edit when they match again', () => {
		const d = defaultEnvironmentsState();
		const s = setColumnValue(d, 'chess-clock', 'static', 'static');
		const chess = col(s, 'chess-clock');
		expect(isEdited(chess)).toBe(true);
		expect(columnProfile(chess).static).toBe('static');
		expect(columnProfile(chess).deterministic).toBe('strategic');
		expect(isDefaultTable(s)).toBe(false);
		const back = setColumnValue(s, 'chess-clock', 'static', 'semidynamic');
		expect(col(back, 'chess-clock')).toEqual({ kind: 'example', key: 'chess-clock' });
		expect(isDefaultTable(back)).toBe(true);
		// The input is not changed.
		expect(col(d, 'chess-clock')).toEqual({ kind: 'example', key: 'chess-clock' });
	});

	it('sets Known on a slide example and clears it again', () => {
		const s = setColumnValue(defaultEnvironmentsState(), 'scrabble', 'known', 'known');
		expect(columnProfile(col(s, 'scrabble')).known).toBe('known');
		const t = setColumnValue(s, 'scrabble', 'known', undefined);
		expect(col(t, 'scrabble')).toEqual({ kind: 'example', key: 'scrabble' });
	});

	it('sets and clears custom values in slide order', () => {
		let s = addCustom(defaultEnvironmentsState());
		s = setColumnValue(s, 'custom-1', 'known', 'unknown');
		s = setColumnValue(s, 'custom-1', 'observable', 'partially');
		const values = columnProfile(col(s, 'custom-1'));
		expect(Object.keys(values)).toEqual(['observable', 'known']);
		s = setColumnValue(s, 'custom-1', 'observable', undefined);
		expect(columnProfile(col(s, 'custom-1'))).toEqual({ known: 'unknown' });
	});

	it('ignores values of the wrong dimension and unknown columns', () => {
		const d = defaultEnvironmentsState();
		// @ts-expect-error: not a value of this dimension
		expect(setColumnValue(d, 'scrabble', 'static', 'multi')).toBe(d);
		expect(setColumnValue(d, 'nope', 'static', 'static')).toBe(d);
	});

	it('resets an edited example', () => {
		const s = setColumnValue(defaultEnvironmentsState(), 'scrabble', 'agents', 'single');
		expect(col(resetColumn(s, 'scrabble'), 'scrabble')).toEqual({
			kind: 'example',
			key: 'scrabble'
		});
	});

	it('renames custom columns and edits their PEAS within the limits', () => {
		let s = addCustom(defaultEnvironmentsState());
		s = renameColumn(s, 'custom-1', 'Poker');
		s = setColumnPeas(s, 'custom-1', 'sensors', 'Own cards, bets');
		const c = col(s, 'custom-1');
		expect(columnName(c)).toBe('Poker');
		expect(columnPeas(c)?.sensors).toBe('Own cards, bets');
		s = renameColumn(s, 'custom-1', 'y'.repeat(200));
		expect(columnName(col(s, 'custom-1'))).toHaveLength(MAX_NAME_LENGTH);
		s = setColumnPeas(s, 'custom-1', 'actuators', 'z'.repeat(1000));
		expect(columnPeas(col(s, 'custom-1'))?.actuators).toHaveLength(MAX_PEAS_LENGTH);
		// Example columns keep their names and slide PEAS.
		const d = defaultEnvironmentsState();
		expect(renameColumn(d, 'scrabble', 'x').columns).toEqual(d.columns);
		expect(setColumnPeas(d, 'scrabble', 'sensors', 'x').columns).toEqual(d.columns);
	});
});

describe('URL state', () => {
	it('accepts the cross-tool link shape (LinkStates["environments"])', () => {
		expect(isSavedEnvironmentsState({})).toBe(true);
		expect(isSavedEnvironmentsState({ preset: 'taxi' })).toBe(true);
		const s = completeEnvironmentsState({ preset: 'taxi' });
		expect(keys(s)).toEqual([...SLIDE_17_IDS, 'taxi']);
		expect(s.selected).toBe('taxi');
		const scrabble = completeEnvironmentsState({ preset: 'scrabble' });
		expect(keys(scrabble)).toEqual(SLIDE_17_IDS);
		expect(scrabble.selected).toBe('scrabble');
		expect(completeEnvironmentsState({})).toEqual(defaultEnvironmentsState());
	});

	it('round-trips full state through the hash', () => {
		let s = addExample(defaultEnvironmentsState(), 'spam-filter');
		s = setColumnValue(s, 'chess-clock', 'static', 'static');
		s = addCustom(s, { name: 'Poker', values: { agents: 'multi' } });
		s = setColumnPeas(s, 'custom-1', 'sensors', 'Own cards');
		const decoded = decode(encode(s), isSavedEnvironmentsState);
		expect(decoded).not.toBeNull();
		expect(completeEnvironmentsState(decoded!)).toEqual(s);
	});

	it('selects the first column when the saved selection is missing', () => {
		const columns: Column[] = [
			{ kind: 'example', key: 'romania' },
			{ kind: 'example', key: 'vacuum' }
		];
		expect(completeEnvironmentsState({ columns, selected: 'scrabble' }).selected).toBe('romania');
		expect(completeEnvironmentsState({ columns }).selected).toBe('romania');
		expect(completeEnvironmentsState({ columns: [], selected: null })).toEqual({
			columns: [],
			selected: null
		});
		expect(completeEnvironmentsState({ columns, preset: 'taxi' }).selected).toBe('taxi');
	});

	it('drops saved edits equal to the example’s values', () => {
		const s = completeEnvironmentsState({
			columns: [
				{
					kind: 'example',
					key: 'scrabble',
					values: columnProfile(col(defaultEnvironmentsState(), 'scrabble'))
				}
			]
		});
		expect(s.columns).toEqual([{ kind: 'example', key: 'scrabble' }]);
	});

	it('rejects bad values', () => {
		const custom = {
			kind: 'custom',
			key: 'custom-1',
			name: 'X',
			values: {},
			peas: emptyPeas()
		};
		expect(isSavedEnvironmentsState({ columns: [custom] })).toBe(true);
		for (const bad of [
			null,
			[],
			'taxi',
			{ preset: 'poker' },
			{ preset: 3 },
			{ selected: 4 },
			{ columns: 'scrabble' },
			{ columns: [{ kind: 'example', key: 'poker' }] },
			{ columns: [{ kind: 'example', key: 'scrabble', values: { agents: 'many' } }] },
			{
				columns: [
					{ kind: 'example', key: 'scrabble' },
					{ kind: 'example', key: 'scrabble' }
				]
			},
			{ columns: [{ kind: 'other', key: 'x' }] },
			{ columns: [{ ...custom, key: 'mine' }] },
			{ columns: [{ ...custom, name: 5 }] },
			{ columns: [{ ...custom, name: 'x'.repeat(MAX_NAME_LENGTH + 1) }] },
			{ columns: [{ ...custom, values: { static: 'fully' } }] },
			{ columns: [{ ...custom, peas: { performance: '' } }] },
			{ columns: [{ ...custom, peas: { ...emptyPeas(), sensors: 3 } }] },
			{ columns: [{ ...custom, peas: { ...emptyPeas(), extra: '' } }] },
			{
				columns: [{ ...custom, peas: { ...emptyPeas(), sensors: 'x'.repeat(MAX_PEAS_LENGTH + 1) } }]
			},
			{
				columns: Array.from({ length: MAX_COLUMNS + 1 }, (_, i) => ({
					...custom,
					key: `custom-${i + 1}`
				}))
			}
		]) {
			expect(isSavedEnvironmentsState(bad)).toBe(false);
		}
	});
});
