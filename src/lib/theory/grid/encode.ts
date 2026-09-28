/**
 * Grid text for URL state: compact and URL-safe (only `A–Z a–z 0–9 - _ . ~`).
 *
 * ```
 * 32x22~s7.18~g23.2~r2k.a.m.a…     <columns>x<rows>, start, goal, walls
 * ```
 *
 * Fields after the size are separated by `~`:
 * - `s<column>.<row>` the start cell, `g<column>.<row>` the goal cell;
 * - `r<runs>` walls as run lengths in base 36, separated by `.`, alternating
 *   open and wall cells row by row from the top-left, starting with open
 *   cells (a trailing open run is left out);
 * - `b<bits>` walls as a bitmap, six cells per base64url character (first
 *   cell in the high bit), trailing `A`s (six open cells) left out.
 *
 * `encodeGrid` writes whichever wall field is shorter, and none for a grid
 * without walls. `decodeGrid` reports problems as diagnostics with spans.
 */
import type { Diagnostic } from '../diagnostics';
import { cellAt, cellLabel } from './problem';
import { MAX_GRID_SIDE, type Grid } from './types';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function runsOf(walls: readonly boolean[]): string {
	const runs: number[] = [];
	let current = false;
	let length = 0;
	for (const w of walls) {
		if (w === current) length++;
		else {
			runs.push(length);
			current = w;
			length = 1;
		}
	}
	if (current) runs.push(length);
	return runs.map((n) => n.toString(36)).join('.');
}

function bitsOf(walls: readonly boolean[]): string {
	let out = '';
	for (let i = 0; i < walls.length; i += 6) {
		let v = 0;
		for (let k = 0; k < 6; k++) v = (v << 1) | (walls[i + k] ? 1 : 0);
		out += B64[v];
	}
	return out.replace(/A+$/, '');
}

/** Compact URL-safe text for a grid, e.g. `16x11~s3.9~g11.1~r25.5.b.5`. */
export function encodeGrid(grid: Grid): string {
	const pos = (cell: number) => `${cell % grid.width}.${Math.floor(cell / grid.width)}`;
	let text = `${grid.width}x${grid.height}~s${pos(grid.start)}~g${pos(grid.goal)}`;
	if (grid.walls.some(Boolean)) {
		const runs = runsOf(grid.walls);
		const bits = bitsOf(grid.walls);
		text += runs.length <= bits.length ? `~r${runs}` : `~b${bits}`;
	}
	return text;
}

interface Field {
	text: string;
	start: number;
}

/** Parses grid text from `encodeGrid`. `grid` is null when there are errors. */
export function decodeGrid(text: string): { grid: Grid | null; diagnostics: Diagnostic[] } {
	const diagnostics: Diagnostic[] = [];
	const report = (
		severity: Diagnostic['severity'],
		message: string,
		start = 0,
		end = text.length
	) => diagnostics.push({ severity, message, span: { start, end, source: null } });
	const fail = () => ({ grid: null, diagnostics });

	if (typeof text !== 'string' || text.trim() === '') {
		report('error', 'The grid text is empty.');
		return fail();
	}

	const fields: Field[] = [];
	let offset = 0;
	for (const part of text.split('~')) {
		fields.push({ text: part, start: offset });
		offset += part.length + 1;
	}
	const spanOf = (f: Field) => [f.start, f.start + f.text.length] as const;

	// Size.
	const size = fields[0];
	const sizeMatch = /^(\d{1,4})x(\d{1,4})$/.exec(size.text);
	if (!sizeMatch) {
		report('error', 'Expected the size as <columns>x<rows>, e.g. 32x22.', ...spanOf(size));
		return fail();
	}
	const width = Number(sizeMatch[1]);
	const height = Number(sizeMatch[2]);
	if (width < 1 || height < 1 || width > MAX_GRID_SIDE || height > MAX_GRID_SIDE) {
		report(
			'error',
			`The grid must be 1 to ${MAX_GRID_SIDE} cells wide and tall (got ${width} × ${height}).`,
			...spanOf(size)
		);
		return fail();
	}
	if (width * height < 2) {
		report('error', 'The grid needs at least two cells.', ...spanOf(size));
		return fail();
	}
	const cells = width * height;
	const dims = { width, height };

	let start: { cell: number; field: Field } | null = null;
	let goal: { cell: number; field: Field } | null = null;
	let wallField: Field | null = null;
	const bad = { start: false, goal: false };
	let walls: boolean[] = new Array<boolean>(cells).fill(false);

	const parseCell = (f: Field, name: string): number | null => {
		const m = /^(\d{1,4})\.(\d{1,4})$/.exec(f.text.slice(1));
		if (!m) {
			report(
				'error',
				`Expected the ${name} as ${f.text[0]}<column>.<row>, e.g. ${f.text[0]}3.5.`,
				...spanOf(f)
			);
			return null;
		}
		const col = Number(m[1]);
		const row = Number(m[2]);
		const cell = cellAt(dims, col, row);
		if (cell < 0) {
			report(
				'error',
				`The ${name} (${col}, ${row}) is outside the ${width} × ${height} grid.`,
				...spanOf(f)
			);
			return null;
		}
		return cell;
	};

	const parseRuns = (f: Field): boolean[] | null => {
		const body = f.text.slice(1);
		const out = new Array<boolean>(cells).fill(false);
		if (body === '') return out;
		let at = 0;
		let pos = f.start + 1;
		let wall = false;
		for (const token of body.split('.')) {
			if (!/^[0-9a-z]{1,4}$/.test(token)) {
				report(
					'error',
					`"${token}" is not a run length (base-36 digits 0–9, a–z).`,
					pos,
					pos + token.length
				);
				return null;
			}
			const n = parseInt(token, 36);
			if (at + n > cells) {
				report(
					'error',
					`The wall runs cover more than the ${cells} cells of the grid.`,
					pos,
					pos + token.length
				);
				return null;
			}
			if (wall) out.fill(true, at, at + n);
			at += n;
			wall = !wall;
			pos += token.length + 1;
		}
		return out;
	};

	const parseBits = (f: Field): boolean[] | null => {
		const body = f.text.slice(1);
		const out = new Array<boolean>(cells).fill(false);
		for (let i = 0; i < body.length; i++) {
			const v = B64.indexOf(body[i]);
			if (v < 0) {
				report(
					'error',
					`"${body[i]}" is not a bitmap character.`,
					f.start + 1 + i,
					f.start + 2 + i
				);
				return null;
			}
			for (let k = 0; k < 6; k++) {
				if (!((v >> (5 - k)) & 1)) continue;
				const cell = i * 6 + k;
				if (cell >= cells) {
					report(
						'error',
						`The wall bitmap is longer than the ${cells} cells of the grid.`,
						f.start + 1 + i,
						f.start + 2 + i
					);
					return null;
				}
				out[cell] = true;
			}
		}
		return out;
	};

	for (const f of fields.slice(1)) {
		const kind = f.text[0];
		if (kind === 's' || kind === 'g') {
			const name = kind === 's' ? 'start' : 'goal';
			const previous = kind === 's' ? start : goal;
			if (previous)
				report('warning', `The ${name} is given twice; the later one is used.`, ...spanOf(f));
			const cell = parseCell(f, name);
			if (cell === null) {
				bad[name] = true;
				continue;
			}
			if (kind === 's') start = { cell, field: f };
			else goal = { cell, field: f };
		} else if (kind === 'r' || kind === 'b') {
			if (wallField)
				report('warning', 'Walls are given twice; the later field is used.', ...spanOf(f));
			wallField = f;
			const parsed = kind === 'r' ? parseRuns(f) : parseBits(f);
			if (parsed) walls = parsed;
		} else {
			report(
				'error',
				f.text === ''
					? 'Empty field (two "~" in a row).'
					: `Unknown field "${f.text.slice(0, 12)}"; expected s (start), g (goal), r (wall runs), or b (wall bitmap).`,
				...(f.text === '' ? ([Math.max(0, f.start - 1), f.start + 1] as const) : spanOf(f))
			);
		}
	}

	if (!start && !bad.start) report('error', 'The grid has no start (s<column>.<row>).');
	if (!goal && !bad.goal) report('error', 'The grid has no goal (g<column>.<row>).');
	if (start && goal && start.cell === goal.cell) {
		report(
			'error',
			`The start and goal are the same cell ${cellLabel(dims, start.cell)}.`,
			...spanOf(goal.field)
		);
	}
	if (diagnostics.some((d) => d.severity === 'error') || !start || !goal) return fail();

	for (const [end, name] of [
		[start, 'start'],
		[goal, 'goal']
	] as const) {
		if (walls[end.cell]) {
			walls[end.cell] = false;
			report(
				'warning',
				`The ${name} ${cellLabel(dims, end.cell)} is on a wall; the wall is removed.`,
				...spanOf(end.field)
			);
		}
	}

	return { grid: { width, height, walls, start: start.cell, goal: goal.cell }, diagnostics };
}
