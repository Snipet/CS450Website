import { describe, expect, it } from 'vitest';
import { evaluate, highlightLisp } from '$lib/theory/lisp';
import {
	codeSegments,
	describeTraceLine,
	displayOutput,
	oneLine,
	summarizeRun,
	traceGroups
} from './view';

describe('Lisp view helpers', () => {
	it('oneLine collapses whitespace and cuts long text', () => {
		expect(oneLine('(defun f (x)\n   (* x x))')).toBe('(defun f (x) (* x x))');
		expect(oneLine('abcdefghij', 5)).toBe('abcd…');
	});

	it('displayOutput drops PRINT’s leading newline', () => {
		expect(displayOutput('\n3 ')).toBe('3 ');
		expect(displayOutput('x\n')).toBe('x\n');
	});

	it('summarizeRun counts values and errors', () => {
		expect(summarizeRun(evaluate("(+ 1 2) (car 'a)"))).toBe('Evaluated 2 forms: 1 value, 1 error.');
		expect(summarizeRun(evaluate('1'))).toBe('Evaluated 1 form: 1 value, 0 errors.');
		expect(summarizeRun(evaluate(''))).toBe('Nothing to evaluate.');
		expect(summarizeRun(evaluate('(a'))).toBe('Not run: the code has 1 reading error.');
	});

	it('groups the trace by form and labels lines', () => {
		const run = evaluate('(defun sq (x) (* x x)) (sq 2) (+ 1 2) (sq 3)', { trace: true });
		expect(traceGroups(run)).toEqual([
			{ form: 1, text: '(sq 2)', start: 0, end: 2 },
			{ form: 3, text: '(sq 3)', start: 2, end: 4 }
		]);
		expect(describeTraceLine(run.trace, 0)).toBe('Depth 0: call (SQ 2)');
		expect(describeTraceLine(run.trace, 1)).toBe('Depth 0: SQ returned 4');
		expect(describeTraceLine(run.trace, 9)).toBe('No calls traced.');
	});

	it('codeSegments splits text into highlighted runs', () => {
		const text = "(car 'x)";
		expect(codeSegments(text, highlightLisp(text))).toEqual([
			{ text: '(', className: 'hl-paren' },
			{ text: 'car', className: 'hl-special' },
			{ text: ' ' },
			{ text: "'", className: 'hl-operator' },
			{ text: 'x' },
			{ text: ')', className: 'hl-paren' }
		]);
		expect(codeSegments('ab', [])).toEqual([{ text: 'ab' }]);
	});
});
