/**
 * Built-in functions: list operations, predicates, equality, arithmetic,
 * higher-order functions, and output. Each takes evaluated arguments and a
 * `Runtime` for calling functions, writing output, and EVAL. Type errors use
 * Common Lisp's words: "The value A is not of type LIST."
 */
import { equal, eq, eql } from './equality';
import { LispError } from './errors';
import { formatControl } from './format';
import {
	add,
	compare,
	div,
	expt,
	float,
	int,
	integer,
	isZero,
	modulo,
	mul,
	negate,
	quotient,
	sign,
	sqrt,
	sub,
	toNumber,
	type Rounding
} from './numbers';
import { printValue } from './printer';
import {
	NIL,
	T,
	bool,
	cons,
	isList,
	isNumber,
	list,
	lispString,
	truthy,
	type LispCons,
	type LispInteger,
	type LispNumber,
	type LispValue
} from './types';

/** What built-in functions can do besides computing a value. */
export interface Runtime {
	/** Calls a function designator (a function, or a symbol naming one) on arguments. */
	call(fn: LispValue, args: LispValue[]): LispValue;
	/** Appends text to the output (PRINT, FORMAT T, …). */
	write(text: string): void;
	/** Whether the output is at the start of a line (for ~& and FRESH-LINE). */
	atLineStart(): boolean;
	/** EVAL: evaluates a form in the global environment. */
	evaluate(form: LispValue): LispValue;
}

export interface BuiltinSpec {
	min: number;
	/** null: any number of arguments. */
	max: number | null;
	fn: (args: LispValue[], rt: Runtime) => LispValue;
}

// ---------------------------------------------------------------------------
// Argument checks
// ---------------------------------------------------------------------------

const shown = (v: LispValue) => printValue(v, { maxLength: 200 });

export const typeError = (v: LispValue, type: string): LispError =>
	new LispError('type-error', `The value ${shown(v)} is not of type ${type}.`);

function num(v: LispValue): LispNumber {
	if (!isNumber(v)) throw typeError(v, 'NUMBER');
	return v;
}

function intArg(v: LispValue): LispInteger {
	if (v.kind !== 'integer') throw typeError(v, 'INTEGER');
	return v;
}

function indexArg(v: LispValue): number {
	if (v.kind !== 'integer' || v.value < 0n) throw typeError(v, 'UNSIGNED-BYTE');
	return v.value > 1_000_000_000n ? 1_000_000_000 : Number(v.value);
}

function listArg(v: LispValue): LispValue {
	if (!isList(v)) throw typeError(v, 'LIST');
	return v;
}

/** Elements of a proper list; a dotted tail or a non-list is a type error. */
export function items(v: LispValue): LispValue[] {
	const out: LispValue[] = [];
	let x = v;
	while (x.kind === 'cons') {
		out.push(x.car);
		x = x.cdr;
	}
	if (x !== NIL) throw typeError(x, 'LIST');
	return out;
}

const car = (v: LispValue): LispValue => (listArg(v) === NIL ? NIL : (v as LispCons).car);
const cdr = (v: LispValue): LispValue => (listArg(v) === NIL ? NIL : (v as LispCons).cdr);

/** The :TEST keyword argument of MEMBER, ASSOC and REMOVE (default EQL). */
function testOption(
	name: string,
	rest: LispValue[],
	rt: Runtime
): (a: LispValue, b: LispValue) => boolean {
	let test: (a: LispValue, b: LispValue) => boolean = eql;
	if (rest.length % 2 !== 0)
		throw new LispError('arguments', `${name}: odd number of keyword arguments.`);
	for (let i = 0; i < rest.length; i += 2) {
		const key = rest[i];
		if (key.kind === 'symbol' && key.name === ':TEST') {
			const fn = rest[i + 1];
			test = (a, b) => truthy(rt.call(fn, [a, b]));
		} else {
			throw new LispError(
				'arguments',
				`${name}: unknown keyword argument ${shown(key)} (supported: :TEST).`
			);
		}
	}
	return test;
}

/** The lists of MAPCAR, EVERY and SOME, as arrays (stopping at the shortest). */
function columns(lists: LispValue[]): LispValue[][] {
	const arrays = lists.map(items);
	const n = Math.min(...arrays.map((a) => a.length));
	const out: LispValue[][] = [];
	for (let i = 0; i < n; i++) out.push(arrays.map((a) => a[i]));
	return out;
}

function numbers(args: LispValue[]): LispNumber[] {
	return args.map(num);
}

function chain(args: LispValue[], ok: (c: number) => boolean): LispValue {
	const ns = numbers(args);
	for (let i = 0; i + 1 < ns.length; i++) if (!ok(compare(ns[i], ns[i + 1]))) return NIL;
	return T;
}

function rounding(mode: Rounding, name: string): BuiltinSpec {
	return {
		min: 1,
		max: 2,
		fn: ([a, b]) => quotient(num(a), b === undefined ? int(1) : num(b), mode, name)
	};
}

function predicate(test: (v: LispValue) => boolean): BuiltinSpec {
	return { min: 1, max: 1, fn: ([v]) => bool(test(v)) };
}

function numberPredicate(test: (n: LispNumber) => boolean): BuiltinSpec {
	return { min: 1, max: 1, fn: ([v]) => bool(test(num(v))) };
}

function nth(n: number, v: LispValue): LispValue {
	let x = listArg(v);
	for (let i = 0; i < n && x !== NIL; i++) x = cdr(x);
	return car(x);
}

function nthcdr(n: number, v: LispValue): LispValue {
	let x = listArg(v);
	for (let i = 0; i < n && x !== NIL; i++) x = cdr(x);
	return x;
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

const table: Record<string, BuiltinSpec> = {
	// Lists
	CAR: { min: 1, max: 1, fn: ([v]) => car(v) },
	CDR: { min: 1, max: 1, fn: ([v]) => cdr(v) },
	FIRST: { min: 1, max: 1, fn: ([v]) => car(v) },
	REST: { min: 1, max: 1, fn: ([v]) => cdr(v) },
	CONS: { min: 2, max: 2, fn: ([a, b]) => cons(a, b) },
	LIST: { min: 0, max: null, fn: (args) => list(args) },
	'LIST*': { min: 1, max: null, fn: (args) => list(args.slice(0, -1), args[args.length - 1]) },
	APPEND: {
		min: 0,
		max: null,
		fn: (args) => {
			if (args.length === 0) return NIL;
			let out = args[args.length - 1];
			for (let i = args.length - 2; i >= 0; i--) out = list(items(args[i]), out);
			return out;
		}
	},
	REVERSE: {
		min: 1,
		max: 1,
		fn: ([v]) => {
			if (v.kind === 'string') return lispString([...v.value].reverse().join(''));
			if (!isList(v)) throw typeError(v, 'SEQUENCE');
			let out: LispValue = NIL;
			for (const x of items(v)) out = cons(x, out);
			return out;
		}
	},
	LENGTH: {
		min: 1,
		max: 1,
		fn: ([v]) => {
			if (v.kind === 'string') return int([...v.value].length);
			if (!isList(v)) throw typeError(v, 'SEQUENCE');
			return int(items(v).length);
		}
	},
	'COPY-LIST': { min: 1, max: 1, fn: ([v]) => list(items(v)) },
	LAST: {
		min: 1,
		max: 2,
		fn: ([v, n]) => {
			const k = n === undefined ? 1 : indexArg(n);
			let x = listArg(v);
			const cells: LispValue[] = [];
			while (x.kind === 'cons') {
				cells.push(x);
				x = x.cdr;
			}
			if (k === 0) return x;
			return cells.length <= k ? v : cells[cells.length - k];
		}
	},
	BUTLAST: {
		min: 1,
		max: 2,
		fn: ([v, n]) => {
			const k = n === undefined ? 1 : indexArg(n);
			const xs = items(listArg(v));
			return list(xs.slice(0, Math.max(0, xs.length - k)));
		}
	},
	NTH: { min: 2, max: 2, fn: ([n, v]) => nth(indexArg(n), v) },
	NTHCDR: { min: 2, max: 2, fn: ([n, v]) => nthcdr(indexArg(n), v) },
	MEMBER: {
		min: 2,
		max: 4,
		fn: ([item, v, ...rest], rt) => {
			const test = testOption('MEMBER', rest, rt);
			let x = listArg(v);
			while (x.kind === 'cons') {
				if (test(item, x.car)) return x;
				x = x.cdr;
			}
			if (x !== NIL) throw typeError(x, 'LIST');
			return NIL;
		}
	},
	ASSOC: {
		min: 2,
		max: 4,
		fn: ([key, v, ...rest], rt) => {
			const test = testOption('ASSOC', rest, rt);
			for (const pair of items(listArg(v))) {
				if (pair === NIL) continue;
				if (pair.kind !== 'cons') throw typeError(pair, 'LIST');
				if (test(key, pair.car)) return pair;
			}
			return NIL;
		}
	},
	REMOVE: {
		min: 2,
		max: 4,
		fn: ([item, v, ...rest], rt) => {
			const test = testOption('REMOVE', rest, rt);
			if (!isList(v)) throw typeError(v, 'LIST');
			return list(items(v).filter((x) => !test(item, x)));
		}
	},
	'REMOVE-IF': {
		min: 2,
		max: 2,
		fn: ([pred, v], rt) => list(items(listArg(v)).filter((x) => !truthy(rt.call(pred, [x]))))
	},
	'REMOVE-IF-NOT': {
		min: 2,
		max: 2,
		fn: ([pred, v], rt) => list(items(listArg(v)).filter((x) => truthy(rt.call(pred, [x]))))
	},
	SORT: {
		min: 2,
		max: 2,
		fn: ([v, pred], rt) => {
			const xs = items(listArg(v));
			// Merge sort (stable), calling the predicate as SORT does.
			const sort = (a: LispValue[]): LispValue[] => {
				if (a.length < 2) return a;
				const mid = a.length >> 1;
				const l = sort(a.slice(0, mid));
				const r = sort(a.slice(mid));
				const out: LispValue[] = [];
				let i = 0;
				let j = 0;
				while (i < l.length && j < r.length) {
					if (truthy(rt.call(pred, [r[j], l[i]]))) out.push(r[j++]);
					else out.push(l[i++]);
				}
				return out.concat(l.slice(i), r.slice(j));
			};
			return list(sort(xs));
		}
	},

	// Functions
	MAPCAR: {
		min: 2,
		max: null,
		fn: ([fn, ...lists], rt) => list(columns(lists).map((args) => rt.call(fn, args)))
	},
	FUNCALL: { min: 1, max: null, fn: ([fn, ...args], rt) => rt.call(fn, args) },
	APPLY: {
		min: 2,
		max: null,
		fn: (args, rt) => {
			const spread = items(args[args.length - 1]);
			return rt.call(args[0], [...args.slice(1, -1), ...spread]);
		}
	},
	REDUCE: {
		min: 2,
		max: 4,
		fn: ([fn, v, ...rest], rt) => {
			let initial: LispValue | undefined;
			if (rest.length) {
				if (rest.length !== 2 || rest[0].kind !== 'symbol' || rest[0].name !== ':INITIAL-VALUE')
					throw new LispError(
						'arguments',
						'REDUCE: the only keyword argument supported is :INITIAL-VALUE.'
					);
				initial = rest[1];
			}
			const xs = items(listArg(v));
			if (initial !== undefined) xs.unshift(initial);
			if (xs.length === 0) return rt.call(fn, []);
			let acc = xs[0];
			for (let i = 1; i < xs.length; i++) acc = rt.call(fn, [acc, xs[i]]);
			return acc;
		}
	},
	EVERY: {
		min: 2,
		max: null,
		fn: ([pred, ...lists], rt) => {
			for (const args of columns(lists)) if (!truthy(rt.call(pred, args))) return NIL;
			return T;
		}
	},
	SOME: {
		min: 2,
		max: null,
		fn: ([pred, ...lists], rt) => {
			for (const args of columns(lists)) {
				const v = rt.call(pred, args);
				if (truthy(v)) return v;
			}
			return NIL;
		}
	},
	IDENTITY: { min: 1, max: 1, fn: ([v]) => v },
	EVAL: { min: 1, max: 1, fn: ([form], rt) => rt.evaluate(form) },

	// Predicates
	NULL: predicate((v) => v === NIL),
	NOT: predicate((v) => v === NIL),
	ATOM: predicate((v) => v.kind !== 'cons'),
	LISTP: predicate(isList),
	CONSP: predicate((v) => v.kind === 'cons'),
	ENDP: { min: 1, max: 1, fn: ([v]) => bool(listArg(v) === NIL) },
	NUMBERP: predicate(isNumber),
	INTEGERP: predicate((v) => v.kind === 'integer'),
	RATIONALP: predicate((v) => v.kind === 'integer' || v.kind === 'ratio'),
	FLOATP: predicate((v) => v.kind === 'float'),
	SYMBOLP: predicate((v) => v.kind === 'symbol'),
	KEYWORDP: predicate((v) => v.kind === 'symbol' && v.name.startsWith(':')),
	STRINGP: predicate((v) => v.kind === 'string'),
	FUNCTIONP: predicate((v) => v.kind === 'function'),
	ZEROP: numberPredicate(isZero),
	PLUSP: numberPredicate((n) => sign(n) > 0),
	MINUSP: numberPredicate((n) => sign(n) < 0),
	EVENP: { min: 1, max: 1, fn: ([v]) => bool(intArg(v).value % 2n === 0n) },
	ODDP: { min: 1, max: 1, fn: ([v]) => bool(intArg(v).value % 2n !== 0n) },
	EQ: { min: 2, max: 2, fn: ([a, b]) => bool(eq(a, b)) },
	EQL: { min: 2, max: 2, fn: ([a, b]) => bool(eql(a, b)) },
	EQUAL: { min: 2, max: 2, fn: ([a, b]) => bool(equal(a, b)) },

	// Numbers
	'=': { min: 1, max: null, fn: (args) => chain(args, (c) => c === 0) },
	'<': { min: 1, max: null, fn: (args) => chain(args, (c) => c < 0) },
	'>': { min: 1, max: null, fn: (args) => chain(args, (c) => c > 0) },
	'<=': { min: 1, max: null, fn: (args) => chain(args, (c) => c <= 0) },
	'>=': { min: 1, max: null, fn: (args) => chain(args, (c) => c >= 0) },
	'/=': {
		min: 1,
		max: null,
		fn: (args) => {
			const ns = numbers(args);
			for (let i = 0; i < ns.length; i++)
				for (let j = i + 1; j < ns.length; j++) if (compare(ns[i], ns[j]) === 0) return NIL;
			return T;
		}
	},
	'+': { min: 0, max: null, fn: (args) => numbers(args).reduce(add, int(0)) },
	'*': { min: 0, max: null, fn: (args) => numbers(args).reduce(mul, int(1)) },
	'-': {
		min: 1,
		max: null,
		fn: (args) => {
			const ns = numbers(args);
			return ns.length === 1 ? negate(ns[0]) : ns.slice(1).reduce(sub, ns[0]);
		}
	},
	'/': {
		min: 1,
		max: null,
		fn: (args) => {
			const ns = numbers(args);
			return ns.length === 1 ? div(int(1), ns[0]) : ns.slice(1).reduce(div, ns[0]);
		}
	},
	'1+': { min: 1, max: 1, fn: ([v]) => add(num(v), int(1)) },
	'1-': { min: 1, max: 1, fn: ([v]) => sub(num(v), int(1)) },
	MOD: { min: 2, max: 2, fn: ([a, b]) => modulo(num(a), num(b), 'mod') },
	REM: { min: 2, max: 2, fn: ([a, b]) => modulo(num(a), num(b), 'rem') },
	MAX: {
		min: 1,
		max: null,
		fn: (args) => numbers(args).reduce((m, n) => (compare(n, m) > 0 ? n : m))
	},
	MIN: {
		min: 1,
		max: null,
		fn: (args) => numbers(args).reduce((m, n) => (compare(n, m) < 0 ? n : m))
	},
	ABS: { min: 1, max: 1, fn: ([v]) => (sign(num(v)) < 0 ? negate(num(v)) : num(v)) },
	SQRT: { min: 1, max: 1, fn: ([v]) => sqrt(num(v)) },
	EXPT: { min: 2, max: 2, fn: ([a, b]) => expt(num(a), num(b)) },
	FLOOR: rounding('floor', 'floor'),
	CEILING: rounding('ceiling', 'ceiling'),
	TRUNCATE: rounding('truncate', 'truncate'),
	ROUND: rounding('round', 'round'),
	FLOAT: { min: 1, max: 1, fn: ([v]) => float(toNumber(num(v))) },
	GCD: {
		min: 0,
		max: null,
		fn: (args) => {
			let g = 0n;
			for (const a of args) {
				let x = intArg(a).value;
				let y = g;
				if (x < 0n) x = -x;
				while (x !== 0n) [y, x] = [x, y % x];
				g = y;
			}
			return integer(g);
		}
	},

	// Output
	PRINT: {
		min: 1,
		max: 1,
		fn: ([v], rt) => {
			rt.write(`\n${printValue(v)} `);
			return v;
		}
	},
	PRIN1: {
		min: 1,
		max: 1,
		fn: ([v], rt) => {
			rt.write(printValue(v));
			return v;
		}
	},
	PRINC: {
		min: 1,
		max: 1,
		fn: ([v], rt) => {
			rt.write(printValue(v, { escape: false }));
			return v;
		}
	},
	TERPRI: {
		min: 0,
		max: 0,
		fn: (_args, rt) => {
			rt.write('\n');
			return NIL;
		}
	},
	'FRESH-LINE': {
		min: 0,
		max: 0,
		fn: (_args, rt) => {
			if (rt.atLineStart()) return NIL;
			rt.write('\n');
			return T;
		}
	},
	FORMAT: {
		min: 2,
		max: null,
		fn: ([dest, control, ...args], rt) => {
			if (control.kind !== 'string') throw typeError(control, 'STRING');
			if (dest === NIL) return lispString(formatControl(control.value, args, true));
			if (dest === T) {
				rt.write(formatControl(control.value, args, rt.atLineStart()));
				return NIL;
			}
			throw new LispError(
				'unsupported',
				'FORMAT: only T (print the text) and NIL (return it as a string) are supported as the destination.'
			);
		}
	}
};

// cXr combinations: CAAR, CADR, …, CDDDDR.
for (let len = 2; len <= 4; len++) {
	for (let bits = 0; bits < 1 << len; bits++) {
		let ops = '';
		for (let k = 0; k < len; k++) ops += bits & (1 << k) ? 'D' : 'A';
		const name = `C${ops}R`;
		table[name] = {
			min: 1,
			max: 1,
			fn: ([v]) => {
				let x = v;
				for (let k = ops.length - 1; k >= 0; k--) x = ops[k] === 'A' ? car(x) : cdr(x);
				return x;
			}
		};
	}
}

const ORDINALS = [
	'SECOND',
	'THIRD',
	'FOURTH',
	'FIFTH',
	'SIXTH',
	'SEVENTH',
	'EIGHTH',
	'NINTH',
	'TENTH'
];
ORDINALS.forEach((name, i) => {
	table[name] = { min: 1, max: 1, fn: ([v]) => nth(i + 1, v) };
});

export const BUILTINS: ReadonlyMap<string, BuiltinSpec> = new Map(Object.entries(table));

/** Names of the built-in functions, sorted. */
export const BUILTIN_NAMES: readonly string[] = [...BUILTINS.keys()].sort();
