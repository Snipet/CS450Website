/**
 * The Lisp reader: text to data, with a span for every datum.
 *
 * - Integers (`42`, `-7`), ratios (`1/2`), decimals (`3.14`, `.5`, `1e3`),
 *   strings (`"a \"b\""`), symbols (case-insensitive: `foo` reads as FOO),
 *   keywords (`:test`).
 * - Lists `(a b c)`, dotted pairs `(a . b)`, `()` (NIL).
 * - `'x` reads as `(QUOTE X)` and `#'f` as `(FUNCTION F)`.
 * - Comments: `;` to the end of the line and `#| … |#` (nestable).
 *
 * Problems are diagnostics with spans (an unclosed `(` is reported at the
 * parenthesis); nothing is thrown. Spans of list forms and of each list
 * element are recorded in a `SpanTable` so the evaluator can point at the
 * form an error came from.
 */
import type { Diagnostic, Span } from '../diagnostics';
import { parseNumber } from './numbers';
import { NIL, cons, intern, lispString, type LispCons, type LispValue } from './types';

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

export type TokenKind =
	'lparen' | 'rparen' | 'quote' | 'function' | 'string' | 'atom' | 'comment' | 'unsupported';

export interface Token {
	kind: TokenKind;
	start: number;
	end: number;
	/** Atoms: the text; strings: the contents with escapes resolved. */
	text: string;
	/** Problems found while scanning (unterminated string or comment, unsupported syntax). */
	error?: string;
}

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';
/** Characters that end an atom. */
const TERMINATING = new Set(['(', ')', "'", '"', ';', '`', ',']);

/** Splits Lisp text into tokens (whitespace dropped, comments kept). */
export function tokenize(text: string): Token[] {
	const out: Token[] = [];
	const n = text.length;
	let i = 0;
	while (i < n) {
		const c = text[i];
		if (isSpace(c)) {
			i++;
			continue;
		}
		const start = i;
		if (c === ';') {
			while (i < n && text[i] !== '\n') i++;
			out.push({ kind: 'comment', start, end: i, text: text.slice(start, i) });
			continue;
		}
		if (c === '#' && text[i + 1] === '|') {
			let depth = 1;
			i += 2;
			while (i < n && depth > 0) {
				if (text[i] === '|' && text[i + 1] === '#') {
					depth--;
					i += 2;
				} else if (text[i] === '#' && text[i + 1] === '|') {
					depth++;
					i += 2;
				} else i++;
			}
			const tok: Token = { kind: 'comment', start, end: i, text: text.slice(start, i) };
			if (depth > 0) tok.error = 'Unterminated #| comment: missing |#.';
			out.push(tok);
			continue;
		}
		if (c === '(' || c === ')') {
			out.push({ kind: c === '(' ? 'lparen' : 'rparen', start, end: i + 1, text: c });
			i++;
			continue;
		}
		if (c === "'") {
			out.push({ kind: 'quote', start, end: i + 1, text: c });
			i++;
			continue;
		}
		if (c === '#' && text[i + 1] === "'") {
			out.push({ kind: 'function', start, end: i + 2, text: "#'" });
			i += 2;
			continue;
		}
		if (c === '"') {
			let value = '';
			i++;
			let closed = false;
			while (i < n) {
				const d = text[i];
				if (d === '\\' && i + 1 < n) {
					value += text[i + 1];
					i += 2;
				} else if (d === '"') {
					closed = true;
					i++;
					break;
				} else {
					value += d;
					i++;
				}
			}
			const tok: Token = { kind: 'string', start, end: i, text: value };
			if (!closed) tok.error = 'Unterminated string: missing the closing ".';
			out.push(tok);
			continue;
		}
		if (c === '`' || c === ',') {
			const at = c === ',' && text[i + 1] === '@';
			i += at ? 2 : 1;
			out.push({
				kind: 'unsupported',
				start,
				end: i,
				text: text.slice(start, i),
				error:
					c === '`'
						? 'Backquote (`) is not supported; build lists with LIST and CONS.'
						: 'A comma is only meaningful inside a backquote, which is not supported.'
			});
			continue;
		}
		if (c === '#') {
			// #\char, #(vector), #x… and other dispatching syntax.
			i++;
			if (text[i] === '\\') {
				i += 2;
				while (i < n && !isSpace(text[i]) && !TERMINATING.has(text[i])) i++;
			} else {
				while (i < n && !isSpace(text[i]) && !TERMINATING.has(text[i])) i++;
			}
			const written = text.slice(start, i);
			out.push({
				kind: 'unsupported',
				start,
				end: i,
				text: written,
				error: written.startsWith('#\\')
					? `Characters (${written}) are not supported; use strings or symbols.`
					: `The syntax ${written || '#'} is not supported.`
			});
			continue;
		}
		// An atom: a number or a symbol.
		let bar = false;
		while (i < n && !isSpace(text[i]) && !TERMINATING.has(text[i])) {
			if (text[i] === '|' || text[i] === '\\') bar = true;
			i++;
		}
		const atom = text.slice(start, i);
		const tok: Token = { kind: 'atom', start, end: i, text: atom };
		if (bar) tok.error = `Escaped symbol names (${atom}) are not supported.`;
		out.push(tok);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

/** Where list forms and their elements came from. */
export interface SpanTable {
	/** Span of a whole list form, keyed by its first cons. */
	form: WeakMap<LispCons, Span>;
	/** Span of each list element, keyed by the cons whose car it is. */
	car: WeakMap<LispCons, Span>;
}

export const createSpanTable = (): SpanTable => ({ form: new WeakMap(), car: new WeakMap() });

export interface ReadForm {
	datum: LispValue;
	span: Span;
}

export interface ReadResult {
	forms: ReadForm[];
	diagnostics: Diagnostic[];
}

export interface ReadOptions {
	/** `span.source` for every span (default null: the tool's main text). */
	source?: string | null;
	/** Table to record spans in (default: a new one). */
	spans?: SpanTable;
}

interface Item {
	datum: LispValue;
	span: Span;
}

interface Frame {
	/** Offset of the `(` (top level: -1). */
	open: number;
	items: Item[];
	/** Index in `items` of the element after the dot, when a dot was read. */
	dot: number | null;
	dotStart: number;
	/** Quote and #' prefixes waiting for their datum. */
	prefixes: Token[];
}

/** Interprets an atom's text: a number or an interned (upper-cased) symbol. */
export function atomValue(text: string): LispValue | { error: string } {
	const num = parseNumber(text);
	if (num) return num;
	if (/^\.+$/.test(text)) return { error: 'A dot can only appear inside a list, as in (A . B).' };
	const upper = text.toUpperCase();
	const colon = upper.indexOf(':');
	if (colon > 0)
		return { error: `Package prefixes (${text}) are not supported; write the symbol without one.` };
	if (colon === 0 && (upper.length === 1 || upper.indexOf(':', 1) !== -1))
		return { error: `${text} is not a valid keyword.` };
	return intern(upper);
}

/** Reads every top-level datum of `text`. */
export function readAll(text: string, options: ReadOptions = {}): ReadResult {
	const source = options.source ?? null;
	const spans = options.spans ?? createSpanTable();
	const diagnostics: Diagnostic[] = [];
	const forms: ReadForm[] = [];
	const span = (start: number, end: number): Span => ({ start, end, source });
	const error = (message: string, start: number, end: number) =>
		diagnostics.push({ severity: 'error', message, span: span(start, end) });

	const top: Frame = { open: -1, items: [], dot: null, dotStart: -1, prefixes: [] };
	const stack: Frame[] = [top];

	/** Adds a finished datum to the innermost frame, applying waiting prefixes. */
	function push(item: Item) {
		const frame = stack[stack.length - 1];
		let { datum, span: sp } = item;
		while (frame.prefixes.length) {
			const p = frame.prefixes.pop()!;
			const inner = cons(datum, NIL);
			spans.car.set(inner, sp);
			const outer = cons(intern(p.kind === 'quote' ? 'QUOTE' : 'FUNCTION'), inner);
			spans.car.set(outer, span(p.start, p.end));
			sp = span(p.start, sp.end);
			spans.form.set(outer, sp);
			datum = outer;
		}
		if (frame === top) {
			forms.push({ datum, span: sp });
			return;
		}
		if (frame.dot !== null && frame.items.length > frame.dot) {
			error('More than one object follows . in a list.', sp.start, sp.end);
			return;
		}
		frame.items.push({ datum, span: sp });
	}

	const tokens = tokenize(text);
	for (const tok of tokens) {
		if (tok.error) error(tok.error, tok.start, tok.end);
		switch (tok.kind) {
			case 'comment':
				break;
			case 'unsupported':
				break;
			case 'quote':
			case 'function':
				stack[stack.length - 1].prefixes.push(tok);
				break;
			case 'lparen':
				stack.push({ open: tok.start, items: [], dot: null, dotStart: -1, prefixes: [] });
				break;
			case 'rparen': {
				if (stack.length === 1) {
					error('Unmatched ): there is no ( for it to close.', tok.start, tok.end);
					break;
				}
				const frame = stack.pop()!;
				for (const p of frame.prefixes)
					error(`Nothing follows ${p.text} before the ).`, p.start, p.end);
				let datum: LispValue = NIL;
				if (frame.dot !== null) {
					if (frame.items.length === frame.dot) {
						error('Nothing appears after . in the list.', frame.dotStart, frame.dotStart + 1);
					} else {
						datum = frame.items.pop()!.datum;
					}
				}
				const listSpan = span(frame.open, tok.end);
				let first: LispCons | null = null;
				for (let k = frame.items.length - 1; k >= 0; k--) {
					const cell = cons(frame.items[k].datum, datum);
					spans.car.set(cell, frame.items[k].span);
					datum = cell;
					first = cell;
				}
				if (first) spans.form.set(first, listSpan);
				push({ datum, span: listSpan });
				break;
			}
			case 'string':
				push({ datum: lispString(tok.text), span: span(tok.start, tok.end) });
				break;
			case 'atom': {
				const frame = stack[stack.length - 1];
				if (tok.text === '.' && frame !== top) {
					if (frame.prefixes.length) {
						error('A dot cannot follow a quote.', tok.start, tok.end);
					} else if (frame.dot !== null) {
						error('More than one dot in a list.', tok.start, tok.end);
					} else if (frame.items.length === 0) {
						error('Nothing appears before . in the list.', tok.start, tok.end);
					} else {
						frame.dot = frame.items.length;
						frame.dotStart = tok.start;
					}
					break;
				}
				if (tok.error) {
					push({ datum: NIL, span: span(tok.start, tok.end) });
					break;
				}
				const value = atomValue(tok.text);
				if ('error' in value) {
					error(value.error, tok.start, tok.end);
					push({ datum: NIL, span: span(tok.start, tok.end) });
				} else {
					push({ datum: value, span: span(tok.start, tok.end) });
				}
				break;
			}
		}
	}

	if (stack.length > 1) {
		const outer = stack[1];
		const missing = stack.length - 1;
		error(
			missing === 1
				? 'This ( is never closed: one ) is missing.'
				: `This ( is never closed: ${missing} ) are missing (the last one opened at line ${lineOf(text, stack[stack.length - 1].open)}).`,
			outer.open,
			outer.open + 1
		);
	}
	for (const p of top.prefixes) error(`Nothing follows ${p.text}.`, p.start, p.end);

	return { forms, diagnostics };
}

const lineOf = (text: string, offset: number) => text.slice(0, offset).split('\n').length;

/**
 * Reads exactly one datum (an answer typed as Lisp data). Empty text, more
 * than one datum, and reading problems give diagnostics and a null datum.
 */
export function readOne(
	text: string,
	options: ReadOptions = {}
): { datum: LispValue | null; diagnostics: Diagnostic[] } {
	const { forms, diagnostics } = readAll(text, options);
	if (diagnostics.some((d) => d.severity === 'error')) return { datum: null, diagnostics };
	if (forms.length === 0)
		return { datum: null, diagnostics: [{ severity: 'error', message: 'Nothing to read.' }] };
	if (forms.length > 1)
		return {
			datum: null,
			diagnostics: [
				{
					severity: 'error',
					message: `Expected one object but read ${forms.length}; wrap several in a list.`,
					span: { start: forms[1].span.start, end: text.length, source: options.source ?? null }
				}
			]
		};
	return { datum: forms[0].datum, diagnostics };
}
