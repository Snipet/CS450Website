/**
 * Lisp data: symbols, numbers (integers of any size, ratios, single floats),
 * strings, conses, and functions. NIL is the symbol NIL, which is also the
 * empty list; T is the canonical true value.
 *
 * Symbols are interned: reading `foo` twice gives the same object, so `eq`
 * on symbols is identity. Names are stored upper case (the reader upcases
 * them, as Common Lisp's standard readtable does).
 */

export interface LispSymbol {
	readonly kind: 'symbol';
	readonly name: string;
}

/** An integer of any size. */
export interface LispInteger {
	readonly kind: 'integer';
	readonly value: bigint;
}

/** A ratio in lowest terms with `den > 1`. */
export interface LispRatio {
	readonly kind: 'ratio';
	readonly num: bigint;
	readonly den: bigint;
}

/** A single float (values are rounded with Math.fround). */
export interface LispFloat {
	readonly kind: 'float';
	readonly value: number;
}

export interface LispString {
	readonly kind: 'string';
	readonly value: string;
}

export interface LispCons {
	readonly kind: 'cons';
	readonly car: LispValue;
	readonly cdr: LispValue;
}

/** Parsed lambda list: required, &optional (with default forms) and &rest parameters. */
export interface LambdaList {
	required: LispSymbol[];
	optional: { name: LispSymbol; init: LispValue }[];
	rest: LispSymbol | null;
}

export interface LispFunction {
	readonly kind: 'function';
	/** Upper-case name (DEFUN or built-in), or null for an anonymous lambda. */
	readonly name: string | null;
	/** Set for built-in functions. */
	readonly builtin: boolean;
	/** The lambda list as written (for printing anonymous functions). */
	readonly params: LispValue;
}

export type LispNumber = LispInteger | LispRatio | LispFloat;
export type LispValue = LispSymbol | LispNumber | LispString | LispCons | LispFunction;

const symbols = new Map<string, LispSymbol>();

/** The symbol named `name` (case-sensitive: pass upper case for ordinary symbols). */
export function intern(name: string): LispSymbol {
	let s = symbols.get(name);
	if (!s) {
		s = Object.freeze({ kind: 'symbol', name });
		symbols.set(name, s);
	}
	return s;
}

export const NIL = intern('NIL');
export const T = intern('T');

export const cons = (car: LispValue, cdr: LispValue): LispCons => ({ kind: 'cons', car, cdr });

export const lispString = (value: string): LispString => ({ kind: 'string', value });

/** A proper list of `items`, ending with `tail` (default NIL). */
export function list(items: readonly LispValue[], tail: LispValue = NIL): LispValue {
	let out = tail;
	for (let i = items.length - 1; i >= 0; i--) out = cons(items[i], out);
	return out;
}

export const isSymbol = (v: LispValue): v is LispSymbol => v.kind === 'symbol';
export const isCons = (v: LispValue): v is LispCons => v.kind === 'cons';
export const isNil = (v: LispValue): boolean => v === NIL;
export const isList = (v: LispValue): boolean => v === NIL || v.kind === 'cons';
export const isNumber = (v: LispValue): v is LispNumber =>
	v.kind === 'integer' || v.kind === 'ratio' || v.kind === 'float';
export const isKeyword = (v: LispValue): boolean => v.kind === 'symbol' && v.name.startsWith(':');
export const truthy = (v: LispValue): boolean => v !== NIL;
export const bool = (b: boolean): LispSymbol => (b ? T : NIL);

/** The elements of a proper list, or null when `v` is not a list or ends in a dotted tail. */
export function listItems(v: LispValue): LispValue[] | null {
	const out: LispValue[] = [];
	let x = v;
	while (x.kind === 'cons') {
		out.push(x.car);
		x = x.cdr;
	}
	return x === NIL ? out : null;
}
