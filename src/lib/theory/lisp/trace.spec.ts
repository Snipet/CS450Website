import { describe, expect, it } from 'vitest';
import { evaluate } from './interpreter';
import {
	callStackAt,
	formatTrace,
	formatTraceLine,
	traceText,
	tracePartners,
	type TraceEntry
} from './trace';

const FACT = '(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1)))))';
const MY_LENGTH = '(defun my-length (lst) (if (null lst) 0 (+ 1 (my-length (cdr lst)))))';

const traced = (code: string) => evaluate(code, { trace: true });

describe('trace output (golden, as Common Lisp’s TRACE prints it)', () => {
	it('factorial', () => {
		expect(formatTrace(traced(`${FACT}\n(fact 3)`).trace)).toBe(
			[
				'0: (FACT 3)',
				'  1: (FACT 2)',
				'    2: (FACT 1)',
				'      3: (FACT 0)',
				'      3: FACT returned 1',
				'    2: FACT returned 1',
				'  1: FACT returned 2',
				'0: FACT returned 6'
			].join('\n')
		);
	});

	it('a recursive list function', () => {
		expect(formatTrace(traced(`${MY_LENGTH}\n(my-length '(a b c))`).trace)).toBe(
			[
				'0: (MY-LENGTH (A B C))',
				'  1: (MY-LENGTH (B C))',
				'    2: (MY-LENGTH (C))',
				'      3: (MY-LENGTH NIL)',
				'      3: MY-LENGTH returned 0',
				'    2: MY-LENGTH returned 1',
				'  1: MY-LENGTH returned 2',
				'0: MY-LENGTH returned 3'
			].join('\n')
		);
	});

	it('a helper with an accumulator, and a function called from MAPCAR', () => {
		const r = traced(`(defun rev (lst) (rev-acc lst nil))
(defun rev-acc (lst acc) (if (null lst) acc (rev-acc (cdr lst) (cons (car lst) acc))))
(rev '(a b))
(defun sq (x) (* x x))
(mapcar #'sq '(2 3))`);
		expect(formatTrace(r.trace)).toBe(
			[
				'0: (REV (A B))',
				'  1: (REV-ACC (A B) NIL)',
				'    2: (REV-ACC (B) (A))',
				'      3: (REV-ACC NIL (B A))',
				'      3: REV-ACC returned (B A)',
				'    2: REV-ACC returned (B A)',
				'  1: REV-ACC returned (B A)',
				'0: REV returned (B A)',
				'0: (SQ 2)',
				'0: SQ returned 4',
				'0: (SQ 3)',
				'0: SQ returned 9'
			].join('\n')
		);
	});

	it('prints arguments and values with PRIN1 (strings in quotes)', () => {
		const r = traced('(defun greet (name) (format nil "hi ~a" name)) (greet "Ada")');
		expect(formatTrace(r.trace)).toBe('0: (GREET "Ada")\n0: GREET returned "hi Ada"');
	});

	it('calls unwound by an error have no return line', () => {
		const r = traced("(defun bad (x) (if (null x) (car 'oops) (bad (cdr x)))) (bad '(1))");
		expect(formatTrace(r.trace)).toBe('0: (BAD (1))\n  1: (BAD NIL)');
		expect(r.forms[1].error?.message).toBe('The value OOPS is not of type LIST.');
	});

	it('RETURN-FROM returns normally from the traced function', () => {
		const r = traced('(defun f (x) (return-from f (* x 2)) 0) (f 4)');
		expect(formatTrace(r.trace)).toBe('0: (F 4)\n0: F returned 8');
	});

	it('records nothing without tracing; lambdas are never traced', () => {
		expect(evaluate(`${FACT} (fact 3)`).trace).toEqual([]);
		expect(traced("(mapcar (lambda (x) x) '(1 2))").trace).toEqual([]);
	});

	it('stops recording at the line limit while evaluation goes on', () => {
		const r = evaluate(`${FACT} (fact 10)`, { trace: true, maxTraceLines: 5 });
		expect(r.trace).toHaveLength(5);
		expect(r.traceTruncated).toBe(true);
		expect(r.forms[1].printed).toBe('3628800');
	});
});

describe('trace helpers', () => {
	const entries: TraceEntry[] = traced(`${FACT}\n(fact 2)`).trace;

	it('formats one line with and without indentation', () => {
		expect(traceText(entries[1])).toBe('1: (FACT 1)');
		expect(formatTraceLine(entries[1])).toBe('  1: (FACT 1)');
		expect(formatTraceLine(entries[4])).toBe('  1: FACT returned 1');
	});

	it('pairs calls with returns', () => {
		// 0 call 2, 1 call 1, 2 call 0, 3 ret, 4 ret, 5 ret
		expect(tracePartners(entries)).toEqual([5, 4, 3, 2, 1, 0]);
		const broken = traced(
			"(defun bad (x) (if (null x) (car 'oops) (bad (cdr x)))) (bad '(1)) (bad nil)"
		).trace;
		expect(tracePartners(broken)).toEqual([-1, -1, -1]);
	});

	it('lists the calls in progress at a line', () => {
		expect(callStackAt(entries, 0)).toEqual([0]);
		expect(callStackAt(entries, 2)).toEqual([0, 1, 2]);
		expect(callStackAt(entries, 3)).toEqual([0, 1, 2]);
		expect(callStackAt(entries, 4)).toEqual([0, 1]);
		expect(callStackAt(entries, 5)).toEqual([0]);
		const two = traced('(defun sq (x) (* x x)) (sq 1) (sq 2)').trace;
		expect(callStackAt(two, 2)).toEqual([2]);
	});
});
