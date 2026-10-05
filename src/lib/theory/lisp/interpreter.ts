/**
 * A Common Lisp subset evaluator: lexical scope, closures, recursion,
 * special variables (DEFVAR, DEFPARAMETER), the special forms and macros in
 * SPECIAL_FORMS, and the functions in builtins.ts.
 *
 * `run` reads a text and evaluates its top-level forms in order, each with
 * its own budget of evaluation steps (DEFAULT_MAX_STEPS) and nested calls
 * (DEFAULT_MAX_DEPTH). Errors are reported per form in Common Lisp's words
 * and located at the innermost form; an error does not stop later forms.
 * With tracing on, every call to a user-defined function and its return are
 * recorded like Common Lisp's TRACE output. Nothing is thrown to callers.
 */
import { hasErrors, type Diagnostic, type Span } from '../diagnostics';
import { BUILTINS, typeError, type BuiltinSpec, type Runtime } from './builtins';
import { eql } from './equality';
import { LispError, argumentsPhrase, arityPhrase, type LispErrorKind } from './errors';
import { add, int, integer, sub } from './numbers';
import { printValue } from './printer';
import { createSpanTable, readAll, type ReadForm, type SpanTable } from './reader';
import type { TraceEntry } from './trace';
import {
	NIL,
	T,
	cons,
	intern,
	isNumber,
	list,
	listItems,
	truthy,
	type LambdaList,
	type LispCons,
	type LispFunction,
	type LispSymbol,
	type LispValue
} from './types';

export const DEFAULT_MAX_STEPS = 200_000;
export const DEFAULT_MAX_DEPTH = 1_000;
export const DEFAULT_MAX_TRACE = 5_000;
export const DEFAULT_MAX_OUTPUT = 100_000;

/** Special operators and macros the evaluator implements. */
export const SPECIAL_FORMS: readonly string[] = [
	'QUOTE',
	'FUNCTION',
	'LAMBDA',
	'DEFUN',
	'DEFVAR',
	'DEFPARAMETER',
	'LET',
	'LET*',
	'IF',
	'COND',
	'CASE',
	'WHEN',
	'UNLESS',
	'AND',
	'OR',
	'PROGN',
	'PROG1',
	'SETQ',
	'SETF',
	'INCF',
	'DECF',
	'PUSH',
	'POP',
	'DOLIST',
	'DOTIMES',
	'BLOCK',
	'RETURN',
	'RETURN-FROM',
	'TRACE',
	'UNTRACE'
];

/** Common Lisp operators this evaluator does not implement (they get a specific message). */
export const UNSUPPORTED_FORMS: readonly string[] = [
	'LOOP',
	'DO',
	'DO*',
	'FLET',
	'LABELS',
	'MACROLET',
	'DEFMACRO',
	'DEFCONSTANT',
	'MULTIPLE-VALUE-BIND',
	'MULTIPLE-VALUE-LIST',
	'VALUES',
	'DESTRUCTURING-BIND',
	'TAGBODY',
	'GO',
	'PROG',
	'PROG2',
	'CATCH',
	'THROW',
	'UNWIND-PROTECT',
	'HANDLER-CASE',
	'IGNORE-ERRORS',
	'DEFSTRUCT',
	'DEFCLASS',
	'DEFMETHOD',
	'DEFGENERIC',
	'THE',
	'LOCALLY',
	'EVAL-WHEN',
	'DECLARE',
	'RPLACA',
	'RPLACD',
	'MAPC',
	'MAPLIST',
	'MAPCAN',
	'FIND',
	'POSITION',
	'COUNT',
	'SUBST',
	'CONCATENATE',
	'SUBSEQ',
	'READ',
	'RANDOM'
];

const SPECIAL_SET = new Set(SPECIAL_FORMS);
const UNSUPPORTED_SET = new Set(UNSUPPORTED_FORMS);

const LAMBDA = intern('LAMBDA');
const DECLARE = intern('DECLARE');
const OTHERWISE = intern('OTHERWISE');

interface Builtin extends LispFunction {
	readonly builtin: true;
	readonly spec: BuiltinSpec;
}

interface Closure extends LispFunction {
	readonly builtin: false;
	readonly lambda: LambdaList;
	readonly body: LispValue[];
	readonly bodySpans: (Span | undefined)[];
	readonly env: Env | null;
	/** DEFUN bodies are a block named after the function. */
	readonly blockName: LispSymbol | null;
}

type Fn = Builtin | Closure;

interface Block {
	name: LispSymbol;
	active: boolean;
}

class Env {
	readonly vars = new Map<LispSymbol, LispValue>();
	block: Block | null = null;
	constructor(readonly parent: Env | null) {}
}

class ReturnSignal {
	constructor(
		readonly block: Block,
		readonly value: LispValue
	) {}
}

interface Binding {
	sym: LispSymbol;
	init: LispValue | null;
	span: Span | undefined;
}

interface Located {
	env: Env | null;
	span: Span | undefined;
}

/** Evaluating a call's arguments; `rest` holds the ones still to evaluate. */
interface ArgsFrame extends Located {
	k: 'args';
	fn: Fn;
	args: LispValue[];
	rest: LispValue;
	form: LispCons;
}
/** An implicit PROGN at form `i` (popped before the last form). */
interface BodyFrame extends Located {
	k: 'body';
	items: readonly LispValue[];
	spans: readonly (Span | undefined)[];
	i: number;
}
/** A call to a user function in progress (trace, depth, its block). */
interface ReturnFrame {
	k: 'return';
	fn: Closure;
	traced: boolean;
	level: number;
	mark: number;
	block: Block | null;
}
interface IfFrame extends Located {
	k: 'if';
	a: Args;
}
interface WhenFrame extends Located {
	k: 'when';
	unless: boolean;
	a: Args;
}
interface CondFrame extends Located {
	k: 'cond';
	a: Args;
	i: number;
	clause: Args | null;
	cspan: Span | undefined;
}
interface CaseFrame extends Located {
	k: 'case';
	a: Args;
}
interface SequenceFrame extends Located {
	k: 'and' | 'or';
	a: Args;
	i: number;
}
interface Prog1Frame extends Located {
	k: 'prog1';
	a: Args;
	i: number;
	first: LispValue | null;
}
interface LetFrame {
	k: 'let';
	star: boolean;
	bindings: Binding[];
	values: LispValue[];
	i: number;
	inner: Env;
	outer: Env | null;
	a: Args;
	mark: number;
	span: Span | undefined;
}
/** Restores special variables when the value passes. */
interface UnwindFrame {
	k: 'unwind';
	mark: number;
}
interface SetqFrame extends Located {
	k: 'setq';
	a: Args;
	i: number;
}
/** Transforms the value of one subform (INCF, PUSH, DEFVAR, …). */
interface ThenFrame {
	k: 'then';
	then: (value: LispValue) => LispValue;
}
interface BlockFrame {
	k: 'block';
	block: Block;
}
/** RETURN-FROM waiting for its value. */
interface ExitFrame {
	k: 'exit';
	block: Block;
}
interface LoopFrame {
	k: 'dolist' | 'dotimes';
	phase: 'source' | 'body' | 'result';
	variable: LispSymbol;
	/** DOLIST: the rest of the list; DOTIMES: the count. */
	source: LispValue;
	count: bigint;
	spec: Args;
	a: Args;
	outer: Env;
	block: Block;
	mark: number;
	span: Span | undefined;
}

type Frame =
	| ArgsFrame
	| BodyFrame
	| ReturnFrame
	| IfFrame
	| WhenFrame
	| CondFrame
	| CaseFrame
	| SequenceFrame
	| Prog1Frame
	| LetFrame
	| UnwindFrame
	| SetqFrame
	| ThenFrame
	| BlockFrame
	| ExitFrame
	| LoopFrame;

const BUILTIN_FUNCTIONS: ReadonlyMap<string, Builtin> = new Map(
	[...BUILTINS].map(([name, spec]) => [
		name,
		Object.freeze({ kind: 'function', name, builtin: true, params: NIL, spec }) as Builtin
	])
);

// NCONC and NREVERSE give the same results as APPEND and REVERSE here (nothing is destructive).
const ALIASES: Record<string, string> = { NCONC: 'APPEND', NREVERSE: 'REVERSE' };
for (const [alias, name] of Object.entries(ALIASES)) {
	const spec = BUILTINS.get(name)!;
	(BUILTIN_FUNCTIONS as Map<string, Builtin>).set(
		alias,
		Object.freeze({ kind: 'function', name: alias, builtin: true, params: NIL, spec }) as Builtin
	);
}

const FUNCALL = BUILTIN_FUNCTIONS.get('FUNCALL')!;
const APPLY = BUILTIN_FUNCTIONS.get('APPLY')!;

/** Names of every built-in function (including NCONC and NREVERSE), sorted. */
export const FUNCTION_NAMES: readonly string[] = [...BUILTIN_FUNCTIONS.keys()].sort();

export interface InterpreterOptions {
	/** Evaluation steps allowed per top-level form (default 200,000). */
	maxSteps?: number;
	/** Nested calls of user functions allowed (default 1,000). */
	maxDepth?: number;
	/** Trace lines recorded per run (default 5,000). */
	maxTraceLines?: number;
	/** Characters of output kept per run (default 100,000). */
	maxOutput?: number;
}

export interface RunOptions {
	/** `span.source` of the text (default null). */
	source?: string | null;
	/** Record calls to every user-defined function (as if TRACEd). */
	trace?: boolean;
}

export interface LispErrorInfo {
	kind: LispErrorKind;
	message: string;
	/** Where the error was signalled. */
	span?: Span;
}

export interface FormResult {
	/** Position among the run's top-level forms. */
	index: number;
	span: Span;
	/** The form's source text. */
	text: string;
	/** The value, or null after an error. */
	value: LispValue | null;
	/** The value as printed (PRIN1), or null after an error. */
	printed: string | null;
	error: LispErrorInfo | null;
	/** Text written by PRINT, FORMAT T, … while evaluating the form. */
	output: string;
	steps: number;
	/** The form's trace entries are `trace.slice(traceStart, traceEnd)` of the run. */
	traceStart: number;
	traceEnd: number;
}

export interface RunResult {
	/** Reading problems, then the error of each form that failed, located where it was signalled. */
	diagnostics: Diagnostic[];
	/** False when the text could not be read (nothing was evaluated). */
	read: boolean;
	forms: FormResult[];
	trace: TraceEntry[];
	/** True when the trace stopped at the line limit (evaluation went on). */
	traceTruncated: boolean;
	output: string;
	outputTruncated: boolean;
}

interface Args {
	items: LispValue[];
	spans: (Span | undefined)[];
}

const fmt = (n: number) => n.toLocaleString('en-US');
const show = (v: LispValue) => printValue(v, { maxLength: 200 });

export class Interpreter {
	readonly maxSteps: number;
	readonly maxDepth: number;
	readonly maxTraceLines: number;
	readonly maxOutput: number;

	readonly #spans: SpanTable = createSpanTable();
	readonly #globals = new Map<LispSymbol, LispValue>();
	readonly #specials = new Set<LispSymbol>();
	readonly #functions = new Map<LispSymbol, Closure>();
	readonly #traced = new Set<string>();
	#traceAll = false;

	// Per top-level form.
	#steps = 0;
	#depth = 0;
	#deepest = 0;
	#traceDepth = 0;
	#form = 0;
	#formOutput = '';
	#lineStart = true;
	#builtinSpan: Span | undefined;
	readonly #dynamic: { symbol: LispSymbol; old: LispValue | undefined }[] = [];
	readonly #argsCache = new WeakMap<LispCons, Args>();

	// The machine: its stack and registers.
	readonly #stack: Frame[] = [];
	#x: LispValue = NIL;
	#env: Env | null = null;
	#span: Span | undefined;
	#value: LispValue = NIL;
	#evaluating = false;

	// Per run.
	#trace: TraceEntry[] = [];
	#traceTruncated = false;
	#output = '';
	#outputTruncated = false;

	readonly #runtime: Runtime;

	constructor(options: InterpreterOptions = {}) {
		this.maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
		this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
		this.maxTraceLines = options.maxTraceLines ?? DEFAULT_MAX_TRACE;
		this.maxOutput = options.maxOutput ?? DEFAULT_MAX_OUTPUT;
		this.#runtime = {
			call: (fn, args) =>
				this.#callNested(this.#designator(fn, this.#builtinSpan), args, this.#builtinSpan),
			write: (text) => this.#write(text),
			atLineStart: () => this.#lineStart,
			evaluate: (form) => this.#eval(form, null, this.#builtinSpan)
		};
	}

	/** Names of the user-defined functions, in definition order. */
	userFunctions(): string[] {
		return [...this.#functions.keys()].map((s) => s.name);
	}

	/** Reads `text` and evaluates its top-level forms in order. */
	run(text: string, options: RunOptions = {}): RunResult {
		const source = options.source ?? null;
		const read = readAll(text, { source, spans: this.#spans });
		this.#trace = [];
		this.#traceTruncated = false;
		this.#output = '';
		this.#outputTruncated = false;
		if (hasErrors(read.diagnostics)) {
			return {
				diagnostics: read.diagnostics,
				read: false,
				forms: [],
				trace: [],
				traceTruncated: false,
				output: '',
				outputTruncated: false
			};
		}
		this.#traceAll = options.trace ?? false;
		const forms = read.forms.map((f, i) => this.#evalTopLevel(f, i, text));
		const diagnostics: Diagnostic[] = [...read.diagnostics];
		const seen = new Set<string>();
		for (const f of forms) {
			if (!f.error) continue;
			const key = `${f.error.message}@${f.error.span?.source}:${f.error.span?.start}`;
			if (seen.has(key)) continue;
			seen.add(key);
			diagnostics.push({ severity: 'error', message: f.error.message, span: f.error.span });
		}
		return {
			diagnostics,
			read: true,
			forms,
			trace: this.#trace,
			traceTruncated: this.#traceTruncated,
			output: this.#output,
			outputTruncated: this.#outputTruncated
		};
	}

	// -------------------------------------------------------------------------
	// Top level
	// -------------------------------------------------------------------------

	#evalTopLevel(form: ReadForm, index: number, text: string): FormResult {
		this.#steps = 0;
		this.#depth = 0;
		this.#deepest = 0;
		this.#traceDepth = 0;
		this.#form = index;
		this.#formOutput = '';
		this.#lineStart = true;
		const traceStart = this.#trace.length;
		let value: LispValue | null = null;
		let error: LispErrorInfo | null = null;
		try {
			value = this.#eval(form.datum, null, form.span);
		} catch (e) {
			error = this.#errorInfo(e, form.span);
		} finally {
			this.#popTo(0);
			this.#unwind(0);
			this.#depth = 0;
			this.#traceDepth = 0;
		}
		let printed: string | null = null;
		if (value) printed = printValue(value);
		return {
			index,
			span: form.span,
			text: text.slice(form.span.start, form.span.end),
			value,
			printed,
			error,
			output: this.#formOutput,
			steps: this.#steps,
			traceStart,
			traceEnd: this.#trace.length
		};
	}

	#errorInfo(e: unknown, fallback: Span): LispErrorInfo {
		if (e instanceof LispError)
			return { kind: e.kind, message: e.message, span: e.span ?? fallback };
		if (e instanceof ReturnSignal)
			return {
				kind: 'control',
				message: `RETURN-FROM ${e.block.name.name}: the block has already been exited.`,
				span: fallback
			};
		if (e instanceof RangeError)
			return {
				kind: 'depth-limit',
				message: `Control stack exhausted at a call depth of ${fmt(this.#deepest)} — is the recursion missing a base case?`,
				span: fallback
			};
		return { kind: 'internal', message: `Internal error: ${String(e)}`, span: fallback };
	}

	#write(text: string): void {
		if (this.#outputTruncated || !text) return;
		let piece = text;
		if (this.#output.length + piece.length > this.maxOutput) {
			piece = `${piece.slice(0, Math.max(0, this.maxOutput - this.#output.length))}\n… (output stopped at ${fmt(this.maxOutput)} characters)\n`;
			this.#outputTruncated = true;
		}
		this.#output += piece;
		this.#formOutput += piece;
		this.#lineStart = piece.endsWith('\n');
	}

	#record(entry: Omit<TraceEntry, 'form'>): void {
		if (this.#trace.length >= this.maxTraceLines) {
			this.#traceTruncated = true;
			return;
		}
		this.#trace.push({ ...entry, form: this.#form });
	}

	// -------------------------------------------------------------------------
	// Evaluation: an explicit-stack machine
	//
	// Evaluation never recurses in JavaScript for Lisp-level recursion: a form
	// waiting for a subform's value is a frame on #stack, and the machine loop
	// either evaluates the expression in the registers (#x, #env, #span) or
	// returns #value to the frame on top. Only built-in functions that call
	// functions (MAPCAR, SORT, …), EVAL, and &OPTIONAL defaults start a nested
	// machine on the same stack.
	// -------------------------------------------------------------------------

	/** Evaluates `x` (a nested machine run on the shared stack). */
	#eval(x: LispValue, env: Env | null, span: Span | undefined): LispValue {
		const base = this.#stack.length;
		this.#evalNext(x, env, span);
		return this.#machine(base);
	}

	/** Calls a function to completion (for built-ins that call functions). */
	#callNested(fn: Fn, args: LispValue[], span: Span | undefined): LispValue {
		const base = this.#stack.length;
		try {
			this.#call(fn, args, span);
		} catch (e) {
			this.#popTo(base);
			throw e;
		}
		return this.#machine(base);
	}

	#evalNext(x: LispValue, env: Env | null, span: Span | undefined): void {
		this.#x = x;
		this.#env = env;
		this.#span = span;
		this.#evaluating = true;
	}

	#ret(value: LispValue): void {
		this.#value = value;
		this.#evaluating = false;
	}

	#machine(base: number): LispValue {
		const stack = this.#stack;
		for (;;) {
			try {
				for (;;) {
					if (this.#evaluating) {
						this.#step(this.#x, this.#env, this.#span);
						continue;
					}
					if (stack.length === base) return this.#value;
					this.#resume(stack[stack.length - 1], base);
				}
			} catch (e) {
				if (e instanceof ReturnSignal) {
					const j = this.#findBlock(e.block, base);
					if (j >= 0) {
						this.#exitAt(j, e.value);
						continue;
					}
				}
				this.#popTo(base);
				throw e;
			}
		}
	}

	/** Evaluates one expression: a value, or frames pushed and the next expression set. */
	#step(x: LispValue, env: Env | null, span: Span | undefined): void {
		if (++this.#steps > this.maxSteps)
			throw new LispError(
				'step-limit',
				`Stopped after ${fmt(this.maxSteps)} evaluation steps — is the recursion missing a base case?`,
				span
			);
		if (x.kind === 'symbol') return this.#ret(this.#lookup(x, env, span));
		if (x.kind !== 'cons') return this.#ret(x);
		const form = x;
		const fspan = this.#spans.form.get(form) ?? span;
		const op = form.car;
		if (op.kind === 'symbol') {
			if (SPECIAL_SET.has(op.name)) return this.#special(op.name, form, env, fspan);
			const fn = this.#functions.get(op) ?? BUILTIN_FUNCTIONS.get(op.name);
			if (!fn) throw this.#undefinedFunction(op, this.#spans.car.get(form) ?? fspan);
			return this.#startCall(fn, form, env, fspan);
		}
		if (op.kind === 'cons' && op.car === LAMBDA) {
			const fn = this.#makeClosure(op.cdr, env, null, null, fspan);
			return this.#startCall(fn, form, env, fspan);
		}
		throw new LispError(
			'syntax',
			`Illegal function call: ${show(form)}. The first element must name a function; to use the list as data, quote it: '${show(form)}.`,
			fspan
		);
	}

	/** Starts evaluating a call's arguments (left to right), then calls `fn`. */
	#startCall(fn: Fn, form: LispCons, env: Env | null, span: Span | undefined): void {
		const args = form.cdr;
		if (args === NIL) return this.#call(fn, [], span);
		if (args.kind !== 'cons')
			throw new LispError('syntax', `The function call ${show(form)} is malformed.`, span);
		this.#stack.push({ k: 'args', fn, args: [], rest: args.cdr, env, span, form });
		this.#evalNext(args.car, env, this.#spans.car.get(args) ?? span);
	}

	/** Applies `fn`: a built-in's value is returned; a closure's body is set up to run. */
	#call(fn: Fn, args: LispValue[], span: Span | undefined): void {
		for (;;) {
			if (!fn.builtin) return this.#enterClosure(fn, args, span);
			// FUNCALL and APPLY transfer control without a nested machine.
			if (fn === FUNCALL && args.length >= 1) {
				fn = this.#designator(args[0], span);
				args = args.slice(1);
				continue;
			}
			if (fn === APPLY && args.length >= 2) {
				const last = args[args.length - 1];
				const spread = listItems(last);
				if (!spread) throw located(typeError(last, 'LIST'), span);
				const target = this.#designator(args[0], span);
				args = [...args.slice(1, -1), ...spread];
				fn = target;
				continue;
			}
			return this.#ret(this.#callBuiltin(fn, args, span));
		}
	}

	#callBuiltin(fn: Builtin, args: LispValue[], span: Span | undefined): LispValue {
		const { min, max } = fn.spec;
		if (args.length < min || (max !== null && args.length > max))
			throw new LispError(
				'arguments',
				`The function ${fn.name} is called with ${argumentsPhrase(args.length)}, but wants ${arityPhrase(min, max)}.`,
				span
			);
		const saved = this.#builtinSpan;
		this.#builtinSpan = span;
		try {
			return fn.spec.fn(args, this.#runtime);
		} catch (e) {
			if (e instanceof LispError && !e.span) e.span = span;
			throw e;
		} finally {
			this.#builtinSpan = saved;
		}
	}

	#enterClosure(fn: Closure, args: LispValue[], span: Span | undefined): void {
		if (this.#depth >= this.maxDepth)
			throw new LispError(
				'depth-limit',
				`Control stack exhausted: more than ${fmt(this.maxDepth)} nested function calls — is the recursion missing a base case?`,
				span
			);
		this.#depth++;
		if (this.#depth > this.#deepest) this.#deepest = this.#depth;
		const traced = fn.name !== null && (this.#traceAll || this.#traced.has(fn.name));
		const level = this.#traceDepth;
		if (traced) {
			this.#record({
				kind: 'call',
				depth: level,
				name: fn.name!,
				text: `(${fn.name}${args.map((a) => ` ${printValue(a, { maxLength: 300 })}`).join('')})`
			});
			this.#traceDepth++;
		}
		const frame: ReturnFrame = {
			k: 'return',
			fn,
			traced,
			level,
			mark: this.#dynamic.length,
			block: null
		};
		this.#stack.push(frame);
		const env = new Env(fn.env);
		this.#bindParams(fn, args, env, span);
		if (fn.blockName) {
			frame.block = { name: fn.blockName, active: true };
			env.block = frame.block;
		}
		this.#evalBody(fn.body, fn.bodySpans, 0, env, span);
	}

	/** Evaluates body forms from `start` as an implicit PROGN (the last one in tail position). */
	#evalBody(
		items: readonly LispValue[],
		spans: readonly (Span | undefined)[],
		start: number,
		env: Env | null,
		span: Span | undefined
	): void {
		let i = start;
		while (i < items.length && isDeclaration(items[i])) i++;
		if (i >= items.length) return this.#ret(NIL);
		if (i < items.length - 1) this.#stack.push({ k: 'body', items, spans, i, env, span });
		this.#evalNext(items[i], env, spans[i] ?? span);
	}

	/** Returns #value to the frame on top of the stack. */
	#resume(f: Frame, base: number): void {
		const stack = this.#stack;
		const value = this.#value;
		switch (f.k) {
			case 'args': {
				f.args.push(value);
				const rest = f.rest;
				if (rest.kind === 'cons') {
					f.rest = rest.cdr;
					return this.#evalNext(rest.car, f.env, this.#spans.car.get(rest) ?? f.span);
				}
				stack.pop();
				if (rest !== NIL)
					throw new LispError('syntax', `The function call ${show(f.form)} is malformed.`, f.span);
				return this.#call(f.fn, f.args, f.span);
			}
			case 'body': {
				const i = ++f.i;
				if (i === f.items.length - 1) stack.pop();
				return this.#evalNext(f.items[i], f.env, f.spans[i] ?? f.span);
			}
			case 'return':
				if (f.traced)
					this.#record({
						kind: 'return',
						depth: f.level,
						name: f.fn.name!,
						text: printValue(value, { maxLength: 300 })
					});
				stack.pop();
				this.#leave(f);
				return;
			case 'if': {
				stack.pop();
				const { items, spans } = f.a;
				if (truthy(value)) return this.#evalNext(items[1], f.env, spans[1] ?? f.span);
				if (items.length === 3) return this.#evalNext(items[2], f.env, spans[2] ?? f.span);
				return this.#ret(NIL);
			}
			case 'when':
				stack.pop();
				if (truthy(value) !== f.unless)
					return this.#evalBody(f.a.items, f.a.spans, 1, f.env, f.span);
				return this.#ret(NIL);
			case 'cond': {
				if (truthy(value)) {
					stack.pop();
					const c = f.clause!;
					if (c.items.length === 1) return this.#ret(value);
					return this.#evalBody(c.items, c.spans, 1, f.env, f.cspan);
				}
				f.i++;
				return this.#condNext(f);
			}
			case 'case': {
				stack.pop();
				return this.#caseClause(f.a, value, f.env, f.span);
			}
			case 'and':
				if (!truthy(value)) {
					stack.pop();
					return this.#ret(NIL);
				}
				f.i++;
				return this.#sequenceNext(f);
			case 'or':
				if (truthy(value)) {
					stack.pop();
					return this.#ret(value);
				}
				f.i++;
				return this.#sequenceNext(f);
			case 'prog1':
				if (f.i === 0) f.first = value;
				f.i++;
				if (f.i < f.a.items.length)
					return this.#evalNext(f.a.items[f.i], f.env, f.a.spans[f.i] ?? f.span);
				stack.pop();
				return this.#ret(f.first!);
			case 'let': {
				const b = f.bindings[f.i];
				if (f.star) this.#bind(f.inner, b.sym, value);
				else f.values.push(value);
				f.i++;
				return this.#letNext(f);
			}
			case 'unwind':
				stack.pop();
				this.#unwind(f.mark);
				return;
			case 'setq': {
				const place = f.a.items[f.i] as LispSymbol;
				this.#assign(place, value, f.env, f.a.spans[f.i] ?? f.span);
				f.i += 2;
				if (f.i < f.a.items.length)
					return this.#evalNext(f.a.items[f.i + 1], f.env, f.a.spans[f.i + 1] ?? f.span);
				stack.pop();
				return this.#ret(value);
			}
			case 'then':
				stack.pop();
				return this.#ret(f.then(value));
			case 'block':
				stack.pop();
				f.block.active = false;
				return;
			case 'exit':
				stack.pop();
				return this.#exitTo(f.block, value, base);
			case 'dolist':
			case 'dotimes':
				if (f.phase === 'source') {
					f.source = value;
					f.phase = 'body';
				} else if (f.phase === 'result') {
					stack.pop();
					this.#leave(f);
					return this.#ret(value);
				}
				return this.#loopNext(f);
		}
	}

	/** Cleans up after a frame that is left (normally or by an exit or error). */
	#leave(f: Frame): void {
		switch (f.k) {
			case 'return':
				this.#depth--;
				this.#traceDepth = f.level;
				this.#unwind(f.mark);
				if (f.block) f.block.active = false;
				return;
			case 'block':
				f.block.active = false;
				return;
			case 'let':
			case 'unwind':
				this.#unwind(f.mark);
				return;
			case 'dolist':
			case 'dotimes':
				f.block.active = false;
				this.#unwind(f.mark);
				return;
			default:
				return;
		}
	}

	/** Pops frames above `height`, cleaning up each (an error or exit unwinds through them). */
	#popTo(height: number): void {
		const stack = this.#stack;
		while (stack.length > height) this.#leave(stack.pop()!);
	}

	/** Index of the frame that established `block` (at or above `base`), or -1. */
	#findBlock(block: Block, base: number): number {
		const stack = this.#stack;
		for (let j = stack.length - 1; j >= base; j--) {
			const f = stack[j];
			if (
				(f.k === 'block' || f.k === 'return' || f.k === 'dolist' || f.k === 'dotimes') &&
				f.block === block
			)
				return j;
		}
		return -1;
	}

	/** RETURN-FROM: leaves the frames up to the block and returns `value` from it. */
	#exitTo(block: Block, value: LispValue, base: number): void {
		const j = this.#findBlock(block, base);
		// The block belongs to an enclosing machine: unwind to it by throwing.
		if (j < 0) throw new ReturnSignal(block, value);
		this.#exitAt(j, value);
	}

	#exitAt(j: number, value: LispValue): void {
		const f = this.#stack[j];
		// A function's block returns normally from the call (so TRACE shows the value).
		this.#popTo(f.k === 'return' ? j + 1 : j);
		this.#ret(value);
	}

	#lookup(sym: LispSymbol, env: Env | null, span: Span | undefined): LispValue {
		if (sym === NIL || sym === T || sym.name.startsWith(':')) return sym;
		if (!this.#specials.has(sym)) {
			for (let e = env; e; e = e.parent) {
				const v = e.vars.get(sym);
				if (v !== undefined) return v;
			}
		}
		const g = this.#globals.get(sym);
		if (g !== undefined) return g;
		throw new LispError('unbound-variable', `The variable ${sym.name} is unbound.`, span);
	}

	#assign(sym: LispSymbol, value: LispValue, env: Env | null, span: Span | undefined): void {
		this.#checkVariable(sym, span, 'assign to');
		if (!this.#specials.has(sym)) {
			for (let e = env; e; e = e.parent) {
				if (e.vars.has(sym)) {
					e.vars.set(sym, value);
					return;
				}
			}
		}
		this.#globals.set(sym, value);
	}

	/** Binds a variable in `env`, or dynamically when it is special (restored by #unwind). */
	#bind(env: Env, sym: LispSymbol, value: LispValue): void {
		if (this.#specials.has(sym)) {
			this.#dynamic.push({ symbol: sym, old: this.#globals.get(sym) });
			this.#globals.set(sym, value);
		} else {
			env.vars.set(sym, value);
		}
	}

	#unwind(mark: number): void {
		while (this.#dynamic.length > mark) {
			const { symbol, old } = this.#dynamic.pop()!;
			if (old === undefined) this.#globals.delete(symbol);
			else this.#globals.set(symbol, old);
		}
	}

	#checkVariable(v: LispValue, span: Span | undefined, what = 'bind'): asserts v is LispSymbol {
		if (v.kind !== 'symbol')
			throw new LispError(
				'syntax',
				`${show(v)} is not a symbol, so it cannot name a variable.`,
				span
			);
		if (v === NIL || v === T || v.name.startsWith(':'))
			throw new LispError('syntax', `${v.name} is a constant; you cannot ${what} it.`, span);
	}

	#undefinedFunction(sym: LispSymbol, span: Span | undefined): LispError {
		if (UNSUPPORTED_SET.has(sym.name))
			return new LispError(
				'unsupported',
				`${sym.name} is not supported by this evaluator (see the reference for what is).`,
				span
			);
		return new LispError('undefined-function', `The function ${sym.name} is undefined.`, span);
	}

	/** A function designator: a function, or a symbol naming a global function. */
	#designator(v: LispValue, span: Span | undefined): Fn {
		if (v.kind === 'function') return v as Fn;
		if (v.kind === 'symbol') {
			const fn = this.#functions.get(v) ?? BUILTIN_FUNCTIONS.get(v.name);
			if (fn) return fn;
			if (SPECIAL_SET.has(v.name))
				throw new LispError(
					'undefined-function',
					`${v.name} is a special operator, not a function, so it cannot be called with FUNCALL, APPLY or MAPCAR.`,
					span
				);
			throw this.#undefinedFunction(v, span);
		}
		throw typeError(v, '(OR FUNCTION SYMBOL)');
	}

	#bindParams(fn: Closure, args: LispValue[], env: Env, span: Span | undefined): void {
		const { required, optional, rest } = fn.lambda;
		const min = required.length;
		const max = rest ? null : min + optional.length;
		if (args.length < min || (max !== null && args.length > max)) {
			const name = fn.name ?? `(LAMBDA ${show(fn.params)})`;
			throw new LispError(
				'arguments',
				`The function ${name} is called with ${argumentsPhrase(args.length)}, but wants ${arityPhrase(min, max)}.`,
				span
			);
		}
		let i = 0;
		for (const p of required) this.#bind(env, p, args[i++]);
		for (const o of optional)
			this.#bind(env, o.name, i < args.length ? args[i++] : this.#eval(o.init, env, span));
		if (rest) this.#bind(env, rest, list(args.slice(i)));
	}

	// -------------------------------------------------------------------------
	// Special forms
	// -------------------------------------------------------------------------

	/** The elements of a list read from source, with their spans (cached per list). */
	#elements(x: LispValue, span: Span | undefined, what: string): Args {
		if (x.kind === 'cons') {
			const cached = this.#argsCache.get(x);
			if (cached) return cached;
		}
		const items: LispValue[] = [];
		const spans: (Span | undefined)[] = [];
		let c = x;
		while (c.kind === 'cons') {
			items.push(c.car);
			spans.push(this.#spans.car.get(c));
			c = c.cdr;
		}
		if (c !== NIL) throw new LispError('syntax', `${what} is not a proper list.`, span);
		const out = { items, spans };
		if (x.kind === 'cons') this.#argsCache.set(x, out);
		return out;
	}

	#need(name: string, a: Args, min: number, max: number | null, form: LispValue, span?: Span) {
		const n = a.items.length;
		if (n < min || (max !== null && n > max))
			throw new LispError(
				'syntax',
				`${name} takes ${arityPhrase(min, max)} argument${max === 1 && min === 1 ? '' : 's'}, but ${show(form)} has ${countPhrase(n)}.`,
				span
			);
	}

	#special(name: string, form: LispCons, env: Env | null, span: Span | undefined): void {
		const a = this.#elements(form.cdr, span, `The form ${show(form)}`);
		const need = (min: number, max: number | null) => this.#need(name, a, min, max, form, span);
		const next = (i: number) => this.#evalNext(a.items[i], env, a.spans[i] ?? span);
		const stack = this.#stack;
		switch (name) {
			case 'QUOTE':
				need(1, 1);
				return this.#ret(a.items[0]);
			case 'FUNCTION': {
				need(1, 1);
				const x = a.items[0];
				if (x.kind === 'cons' && x.car === LAMBDA)
					return this.#ret(this.#makeClosure(x.cdr, env, null, null, a.spans[0] ?? span));
				if (x.kind === 'symbol') return this.#ret(this.#designator(x, a.spans[0] ?? span));
				throw new LispError(
					'syntax',
					`FUNCTION needs a function name or a lambda expression, not ${show(x)}.`,
					span
				);
			}
			case 'LAMBDA':
				return this.#ret(this.#makeClosure(form.cdr, env, null, null, span));
			case 'IF':
				need(2, 3);
				stack.push({ k: 'if', a, env, span });
				return next(0);
			case 'WHEN':
			case 'UNLESS':
				need(1, null);
				stack.push({ k: 'when', unless: name === 'UNLESS', a, env, span });
				return next(0);
			case 'COND': {
				const f: CondFrame = { k: 'cond', a, i: 0, clause: null, cspan: span, env, span };
				stack.push(f);
				return this.#condNext(f);
			}
			case 'CASE':
				need(1, null);
				stack.push({ k: 'case', a, env, span });
				return next(0);
			case 'AND':
			case 'OR': {
				if (a.items.length === 0) return this.#ret(name === 'AND' ? T : NIL);
				const f: SequenceFrame = { k: name === 'AND' ? 'and' : 'or', a, i: 0, env, span };
				stack.push(f);
				return this.#sequenceNext(f);
			}
			case 'PROGN':
				return this.#evalBody(a.items, a.spans, 0, env, span);
			case 'PROG1':
				need(1, null);
				stack.push({ k: 'prog1', a, i: 0, first: null, env, span });
				return next(0);
			case 'LET':
			case 'LET*':
				need(1, null);
				return this.#startLet(name, a, env, span);
			case 'SETQ':
			case 'SETF':
				if (a.items.length % 2 !== 0)
					throw new LispError(
						'syntax',
						`${name} needs pairs of a variable and a value, but ${show(form)} has an odd number of arguments.`,
						span
					);
				for (let i = 0; i < a.items.length; i += 2)
					this.#checkPlace(name, a.items[i], a.spans[i] ?? span);
				if (a.items.length === 0) return this.#ret(NIL);
				stack.push({ k: 'setq', a, i: 0, env, span });
				return next(1);
			case 'INCF':
			case 'DECF': {
				need(1, 2);
				const place = a.items[0];
				const pspan = a.spans[0] ?? span;
				this.#checkPlace(name, place, pspan);
				const update = (delta: LispValue): LispValue => {
					const current = this.#lookup(place as LispSymbol, env, pspan);
					if (!isNumber(current)) throw located(typeError(current, 'NUMBER'), span);
					if (!isNumber(delta)) throw located(typeError(delta, 'NUMBER'), span);
					const value = name === 'INCF' ? add(current, delta) : sub(current, delta);
					this.#assign(place as LispSymbol, value, env, pspan);
					return value;
				};
				if (a.items.length === 1) return this.#ret(update(int(1)));
				stack.push({ k: 'then', then: update });
				return next(1);
			}
			case 'PUSH': {
				need(2, 2);
				const place = a.items[1];
				const pspan = a.spans[1] ?? span;
				this.#checkPlace(name, place, pspan);
				stack.push({
					k: 'then',
					then: (item) => {
						const value = cons(item, this.#lookup(place as LispSymbol, env, pspan));
						this.#assign(place as LispSymbol, value, env, pspan);
						return value;
					}
				});
				return next(0);
			}
			case 'POP': {
				need(1, 1);
				const place = a.items[0];
				const pspan = a.spans[0] ?? span;
				this.#checkPlace(name, place, pspan);
				const current = this.#lookup(place as LispSymbol, env, pspan);
				if (current === NIL) return this.#ret(NIL);
				if (current.kind !== 'cons') throw located(typeError(current, 'LIST'), span);
				this.#assign(place as LispSymbol, current.cdr, env, pspan);
				return this.#ret(current.car);
			}
			case 'DEFUN':
				return this.#ret(this.#defun(a, form, env, span));
			case 'DEFVAR':
			case 'DEFPARAMETER': {
				need(name === 'DEFVAR' ? 1 : 2, 3);
				const sym = a.items[0];
				this.#checkVariable(sym, a.spans[0] ?? span, 'define');
				this.#specials.add(sym);
				if (name === 'DEFVAR' && (a.items.length === 1 || this.#globals.has(sym)))
					return this.#ret(sym);
				stack.push({
					k: 'then',
					then: (value) => {
						this.#globals.set(sym, value);
						return sym;
					}
				});
				return next(1);
			}
			case 'DOLIST':
			case 'DOTIMES':
				need(1, null);
				return this.#startLoop(name, a, env, span);
			case 'BLOCK': {
				need(1, null);
				const label = a.items[0];
				if (label.kind !== 'symbol')
					throw new LispError('syntax', `The block name ${show(label)} is not a symbol.`, span);
				const inner = new Env(env);
				const block: Block = { name: label, active: true };
				inner.block = block;
				stack.push({ k: 'block', block });
				return this.#evalBody(a.items, a.spans, 1, inner, span);
			}
			case 'RETURN':
			case 'RETURN-FROM': {
				const from = name === 'RETURN-FROM';
				need(from ? 1 : 0, from ? 2 : 1);
				const label = from ? a.items[0] : NIL;
				if (label.kind !== 'symbol')
					throw new LispError('syntax', `The block name ${show(label)} is not a symbol.`, span);
				let block: Block | null = null;
				for (let e = env; e && !block; e = e.parent) if (e.block?.name === label) block = e.block;
				if (!block)
					throw new LispError(
						'control',
						from
							? `RETURN-FROM ${label.name}: there is no block named ${label.name} around it.`
							: 'RETURN is only allowed inside DOLIST, DOTIMES or (BLOCK NIL …).',
						span
					);
				if (!block.active)
					throw new LispError(
						'control',
						`${name} ${label.name}: the block has already been exited.`,
						span
					);
				const at = from ? 1 : 0;
				stack.push({ k: 'exit', block });
				if (a.items.length <= at) return this.#evalNext(NIL, env, span);
				return next(at);
			}
			case 'TRACE':
			case 'UNTRACE': {
				for (let i = 0; i < a.items.length; i++)
					if (a.items[i].kind !== 'symbol')
						throw new LispError(
							'syntax',
							`${name} takes function names, not ${show(a.items[i])}.`,
							a.spans[i] ?? span
						);
				const names = a.items as LispSymbol[];
				if (name === 'TRACE') {
					if (!names.length) return this.#ret(list([...this.#traced].map((n) => intern(n))));
					for (const s of names) this.#traced.add(s.name);
					return this.#ret(list(names));
				}
				if (!names.length) this.#traced.clear();
				for (const s of names) this.#traced.delete(s.name);
				return this.#ret(T);
			}
		}
		/* v8 ignore next */
		throw new LispError('internal', `Unknown special form ${name}.`, span);
	}

	#condNext(f: CondFrame): void {
		const { items, spans } = f.a;
		if (f.i >= items.length) {
			this.#stack.pop();
			return this.#ret(NIL);
		}
		const clause = items[f.i];
		const cspan = spans[f.i] ?? f.span;
		if (clause.kind !== 'cons')
			throw new LispError(
				'syntax',
				`COND clause ${show(clause)} is not a list of the form (test form …).`,
				cspan
			);
		f.clause = this.#elements(clause, cspan, `The COND clause ${show(clause)}`);
		f.cspan = cspan;
		this.#evalNext(f.clause.items[0], f.env, f.clause.spans[0] ?? cspan);
	}

	#caseClause(a: Args, key: LispValue, env: Env | null, span: Span | undefined): void {
		for (let i = 1; i < a.items.length; i++) {
			const clause = a.items[i];
			const cspan = a.spans[i] ?? span;
			if (clause.kind !== 'cons')
				throw new LispError(
					'syntax',
					`CASE clause ${show(clause)} is not a list of the form (keys form …).`,
					cspan
				);
			const c = this.#elements(clause, cspan, `The CASE clause ${show(clause)}`);
			const keys = c.items[0];
			const match =
				keys === T || keys === OTHERWISE
					? true
					: keys.kind === 'cons'
						? this.#elements(keys, cspan, 'The CASE keys').items.some((k) => eql(k, key))
						: keys !== NIL && eql(keys, key);
			if (match) return this.#evalBody(c.items, c.spans, 1, env, cspan);
		}
		return this.#ret(NIL);
	}

	/** AND / OR: evaluates item i (the last one in tail position). */
	#sequenceNext(f: SequenceFrame): void {
		const { items, spans } = f.a;
		if (f.i === items.length - 1) this.#stack.pop();
		this.#evalNext(items[f.i], f.env, spans[f.i] ?? f.span);
	}

	#checkPlace(name: string, place: LispValue, span: Span | undefined): void {
		if (place.kind === 'cons')
			throw new LispError(
				'unsupported',
				`${name} of ${show(place)} is not supported; ${name} works on variables only.`,
				span
			);
		this.#checkVariable(place, span, 'assign to');
	}

	#startLet(name: string, a: Args, env: Env | null, span: Span | undefined): void {
		const bspan = a.spans[0] ?? span;
		const specs = this.#elements(a.items[0], bspan, `The ${name} bindings ${show(a.items[0])}`);
		const bindings: Binding[] = [];
		for (let i = 0; i < specs.items.length; i++) {
			const b = specs.items[i];
			const sp = specs.spans[i] ?? bspan;
			if (b.kind === 'symbol') {
				this.#checkVariable(b, sp);
				bindings.push({ sym: b, init: null, span: sp });
				continue;
			}
			const parts =
				b.kind === 'cons' ? this.#elements(b, sp, `The ${name} binding ${show(b)}`) : null;
			if (!parts || parts.items.length < 1 || parts.items.length > 2)
				throw new LispError(
					'syntax',
					`The ${name} binding ${show(b)} is malformed: write (variable value) or variable.`,
					sp
				);
			this.#checkVariable(parts.items[0], parts.spans[0] ?? sp);
			bindings.push({
				sym: parts.items[0],
				init: parts.items.length === 2 ? parts.items[1] : null,
				span: parts.spans[1] ?? sp
			});
		}
		const f: LetFrame = {
			k: 'let',
			star: name === 'LET*',
			bindings,
			values: [],
			i: 0,
			inner: new Env(env),
			outer: env,
			a,
			mark: this.#dynamic.length,
			span
		};
		this.#stack.push(f);
		this.#letNext(f);
	}

	#letNext(f: LetFrame): void {
		const { bindings } = f;
		while (f.i < bindings.length && bindings[f.i].init === null) {
			if (f.star) this.#bind(f.inner, bindings[f.i].sym, NIL);
			else f.values.push(NIL);
			f.i++;
		}
		if (f.i < bindings.length) {
			const b = bindings[f.i];
			return this.#evalNext(b.init!, f.star ? f.inner : f.outer, b.span);
		}
		if (!f.star) bindings.forEach((b, i) => this.#bind(f.inner, b.sym, f.values[i]));
		const stack = this.#stack;
		stack.pop();
		// Special variables were bound: restore them when the body returns.
		if (this.#dynamic.length > f.mark) stack.push({ k: 'unwind', mark: f.mark });
		this.#evalBody(f.a.items, f.a.spans, 1, f.inner, f.span);
	}

	#startLoop(name: string, a: Args, env: Env | null, span: Span | undefined): void {
		const sspan = a.spans[0] ?? span;
		const spec = a.items[0];
		const s =
			spec.kind === 'cons' ? this.#elements(spec, sspan, `The ${name} specification`) : null;
		if (!s || s.items.length < 2 || s.items.length > 3)
			throw new LispError(
				'syntax',
				name === 'DOLIST'
					? `DOLIST needs (variable list [result]) first, not ${show(spec)}.`
					: `DOTIMES needs (variable count [result]) first, not ${show(spec)}.`,
				sspan
			);
		const v = s.items[0];
		this.#checkVariable(v, s.spans[0] ?? sspan);
		const outer = new Env(env);
		const block: Block = { name: NIL, active: true };
		outer.block = block;
		this.#stack.push({
			k: name === 'DOLIST' ? 'dolist' : 'dotimes',
			phase: 'source',
			variable: v,
			source: NIL,
			count: 0n,
			spec: s,
			a,
			outer,
			block,
			mark: this.#dynamic.length,
			span
		});
		this.#evalNext(s.items[1], env, s.spans[1] ?? sspan);
	}

	#loopNext(f: LoopFrame): void {
		this.#unwind(f.mark);
		const sspan = f.spec.spans[1] ?? f.span;
		let value: LispValue | null = null;
		if (f.k === 'dolist') {
			const x = f.source;
			if (x.kind === 'cons') {
				value = x.car;
				f.source = x.cdr;
			} else if (x !== NIL) throw located(typeError(x, 'LIST'), sspan);
		} else {
			const n = f.source;
			if (n.kind !== 'integer') throw located(typeError(n, 'INTEGER'), sspan);
			if (f.count < n.value) value = integer(f.count++);
		}
		if (value !== null) {
			if (++this.#steps > this.maxSteps)
				throw new LispError(
					'step-limit',
					`Stopped after ${fmt(this.maxSteps)} evaluation steps — is the recursion missing a base case?`,
					f.span
				);
			const inner = new Env(f.outer);
			this.#bind(inner, f.variable, value);
			return this.#evalBody(f.a.items, f.a.spans, 1, inner, f.span);
		}
		// Done: the result form sees the variable bound to NIL (DOLIST) or the count (DOTIMES).
		if (f.spec.items.length < 3) {
			this.#stack.pop();
			this.#leave(f);
			return this.#ret(NIL);
		}
		const inner = new Env(f.outer);
		const last =
			f.k === 'dolist'
				? NIL
				: f.source.kind === 'integer' && f.source.value > 0n
					? f.source
					: int(0);
		this.#bind(inner, f.variable, last);
		f.phase = 'result';
		this.#evalNext(f.spec.items[2], inner, f.spec.spans[2] ?? f.span);
	}

	#defun(a: Args, form: LispValue, env: Env | null, span: Span | undefined): LispValue {
		this.#need('DEFUN', a, 2, null, form, span);
		const name = a.items[0];
		const nspan = a.spans[0] ?? span;
		if (name.kind !== 'symbol' || name === NIL || name === T || name.name.startsWith(':'))
			throw new LispError('syntax', `${show(name)} cannot be the name of a function.`, nspan);
		const locked = lockedName(name.name);
		if (locked)
			throw new LispError(
				'syntax',
				`Lock on package COMMON-LISP violated when defining ${name.name} as a function: ${name.name} is ${locked}. Use another name, such as MY-${name.name}.`,
				nspan
			);
		const rest = (form as LispCons).cdr as LispCons;
		this.#functions.set(name, this.#makeClosure(rest.cdr, env, name.name, name, span));
		return name;
	}

	/** A closure from `(lambda-list . body)`. */
	#makeClosure(
		def: LispValue,
		env: Env | null,
		name: string | null,
		blockName: LispSymbol | null,
		span: Span | undefined
	): Closure {
		const what = name ? `DEFUN ${name}` : 'LAMBDA';
		if (def.kind !== 'cons')
			throw new LispError('syntax', `${what} needs a parameter list, such as (x y).`, span);
		const lambda = this.#lambdaList(def.car, this.#spans.car.get(def) ?? span, what);
		const body = this.#elements(def.cdr, span, `The body of ${what}`);
		let start = 0;
		// A documentation string (when more forms follow) is not evaluated.
		if (name && body.items.length > 1 && body.items[0].kind === 'string') start = 1;
		return Object.freeze({
			kind: 'function',
			name,
			builtin: false,
			params: def.car,
			lambda,
			body: body.items.slice(start),
			bodySpans: body.spans.slice(start),
			env,
			blockName
		}) as Closure;
	}

	#lambdaList(params: LispValue, span: Span | undefined, what: string): LambdaList {
		const p = this.#elements(params, span, `The parameter list ${show(params)} of ${what}`);
		const out: LambdaList = { required: [], optional: [], rest: null };
		let mode: 'required' | 'optional' | 'rest' | 'done' = 'required';
		const seen = new Set<LispSymbol>();
		const add = (sym: LispValue, sp: Span | undefined): LispSymbol => {
			this.#checkVariable(sym, sp);
			if (seen.has(sym))
				throw new LispError(
					'syntax',
					`The variable ${sym.name} occurs more than once in the parameter list of ${what}.`,
					sp
				);
			seen.add(sym);
			return sym;
		};
		for (let i = 0; i < p.items.length; i++) {
			const x = p.items[i];
			const sp = p.spans[i] ?? span;
			if (x.kind === 'symbol' && x.name.startsWith('&')) {
				if (x.name === '&OPTIONAL' && mode === 'required') mode = 'optional';
				else if ((x.name === '&REST' || x.name === '&BODY') && mode !== 'rest' && mode !== 'done')
					mode = 'rest';
				else if (['&OPTIONAL', '&REST', '&BODY'].includes(x.name))
					throw new LispError(
						'syntax',
						`${x.name} is misplaced in the parameter list of ${what}.`,
						sp
					);
				else
					throw new LispError(
						'unsupported',
						`${x.name} parameters are not supported (only &OPTIONAL and &REST).`,
						sp
					);
				continue;
			}
			if (mode === 'required') out.required.push(add(x, sp));
			else if (mode === 'optional') {
				if (x.kind === 'cons') {
					const o = this.#elements(x, sp, `The optional parameter ${show(x)}`);
					if (o.items.length > 2)
						throw new LispError(
							'unsupported',
							`Supplied-p parameters are not supported: ${show(x)}.`,
							sp
						);
					out.optional.push({ name: add(o.items[0], o.spans[0] ?? sp), init: o.items[1] ?? NIL });
				} else out.optional.push({ name: add(x, sp), init: NIL });
			} else if (mode === 'rest') {
				out.rest = add(x, sp);
				mode = 'done';
			} else
				throw new LispError(
					'syntax',
					`Only one variable can follow &REST in the parameter list of ${what}.`,
					sp
				);
		}
		if (mode === 'rest')
			throw new LispError(
				'syntax',
				`&REST needs a variable after it in the parameter list of ${what}.`,
				span
			);
		return out;
	}
}

function isDeclaration(x: LispValue): boolean {
	return x.kind === 'cons' && x.car === DECLARE;
}

function located(e: LispError, span: Span | undefined): LispError {
	if (!e.span) e.span = span;
	return e;
}

function countPhrase(n: number): string {
	return n === 0 ? 'none' : argumentsPhrase(n);
}

/** Why a name cannot be defined as a function (a built-in or Common Lisp operator), or null. */
export function lockedName(name: string): string | null {
	if (BUILTIN_FUNCTIONS.has(name)) return 'a built-in function';
	if (SPECIAL_SET.has(name)) return 'a special operator';
	if (UNSUPPORTED_SET.has(name)) return 'a Common Lisp operator';
	return null;
}

/** Evaluates `text` in a fresh interpreter. */
export function evaluate(text: string, options: RunOptions & InterpreterOptions = {}): RunResult {
	return new Interpreter(options).run(text, options);
}
