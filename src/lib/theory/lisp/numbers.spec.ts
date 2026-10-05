import { describe, expect, it } from 'vitest';
import {
	add,
	bitLength,
	compare,
	div,
	expt,
	float,
	formatFloat,
	formatNumber,
	int,
	modulo,
	mul,
	parseNumber,
	quotient,
	ratio,
	sqrt,
	sub
} from './numbers';

const f = (n: Parameters<typeof formatNumber>[0]) => formatNumber(n);

describe('numbers', () => {
	it('keeps rationals exact and in lowest terms', () => {
		expect(f(ratio(2n, 4n))).toBe('1/2');
		expect(f(ratio(4n, -2n))).toBe('-2');
		expect(f(add(ratio(1n, 3n), ratio(1n, 6n)))).toBe('1/2');
		expect(f(sub(int(1), ratio(1n, 2n)))).toBe('1/2');
		expect(f(mul(ratio(2n, 3n), int(3)))).toBe('2');
		expect(f(div(int(7), int(2)))).toBe('7/2');
	});

	it('applies float contagion', () => {
		expect(f(add(int(1), float(0.5)))).toBe('1.5');
		expect(f(mul(ratio(1n, 2n), float(4)))).toBe('2.0');
	});

	it('compares across types', () => {
		expect(compare(int(1), float(1))).toBe(0);
		expect(compare(ratio(1n, 3n), ratio(1n, 2n))).toBe(-1);
		expect(compare(float(2.5), int(2))).toBe(1);
	});

	it('rounds quotients like FLOOR, CEILING, TRUNCATE and ROUND', () => {
		const q = (a: number, b: number, mode: 'floor' | 'ceiling' | 'truncate' | 'round') =>
			f(quotient(int(a), int(b), mode, mode));
		expect([q(7, 2, 'floor'), q(-7, 2, 'floor'), q(7, 2, 'ceiling'), q(-7, 2, 'truncate')]).toEqual(
			['3', '-4', '4', '-3']
		);
		expect([q(5, 2, 'round'), q(7, 2, 'round'), q(-5, 2, 'round'), q(8, 3, 'round')]).toEqual([
			'2',
			'4',
			'-2',
			'3'
		]);
		expect(f(quotient(float(-2.5), int(1), 'round', 'round'))).toBe('-2');
	});

	it('MOD follows the divisor’s sign, REM the dividend’s', () => {
		expect(f(modulo(int(-7), int(3), 'mod'))).toBe('2');
		expect(f(modulo(int(-7), int(3), 'rem'))).toBe('-1');
		expect(f(modulo(float(-7), int(3), 'mod'))).toBe('2.0');
	});

	it('computes EXPT and SQRT', () => {
		expect(f(expt(int(3), int(4)))).toBe('81');
		expect(f(expt(ratio(2n, 3n), int(2)))).toBe('4/9');
		expect(f(expt(int(2), int(-3)))).toBe('1/8');
		expect(f(expt(int(0), int(0)))).toBe('1');
		expect(f(sqrt(int(9)))).toBe('3.0');
		expect(() => expt(int(-8), ratio(1n, 3n))).toThrow(/complex/);
		expect(() => div(int(1), int(0))).toThrow(/DIVISION-BY-ZERO/);
		expect(() => float(1e39)).toThrow(/FLOATING-POINT-OVERFLOW/);
	});

	it('measures bit lengths', () => {
		expect(bitLength(0n)).toBe(0);
		expect(bitLength(255n)).toBe(8);
		expect(bitLength(-(2n ** 100n))).toBe(101);
	});

	it('parses Common Lisp number syntax', () => {
		expect(parseNumber('42')).toEqual(int(42));
		expect(parseNumber('42.')).toEqual(int(42));
		expect(parseNumber('+7')).toEqual(int(7));
		expect(parseNumber('3/6')).toEqual(ratio(1n, 2n));
		expect(parseNumber('1.5')).toEqual(float(1.5));
		expect(parseNumber('2d0')).toEqual(float(2));
		expect(parseNumber('abc')).toBeNull();
		expect(parseNumber('1+')).toBeNull();
		expect(parseNumber('-')).toBeNull();
	});

	it('prints floats as single floats', () => {
		expect(
			[1, 0.5, 100, 1.5e-3, 3.14159265, 1e7, 12345678, 1e-4, -2.25, 0, 1 / 3, 0.1].map((x) =>
				formatFloat(Math.fround(x))
			)
		).toEqual([
			'1.0',
			'0.5',
			'100.0',
			'0.0015',
			'3.1415927',
			'1.0e7',
			'1.2345678e7',
			'1.0e-4',
			'-2.25',
			'0.0',
			'0.33333334',
			'0.1'
		]);
	});
});
