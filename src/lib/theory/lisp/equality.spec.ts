import { describe, expect, it } from 'vitest';
import { eq, eql, equal } from './equality';
import { float, int, integer, ratio } from './numbers';
import { intern, list, lispString } from './types';

describe('equality', () => {
	const a = intern('A');
	it('eq: identity, interned symbols, small integers', () => {
		expect(eq(a, intern('A'))).toBe(true);
		expect(eq(int(3), int(3))).toBe(true);
		expect(eq(integer(2n ** 62n), integer(2n ** 62n))).toBe(false);
		expect(eql(integer(2n ** 62n), integer(2n ** 62n))).toBe(true);
		expect(eq(list([a]), list([a]))).toBe(false);
		expect(eq(lispString('x'), lispString('x'))).toBe(false);
	});

	it('eql: numbers of the same type and value', () => {
		expect(eql(int(3), int(3))).toBe(true);
		expect(eql(int(3), float(3))).toBe(false);
		expect(eql(ratio(1n, 2n), ratio(2n, 4n))).toBe(true);
		expect(eql(float(0.5), float(0.5))).toBe(true);
		expect(eql(lispString('x'), lispString('x'))).toBe(false);
	});

	it('equal: structure and string contents', () => {
		expect(
			equal(list([a, list([int(1), lispString('s')])]), list([a, list([int(1), lispString('s')])]))
		).toBe(true);
		expect(equal(list([a]), list([a, a]))).toBe(false);
		expect(equal(list([int(1)]), list([float(1)]))).toBe(false);
	});

	it('handles long and deep structures without recursion limits', () => {
		const n = 100_000;
		const long1 = list(Array.from({ length: n }, (_, i) => int(i)));
		const long2 = list(Array.from({ length: n }, (_, i) => int(i)));
		expect(equal(long1, long2)).toBe(true);
		let d1 = list([]);
		let d2 = list([]);
		for (let i = 0; i < 20_000; i++) {
			d1 = list([d1]);
			d2 = list([d2]);
		}
		expect(equal(d1, d2)).toBe(true);
	});
});
