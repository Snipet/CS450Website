import { describe, expect, it } from 'vitest';
import {
	emptyChecklist,
	nextUnchecked,
	percent,
	progressOf,
	readChecklist,
	writeChecklist
} from './checklist';

const ORDER = ['a', 'b', 'c', 'd'];
const KNOWN = new Set(ORDER);

describe('readChecklist / writeChecklist', () => {
	it('round-trips, writing checked ids in sheet order', () => {
		const text = writeChecklist({ checked: new Set(['c', 'a']), hideChecked: true }, ORDER);
		expect(JSON.parse(text)).toEqual({ v: 1, checked: ['a', 'c'], hideChecked: true });
		expect(readChecklist(text, KNOWN)).toEqual({ checked: new Set(['a', 'c']), hideChecked: true });
	});

	it('reads missing, corrupt, and foreign data as an empty checklist', () => {
		for (const raw of [null, '', 'not json', '42', 'null', '[]', '{"v":2,"checked":["a"]}', '{}'])
			expect(readChecklist(raw, KNOWN)).toEqual(emptyChecklist());
	});

	it('drops ids that are not on the sheet and values of the wrong type', () => {
		const raw = JSON.stringify({ v: 1, checked: ['a', 'zz', 3, null, 'd'], hideChecked: 'yes' });
		expect(readChecklist(raw, KNOWN)).toEqual({ checked: new Set(['a', 'd']), hideChecked: false });
		expect(readChecklist('{"v":1,"checked":"a"}', KNOWN).checked.size).toBe(0);
	});
});

describe('progress', () => {
	it('counts checked ids', () => {
		expect(progressOf(ORDER, new Set(['a', 'x']))).toEqual({ done: 1, total: 4 });
		expect(percent({ done: 1, total: 3 })).toBe(33);
		expect(percent({ done: 0, total: 0 })).toBe(0);
	});
});

describe('nextUnchecked', () => {
	it('finds the next unchecked id after the given one, wrapping around', () => {
		const checked = new Set(['a', 'c']);
		expect(nextUnchecked(ORDER, checked)).toBe('b');
		expect(nextUnchecked(ORDER, checked, 'b')).toBe('d');
		expect(nextUnchecked(ORDER, checked, 'd')).toBe('b');
		expect(nextUnchecked(ORDER, checked, 'unknown')).toBe('b');
		expect(nextUnchecked(ORDER, new Set(ORDER))).toBeNull();
		expect(nextUnchecked(ORDER, new Set(['a', 'b', 'c']), 'd')).toBe('d');
	});
});
