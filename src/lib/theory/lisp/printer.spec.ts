import { describe, expect, it } from 'vitest';
import { int, ratio, float } from './numbers';
import { printValue, princToString } from './printer';
import { NIL, T, cons, intern, list, lispString } from './types';

describe('printValue', () => {
	it('prints atoms as Common Lisp does', () => {
		expect(printValue(NIL)).toBe('NIL');
		expect(printValue(T)).toBe('T');
		expect(printValue(intern('MY-LENGTH'))).toBe('MY-LENGTH');
		expect(printValue(int(42))).toBe('42');
		expect(printValue(ratio(1n, 2n))).toBe('1/2');
		expect(printValue(float(2))).toBe('2.0');
		expect(printValue(lispString('a "b"'))).toBe('"a \\"b\\""');
	});

	it('prints lists and dotted pairs', () => {
		const a = intern('A');
		const b = intern('B');
		expect(printValue(list([a, b, intern('C')]))).toBe('(A B C)');
		expect(printValue(cons(a, b))).toBe('(A . B)');
		expect(printValue(list([a], b))).toBe('(A . B)');
		expect(printValue(list([list([a]), NIL]))).toBe('((A) NIL)');
	});

	it("prints (QUOTE x) as 'x and (FUNCTION f) as #'f", () => {
		expect(printValue(list([intern('QUOTE'), intern('A')]))).toBe("'A");
		expect(printValue(list([intern('FUNCTION'), intern('CAR')]))).toBe("#'CAR");
		expect(printValue(list([intern('QUOTE'), intern('A'), intern('B')]))).toBe('(QUOTE A B)');
	});

	it('prints strings bare in PRINC style', () => {
		expect(princToString(list([lispString('x'), int(1)]))).toBe('(x 1)');
	});

	it('caps length and depth', () => {
		const long = list(Array.from({ length: 100 }, (_, i) => int(i)));
		expect(printValue(long, { maxLength: 20 })).toBe('(0 1 2 3 4 5 6 7 8 9 …');
		let deep = NIL as ReturnType<typeof list>;
		for (let i = 0; i < 5; i++) deep = list([deep]);
		expect(printValue(deep, { maxDepth: 3 })).toBe('(((#)))');
	});
});
