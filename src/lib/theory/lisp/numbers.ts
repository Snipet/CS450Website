/**
 * Common Lisp numbers: integers of any size (bigint), ratios in lowest terms,
 * and single floats (JavaScript numbers rounded with Math.fround). Rational
 * arithmetic is exact; any float operand makes the result a float (float
 * contagion). Errors (division by zero, overflow, complex results) are thrown
 * as LispError and reported by the evaluator.
 */
import { LispError } from './errors';
import type { LispFloat, LispInteger, LispNumber, LispRatio } from './types';

/** Integers longer than this many bits are refused (about 60,000 decimal digits). */
export const MAX_INTEGER_BITS = 200_000;

const SMALL = 9007199254740991n; // 2^53 - 1

export const integer = (value: bigint): LispInteger => ({ kind: 'integer', value });

export const int = (n: number): LispInteger => integer(BigInt(n));

/** A single float; infinite results signal FLOATING-POINT-OVERFLOW. */
export function float(x: number): LispFloat {
	const f = Math.fround(x);
	if (Number.isNaN(f))
		throw new LispError(
			'arithmetic',
			'Arithmetic error FLOATING-POINT-INVALID-OPERATION signalled.'
		);
	if (!Number.isFinite(f))
		throw new LispError('arithmetic', 'Arithmetic error FLOATING-POINT-OVERFLOW signalled.');
	return { kind: 'float', value: f };
}

const abs = (n: bigint): bigint => (n < 0n ? -n : n);

function gcd(a: bigint, b: bigint): bigint {
	a = abs(a);
	b = abs(b);
	while (b !== 0n) [a, b] = [b, a % b];
	return a;
}

/** Number of bits in |n|. */
export function bitLength(n: bigint): number {
	const a = abs(n);
	if (a === 0n) return 0;
	if (a <= SMALL) return Math.floor(Math.log2(Number(a))) + 1;
	const hex = a.toString(16);
	return (hex.length - 1) * 4 + (32 - Math.clz32(parseInt(hex[0], 16)));
}

const tooLarge = () =>
	new LispError(
		'arithmetic',
		`Integer too large: the result would have more than ${MAX_INTEGER_BITS.toLocaleString('en-US')} bits.`
	);

const isBig = (n: bigint) => n > SMALL || n < -SMALL;

/** a · b, refusing results longer than MAX_INTEGER_BITS. */
function product(a: bigint, b: bigint): bigint {
	if ((isBig(a) || isBig(b)) && bitLength(a) + bitLength(b) > MAX_INTEGER_BITS + 1)
		throw tooLarge();
	return a * b;
}

const divisionByZero = (operation: string) =>
	new LispError(
		'division-by-zero',
		`Arithmetic error DIVISION-BY-ZERO signalled. Operation was (${operation}).`
	);

/** num/den in lowest terms; an integer when the denominator is 1. */
export function ratio(num: bigint, den: bigint): LispInteger | LispRatio {
	if (den === 0n) throw divisionByZero(`/ ${num} 0`);
	if (den < 0n) {
		num = -num;
		den = -den;
	}
	const g = gcd(num, den);
	if (g > 1n) {
		num /= g;
		den /= g;
	}
	return den === 1n ? integer(num) : { kind: 'ratio', num, den };
}

/** A JavaScript number for a Lisp number (approximate for large rationals). */
export function toNumber(n: LispNumber): number {
	switch (n.kind) {
		case 'integer':
			return Number(n.value);
		case 'ratio':
			return Number(n.num) / Number(n.den);
		case 'float':
			return n.value;
	}
}

function parts(n: LispInteger | LispRatio): [bigint, bigint] {
	return n.kind === 'integer' ? [n.value, 1n] : [n.num, n.den];
}

type Rational = LispInteger | LispRatio;
const isFloat = (n: LispNumber): n is LispFloat => n.kind === 'float';

export function add(a: LispNumber, b: LispNumber): LispNumber {
	if (isFloat(a) || isFloat(b)) return float(toNumber(a) + toNumber(b));
	if (a.kind === 'integer' && b.kind === 'integer') return integer(a.value + b.value);
	const [an, ad] = parts(a as Rational);
	const [bn, bd] = parts(b as Rational);
	return ratio(an * bd + bn * ad, ad * bd);
}

export function negate(a: LispNumber): LispNumber {
	switch (a.kind) {
		case 'integer':
			return integer(-a.value);
		case 'ratio':
			return { kind: 'ratio', num: -a.num, den: a.den };
		case 'float':
			return float(-a.value);
	}
}

export function sub(a: LispNumber, b: LispNumber): LispNumber {
	return add(a, negate(b));
}

export function mul(a: LispNumber, b: LispNumber): LispNumber {
	if (isFloat(a) || isFloat(b)) return float(toNumber(a) * toNumber(b));
	if (a.kind === 'integer' && b.kind === 'integer') return integer(product(a.value, b.value));
	const [an, ad] = parts(a as Rational);
	const [bn, bd] = parts(b as Rational);
	return ratio(product(an, bn), product(ad, bd));
}

export const isZero = (n: LispNumber): boolean =>
	n.kind === 'integer' ? n.value === 0n : n.kind === 'float' ? n.value === 0 : false;

/** Lisp's `/` on two arguments: exact for rationals (7/2), a float otherwise. */
export function div(a: LispNumber, b: LispNumber): LispNumber {
	if (isZero(b)) throw divisionByZero(`/ ${formatNumber(a)} ${formatNumber(b)}`);
	if (isFloat(a) || isFloat(b)) return float(toNumber(a) / toNumber(b));
	const [an, ad] = parts(a as Rational);
	const [bn, bd] = parts(b as Rational);
	return ratio(an * bd, ad * bn);
}

/** Negative, zero, or positive as a < b, a = b, a > b (`=` compares across types). */
export function compare(a: LispNumber, b: LispNumber): number {
	if (isFloat(a) || isFloat(b)) {
		const x = toNumber(a);
		const y = toNumber(b);
		return x < y ? -1 : x > y ? 1 : 0;
	}
	const [an, ad] = parts(a as Rational);
	const [bn, bd] = parts(b as Rational);
	const l = an * bd;
	const r = bn * ad;
	return l < r ? -1 : l > r ? 1 : 0;
}

export const sign = (n: LispNumber): number => compare(n, integer(0n));

export type Rounding = 'floor' | 'ceiling' | 'truncate' | 'round';

function roundHalfEven(x: number): number {
	const f = Math.floor(x);
	const d = x - f;
	if (d < 0.5) return f;
	if (d > 0.5) return f + 1;
	return f % 2 === 0 ? f : f + 1;
}

/**
 * The integer quotient of a / b rounded as `mode` says (the first value of
 * FLOOR, CEILING, TRUNCATE, ROUND). ROUND rounds halves to the even integer.
 */
export function quotient(a: LispNumber, b: LispNumber, mode: Rounding, name: string): LispInteger {
	if (isZero(b)) throw divisionByZero(`${name} ${formatNumber(a)} ${formatNumber(b)}`);
	if (isFloat(a) || isFloat(b)) {
		const q = toNumber(a) / toNumber(b);
		const r =
			mode === 'floor'
				? Math.floor(q)
				: mode === 'ceiling'
					? Math.ceil(q)
					: mode === 'truncate'
						? Math.trunc(q)
						: roundHalfEven(q);
		return integer(BigInt(r));
	}
	const [an, ad] = parts(a as Rational);
	const [bn, bd] = parts(b as Rational);
	let n = an * bd;
	let d = ad * bn;
	if (d < 0n) {
		n = -n;
		d = -d;
	}
	const t = n / d; // truncates toward zero
	const rem = n - t * d;
	if (rem === 0n) return integer(t);
	switch (mode) {
		case 'truncate':
			return integer(t);
		case 'floor':
			return integer(n < 0n ? t - 1n : t);
		case 'ceiling':
			return integer(n > 0n ? t + 1n : t);
		case 'round': {
			// Distance to the truncated quotient, doubled, compared with the denominator.
			const twice = 2n * abs(rem);
			const away = n < 0n ? t - 1n : t + 1n;
			if (twice < d) return integer(t);
			if (twice > d) return integer(away);
			return integer(t % 2n === 0n ? t : away);
		}
	}
}

/** MOD (result has the sign of the divisor) or REM (the sign of the dividend). */
export function modulo(a: LispNumber, b: LispNumber, mode: 'mod' | 'rem'): LispNumber {
	if (isZero(b)) throw divisionByZero(`${mode} ${formatNumber(a)} ${formatNumber(b)}`);
	if (isFloat(a) || isFloat(b)) {
		const x = toNumber(a);
		const y = toNumber(b);
		let r = x % y;
		if (mode === 'mod' && r !== 0 && r < 0 !== y < 0) r += y;
		return float(r);
	}
	const q = quotient(a, b, mode === 'mod' ? 'floor' : 'truncate', mode);
	return sub(a, mul(b, q));
}

/** EXPT: exact for a rational base and an integer power. */
export function expt(base: LispNumber, power: LispNumber): LispNumber {
	if (power.kind === 'integer') {
		if (base.kind === 'float') return float(Math.pow(base.value, Number(power.value)));
		const [n, d] = parts(base);
		let p = power.value;
		if (p === 0n) return integer(1n);
		let num = n;
		let den = d;
		if (p < 0n) {
			if (n === 0n) throw divisionByZero(`expt 0 ${p}`);
			[num, den] = [d, n];
			p = -p;
		}
		const bits = Math.max(bitLength(num), bitLength(den));
		if (bits > 1 && Number(p) * (bits - 1) > MAX_INTEGER_BITS) throw tooLarge();
		return ratio(num ** p, den ** p);
	}
	const b = toNumber(base);
	if (b < 0)
		throw new LispError(
			'unsupported',
			'EXPT of a negative number to a non-integer power is a complex number; complex numbers are not supported.'
		);
	return float(Math.pow(b, toNumber(power)));
}

export function sqrt(n: LispNumber): LispFloat {
	const x = toNumber(n);
	if (x < 0)
		throw new LispError(
			'unsupported',
			`(SQRT ${formatNumber(n)}) is a complex number; complex numbers are not supported.`
		);
	return float(Math.sqrt(x));
}

// ---------------------------------------------------------------------------
// Reading and printing
// ---------------------------------------------------------------------------

const INTEGER = /^[+-]?\d+\.?$/;
const RATIO = /^([+-]?\d+)\/(\d+)$/;
const FLOAT_DOT = /^[+-]?\d*\.\d+(?:[esfdl][+-]?\d+)?$/i;
const FLOAT_EXP = /^[+-]?\d+(?:\.\d*)?[esfdl][+-]?\d+$/i;

/**
 * The number written as `text` in Common Lisp syntax (`42`, `-7`, `42.`,
 * `1/2`, `3.14`, `.5`, `1e3`), null when the text is not a number, or an
 * error message (`1/0`, a float too large).
 */
export function parseNumber(text: string): LispNumber | { error: string } | null {
	if (INTEGER.test(text)) return integer(BigInt(text.endsWith('.') ? text.slice(0, -1) : text));
	const r = RATIO.exec(text);
	if (r) {
		if (BigInt(r[2]) === 0n) return { error: `The ratio ${text} has a zero denominator.` };
		return ratio(BigInt(r[1]), BigInt(r[2]));
	}
	if (FLOAT_DOT.test(text) || FLOAT_EXP.test(text)) {
		const x = Number(text.replace(/[sfdl]/i, 'e'));
		const f = Math.fround(x);
		if (!Number.isFinite(f)) return { error: `The number ${text} is too large for a float.` };
		return { kind: 'float', value: f };
	}
	return null;
}

/**
 * A single float as Common Lisp prints it: the shortest digits that read
 * back as the same float, `2.0`, `0.5`, `1.4142135`, and exponent notation
 * outside [0.001, 10,000,000): `1.0e7`, `1.5e-4`.
 */
export function formatFloat(x: number): string {
	if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
	let digits = '';
	let exp = 0;
	for (let p = 1; p <= 9; p++) {
		const s = Math.abs(x).toExponential(p - 1);
		if (Math.fround(Number(s)) === Math.abs(x) || p === 9) {
			const [mantissa, e] = s.split('e');
			digits = mantissa.replace('.', '').replace(/0+$/, '') || '0';
			exp = Number(e);
			break;
		}
	}
	const neg = x < 0 ? '-' : '';
	const a = Math.abs(x);
	if (a >= 1e-3 && a < 1e7) {
		if (exp >= 0) {
			const whole = digits.slice(0, exp + 1).padEnd(exp + 1, '0');
			const frac = digits.slice(exp + 1) || '0';
			return `${neg}${whole}.${frac}`;
		}
		return `${neg}0.${'0'.repeat(-exp - 1)}${digits}`;
	}
	return `${neg}${digits[0]}.${digits.slice(1) || '0'}e${exp}`;
}

export function formatNumber(n: LispNumber): string {
	switch (n.kind) {
		case 'integer':
			return n.value.toString();
		case 'ratio':
			return `${n.num}/${n.den}`;
		case 'float':
			return formatFloat(n.value);
	}
}
