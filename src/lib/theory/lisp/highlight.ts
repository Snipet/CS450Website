/**
 * Token classes for `CodeEditor` on Lisp text: comments, strings, numbers,
 * parentheses, quote and #', special forms in operator position (keywords),
 * built-in functions in operator position or after #', the name after DEFUN
 * (and DEFVAR, DEFPARAMETER), and the constants T, NIL and keywords.
 */
import type { HighlightToken } from '$lib/components/ui/types';
import { FUNCTION_NAMES, SPECIAL_FORMS } from './interpreter';
import { parseNumber } from './numbers';
import { tokenize, type Token } from './reader';

const SPECIAL = new Set(SPECIAL_FORMS);
const FUNCTIONS = new Set(FUNCTION_NAMES);
const DEFINERS = new Set(['DEFUN', 'DEFVAR', 'DEFPARAMETER']);

export function highlightLisp(text: string): HighlightToken[] {
	const out: HighlightToken[] = [];
	const add = (t: Token, className: string) => out.push({ from: t.start, to: t.end, className });
	let prev: Token | undefined;
	let prev2: Token | undefined;
	for (const t of tokenize(text)) {
		switch (t.kind) {
			case 'comment':
				add(t, 'hl-comment');
				continue;
			case 'lparen':
			case 'rparen':
				add(t, 'hl-paren');
				break;
			case 'quote':
			case 'function':
				add(t, 'hl-operator');
				break;
			case 'string':
				add(t, 'hl-string');
				break;
			case 'atom': {
				const upper = t.text.toUpperCase();
				const head = prev?.kind === 'lparen';
				if (parseNumber(t.text)) add(t, 'hl-number');
				else if (upper === 'T' || upper === 'NIL' || upper.startsWith(':')) add(t, 'hl-literal');
				else if (head && SPECIAL.has(upper)) add(t, 'hl-keyword');
				else if (
					prev?.kind === 'atom' &&
					prev2?.kind === 'lparen' &&
					DEFINERS.has(prev.text.toUpperCase())
				)
					add(t, 'hl-name');
				else if ((head || prev?.kind === 'function') && FUNCTIONS.has(upper)) add(t, 'hl-special');
				else if (upper.startsWith('&')) add(t, 'hl-keyword');
				break;
			}
			default:
				break;
		}
		prev2 = prev;
		prev = t;
	}
	return out;
}
