/**
 * Common Lisp's equality predicates.
 *
 * - `eq`: the same object. Symbols are interned, so the same name is EQ.
 *   Integers that fit a machine word and floats with the same value are EQ
 *   too, as in SBCL (where they are immediate values); strings and conses
 *   are EQ only to themselves.
 * - `eql`: EQ, or numbers of the same type and value.
 * - `equal`: EQL, or conses whose cars and cdrs are EQUAL, or strings with
 *   the same characters.
 */
import type { LispValue } from './types';

const FIXNUM = 2n ** 61n;

export function eq(a: LispValue, b: LispValue): boolean {
	if (a === b) return true;
	if (a.kind === 'integer' && b.kind === 'integer')
		return a.value === b.value && a.value < FIXNUM && a.value >= -FIXNUM;
	if (a.kind === 'float' && b.kind === 'float') return Object.is(a.value, b.value);
	return false;
}

export function eql(a: LispValue, b: LispValue): boolean {
	if (a === b) return true;
	if (a.kind === 'integer' && b.kind === 'integer') return a.value === b.value;
	if (a.kind === 'ratio' && b.kind === 'ratio') return a.num === b.num && a.den === b.den;
	if (a.kind === 'float' && b.kind === 'float') return Object.is(a.value, b.value);
	return false;
}

export function equal(a: LispValue, b: LispValue): boolean {
	const stack: [LispValue, LispValue][] = [[a, b]];
	while (stack.length) {
		let [x, y] = stack.pop()!;
		// Walk down the cdrs in a loop; push the cars.
		for (;;) {
			if (x.kind === 'cons' && y.kind === 'cons') {
				stack.push([x.car, y.car]);
				x = x.cdr;
				y = y.cdr;
				continue;
			}
			if (x.kind === 'string' && y.kind === 'string') {
				if (x.value !== y.value) return false;
			} else if (!eql(x, y)) return false;
			break;
		}
	}
	return true;
}
