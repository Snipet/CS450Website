import { describe, expect, it } from 'vitest';
import { hasErrors } from '../diagnostics';
import { emptyGrid, setWalls } from './edit';
import { decodeGrid, encodeGrid } from './encode';
import { GRID_PRESETS, GRID_SIZES, concaveGrid, gridPreset, seededRandom } from './presets';
import type { Grid } from './types';

const messages = (text: string) => decodeGrid(text).diagnostics.map((d) => d.message);
const errorsOf = (text: string) =>
	decodeGrid(text).diagnostics.filter((d) => d.severity === 'error');

describe('encodeGrid', () => {
	it('writes size, start and goal; no wall field without walls', () => {
		expect(encodeGrid(emptyGrid(4, 3))).toBe('4x3~s0.2~g3.0');
	});

	it('writes the slide grid as wall runs (golden)', () => {
		expect(encodeGrid(concaveGrid())).toBe('32x22~s7.18~g23.2~r5m.a.m.a.u.2.u.2.u.2.u.2.u.2');
		expect(encodeGrid(concaveGrid(16, 11))).toBe('16x11~s3.9~g11.1~r1h.5.f.1.f.1');
	});

	it('uses the bitmap when it is shorter', () => {
		const g = setWalls(emptyGrid(4, 3), [1, 5, 6], true);
		// Runs would be "1.1.3.2"; bits 010001 100000 → "Rg".
		expect(encodeGrid(g)).toBe('4x3~s0.2~g3.0~bRg');
	});

	it('uses only URL-safe characters', () => {
		for (const { width, height } of Object.values(GRID_SIZES))
			for (const p of GRID_PRESETS)
				expect(encodeGrid(gridPreset(p.id, width, height))).toMatch(/^[A-Za-z0-9._~-]+$/);
	});
});

describe('decodeGrid', () => {
	it('round-trips every preset at every size', () => {
		for (const { width, height } of Object.values(GRID_SIZES)) {
			for (const p of GRID_PRESETS) {
				const grid = gridPreset(p.id, width, height);
				const decoded = decodeGrid(encodeGrid(grid));
				expect(decoded.diagnostics, p.id).toEqual([]);
				expect(decoded.grid, p.id).toEqual(grid);
			}
		}
	});

	it('reads both wall encodings', () => {
		const g = setWalls(emptyGrid(4, 3), [1, 5, 6], true);
		expect(decodeGrid('4x3~s0.2~g3.0~r1.1.3.2').grid).toEqual(g);
		expect(decodeGrid('4x3~s0.2~g3.0~bRg').grid).toEqual(g);
		// Fields after the size may come in any order.
		expect(decodeGrid('4x3~bRg~g3.0~s0.2').grid).toEqual(g);
	});

	it('an empty run field or bitmap means no walls', () => {
		expect(decodeGrid('4x3~s0.2~g3.0~r').grid).toEqual(emptyGrid(4, 3));
		expect(decodeGrid('4x3~s0.2~g3.0~b').grid).toEqual(emptyGrid(4, 3));
	});

	it('reports a missing or malformed size', () => {
		expect(messages('')).toEqual(['The grid text is empty.']);
		expect(messages('32by22~s0.0~g1.1')).toEqual([
			'Expected the size as <columns>x<rows>, e.g. 32x22.'
		]);
		expect(errorsOf('32by22~s0.0~g1.1')[0].span).toEqual({ start: 0, end: 6, source: null });
		expect(messages('101x5~s0.0~g1.1')).toEqual([
			'The grid must be 1 to 100 cells wide and tall (got 101 × 5).'
		]);
		expect(messages('0x5~s0.0~g0.1')[0]).toContain('1 to 100');
		expect(messages('1x1~s0.0~g0.0')).toEqual(['The grid needs at least two cells.']);
	});

	it('reports start and goal problems', () => {
		expect(messages('4x3~g3.0')).toEqual(['The grid has no start (s<column>.<row>).']);
		expect(messages('4x3~s0.2')).toEqual(['The grid has no goal (g<column>.<row>).']);
		expect(messages('4x3~s0-2~g3.0')).toEqual([
			'Expected the start as s<column>.<row>, e.g. s3.5.'
		]);
		expect(errorsOf('4x3~s0-2~g3.0')[0].span).toEqual({ start: 4, end: 8, source: null });
		expect(messages('4x3~s4.0~g3.0')).toEqual(['The start (4, 0) is outside the 4 × 3 grid.']);
		expect(messages('4x3~s0.2~g3.3')).toEqual(['The goal (3, 3) is outside the 4 × 3 grid.']);
		expect(messages('4x3~s1.1~g1.1')).toEqual(['The start and goal are the same cell (1, 1).']);
	});

	it('reports bad wall fields', () => {
		expect(messages('4x3~s0.2~g3.0~r1.!.2')).toEqual([
			'"!" is not a run length (base-36 digits 0–9, a–z).'
		]);
		expect(errorsOf('4x3~s0.2~g3.0~r1.!.2')[0].span).toEqual({ start: 17, end: 18, source: null });
		expect(messages('4x3~s0.2~g3.0~r1.c')).toEqual([
			'The wall runs cover more than the 12 cells of the grid.'
		]);
		expect(messages('4x3~s0.2~g3.0~bR*')).toEqual(['"*" is not a bitmap character.']);
		// 12 cells fit in two characters; a set bit in a third is past the end.
		expect(messages('4x3~s0.2~g3.0~bAAB')).toEqual([
			'The wall bitmap is longer than the 12 cells of the grid.'
		]);
		// Extra open cells at the end are harmless.
		expect(decodeGrid('4x3~s0.2~g3.0~bRgAAAA').grid).toEqual(decodeGrid('4x3~s0.2~g3.0~bRg').grid);
	});

	it('reports unknown and empty fields', () => {
		expect(messages('4x3~s0.2~g3.0~q9')).toEqual([
			'Unknown field "q9"; expected s (start), g (goal), r (wall runs), or b (wall bitmap).'
		]);
		expect(messages('4x3~s0.2~~g3.0')).toEqual(['Empty field (two "~" in a row).']);
		expect(hasErrors(decodeGrid('4x3~s0.2~~g3.0').diagnostics)).toBe(true);
		expect(decodeGrid('4x3~s0.2~~g3.0').grid).toBeNull();
	});

	it('warns about repeated fields and uses the later one', () => {
		const r = decodeGrid('4x3~s0.2~g3.0~s1.2~r1.1~bRg');
		expect(r.diagnostics.map((d) => [d.severity, d.message])).toEqual([
			['warning', 'The start is given twice; the later one is used.'],
			['warning', 'Walls are given twice; the later field is used.']
		]);
		expect(r.grid?.start).toBe(9);
		expect(r.grid?.walls).toEqual(setWalls(emptyGrid(4, 3), [1, 5, 6], true).walls);
	});

	it('removes a wall under the start or goal with a warning', () => {
		const r = decodeGrid('4x3~s0.2~g3.0~r3.1.4.1');
		expect(r.diagnostics.map((d) => [d.severity, d.message])).toEqual([
			['warning', 'The start (0, 2) is on a wall; the wall is removed.'],
			['warning', 'The goal (3, 0) is on a wall; the wall is removed.']
		]);
		expect(r.grid?.walls.some(Boolean)).toBe(false);
	});
});

describe('random grids', () => {
	it('round-trip at any size and wall density; damaged text never throws', () => {
		const random = seededRandom(5);
		const int = (n: number) => Math.floor(random() * n);
		for (let k = 0; k < 300; k++) {
			const width = 1 + int(k < 10 ? 100 : 24);
			const height = (width === 1 ? 2 : 1) + int(k < 10 ? 99 : 24);
			const density = random();
			const walls = Array.from({ length: width * height }, () => random() < density);
			const start = int(width * height);
			const goal = (start + 1 + int(width * height - 1)) % (width * height);
			walls[start] = walls[goal] = false;
			const grid: Grid = { width, height, walls, start, goal };
			const text = encodeGrid(grid);
			expect(text).toMatch(/^[A-Za-z0-9._~-]+$/);
			expect(decodeGrid(text)).toEqual({ grid, diagnostics: [] });
			for (let m = 0; m < 5; m++) {
				const chars = [...text];
				chars[int(chars.length)] = 'x~.-_0Zs9g'[int(10)];
				const { grid: back, diagnostics } = decodeGrid(chars.join(''));
				if (back === null) expect(hasErrors(diagnostics)).toBe(true);
				else {
					expect(back.walls).toHaveLength(back.width * back.height);
					expect(back.start).not.toBe(back.goal);
					expect(back.walls[back.start] || back.walls[back.goal]).toBe(false);
				}
			}
		}
	});
});
