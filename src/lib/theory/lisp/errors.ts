/**
 * Errors signalled while evaluating Lisp. They are thrown inside the
 * evaluator only and always caught by `Interpreter.run` (or the other entry
 * points), which turn them into error results and diagnostics; they never
 * reach callers.
 */
import type { Span } from '../diagnostics';

export type LispErrorKind =
	| 'unbound-variable'
	| 'undefined-function'
	| 'type-error'
	| 'arguments'
	| 'division-by-zero'
	| 'arithmetic'
	| 'syntax'
	| 'step-limit'
	| 'depth-limit'
	| 'unsupported'
	| 'control'
	| 'internal';

export class LispError extends Error {
	readonly kind: LispErrorKind;
	/** Where the error was signalled (the innermost form with a known location). */
	span: Span | undefined;

	constructor(kind: LispErrorKind, message: string, span?: Span) {
		super(message);
		this.name = 'LispError';
		this.kind = kind;
		this.span = span;
	}
}

const WORDS = [
	'zero',
	'one',
	'two',
	'three',
	'four',
	'five',
	'six',
	'seven',
	'eight',
	'nine',
	'ten'
];

/** "one", "two", … "ten", then digits (as SBCL words argument counts). */
export const countWord = (n: number): string => WORDS[n] ?? n.toLocaleString('en-US');

/** "one argument", "two arguments". */
export const argumentsPhrase = (n: number): string =>
	`${countWord(n)} argument${n === 1 ? '' : 's'}`;

/** "exactly one", "at least two", "between one and three", "at most two". */
export function arityPhrase(min: number, max: number | null): string {
	if (max === min) return `exactly ${countWord(min)}`;
	if (max === null) return `at least ${countWord(min)}`;
	if (min === 0) return `at most ${countWord(max)}`;
	return `between ${countWord(min)} and ${countWord(max)}`;
}
