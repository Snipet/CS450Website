/**
 * The Lisp printer, following Common Lisp's conventions: symbols in upper
 * case (NIL, T, FOO), lists `(A B C)`, dotted pairs `(A . B)`, `(QUOTE X)` as
 * `'X` and `(FUNCTION F)` as `#'F` (as SBCL prints them), numbers (`3`,
 * `1/2`, `2.5`), strings in double quotes when escaping (PRIN1, results) and
 * bare otherwise (PRINC), functions as `#<FUNCTION NAME>`.
 */
import { formatNumber } from './numbers';
import type { LispValue } from './types';

export interface PrintOptions {
	/** PRIN1 style (default): strings in quotes. False: PRINC style. */
	escape?: boolean;
	/** Stop after this many characters and end with " …" (default 100,000). */
	maxLength?: number;
	/** Lists nested deeper than this print as # (default 1,000). */
	maxDepth?: number;
}

export const DEFAULT_PRINT_LENGTH = 100_000;
const DEFAULT_PRINT_DEPTH = 1_000;

class Full extends Error {}

const QUOTES: Record<string, string> = { QUOTE: "'", FUNCTION: "#'" };

export function printValue(value: LispValue, options: PrintOptions = {}): string {
	const escape = options.escape ?? true;
	const maxLength = options.maxLength ?? DEFAULT_PRINT_LENGTH;
	const maxDepth = options.maxDepth ?? DEFAULT_PRINT_DEPTH;
	const parts: string[] = [];
	let length = 0;
	const emit = (s: string) => {
		parts.push(s);
		length += s.length;
		if (length > maxLength) throw new Full();
	};

	function print(v: LispValue, depth: number): void {
		switch (v.kind) {
			case 'symbol':
				emit(v.name);
				return;
			case 'integer':
			case 'ratio':
			case 'float':
				emit(formatNumber(v));
				return;
			case 'string':
				emit(escape ? `"${v.value.replace(/["\\]/g, (c) => `\\${c}`)}"` : v.value);
				return;
			case 'function':
				if (v.name) emit(`#<FUNCTION ${v.name}>`);
				else {
					emit('#<FUNCTION (LAMBDA ');
					print(v.params, depth + 1);
					emit(')>');
				}
				return;
			case 'cons': {
				if (depth >= maxDepth) {
					emit('#');
					return;
				}
				const head = v.car;
				if (
					head.kind === 'symbol' &&
					QUOTES[head.name] &&
					v.cdr.kind === 'cons' &&
					v.cdr.cdr.kind === 'symbol' &&
					v.cdr.cdr.name === 'NIL'
				) {
					emit(QUOTES[head.name]);
					print(v.cdr.car, depth + 1);
					return;
				}
				emit('(');
				let x: LispValue = v;
				let first = true;
				while (x.kind === 'cons') {
					if (!first) emit(' ');
					print(x.car, depth + 1);
					first = false;
					x = x.cdr;
				}
				if (!(x.kind === 'symbol' && x.name === 'NIL')) {
					emit(' . ');
					print(x, depth + 1);
				}
				emit(')');
				return;
			}
		}
	}

	try {
		print(value, 0);
	} catch (e) {
		if (!(e instanceof Full)) throw e;
		return `${parts.join('').slice(0, maxLength)} …`;
	}
	return parts.join('');
}

/** PRINC style: strings without quotes. */
export const princToString = (value: LispValue, maxLength?: number): string =>
	printValue(value, { escape: false, maxLength });
