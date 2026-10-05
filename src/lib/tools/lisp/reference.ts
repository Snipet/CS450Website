/**
 * The reference card: every supported special form and function, grouped,
 * with examples (each example's result is checked against the evaluator in
 * the spec), and notes on how Common Lisp reads and prints.
 */
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_STEPS, FORMAT_DIRECTIVES } from '$lib/theory/lisp';

export interface ReferenceExample {
	code: string;
	/** The printed result. */
	result: string;
}

export interface ReferenceGroup {
	id: string;
	title: string;
	/** Names as written in code (lower case). */
	names: string[];
	examples: ReferenceExample[];
	/** A short plain note under the names. */
	note?: string;
}

export const REFERENCE: readonly ReferenceGroup[] = [
	{
		id: 'define',
		title: 'Definitions and variables',
		names: [
			'defun',
			'lambda',
			'defvar',
			'defparameter',
			'let',
			'let*',
			'setq',
			'setf',
			'incf',
			'decf',
			'push',
			'pop'
		],
		note: 'SETF, INCF, DECF, PUSH and POP work on variables only. DEFUN takes &optional and &rest parameters.',
		examples: [
			{ code: '(defun square (x) (* x x))', result: 'SQUARE' },
			{ code: '(let ((x 2) (y 3)) (* x y))', result: '6' },
			{ code: '(let* ((x 2) (y (+ x 1))) y)', result: '3' }
		]
	},
	{
		id: 'control',
		title: 'Conditionals and control',
		names: [
			'quote',
			'if',
			'cond',
			'case',
			'when',
			'unless',
			'and',
			'or',
			'not',
			'progn',
			'prog1',
			'dolist',
			'dotimes',
			'block',
			'return',
			'return-from'
		],
		examples: [
			{ code: "(if (> 3 2) 'yes 'no)", result: 'YES' },
			{ code: "(cond ((= 1 2) 'a) (t 'b))", result: 'B' },
			{ code: "(or nil 'x)", result: 'X' },
			{ code: "(dolist (x '(1 2 3) 'done))", result: 'DONE' }
		]
	},
	{
		id: 'lists',
		title: 'Lists',
		names: [
			'car',
			'cdr',
			'cons',
			'list',
			'list*',
			'append',
			'reverse',
			'length',
			'first',
			'second',
			'third',
			'fourth',
			'fifth',
			'sixth',
			'seventh',
			'eighth',
			'ninth',
			'tenth',
			'rest',
			'last',
			'butlast',
			'nth',
			'nthcdr',
			'member',
			'assoc',
			'remove',
			'copy-list',
			'sort',
			'nconc',
			'nreverse'
		],
		note: "cXr combinations up to four letters (cadr, cddr, caar, cdar, caddr, …). MEMBER, ASSOC and REMOVE compare with EQL unless given :test #'equal. NCONC and NREVERSE give the same results as APPEND and REVERSE (nothing is modified in place).",
		examples: [
			{ code: "(cons 'a '(b c))", result: '(A B C)' },
			{ code: "(append '(a) '(b) '(c))", result: '(A B C)' },
			{ code: "(member 'b '(a b c))", result: '(B C)' },
			{ code: "(assoc 'y '((x . 1) (y . 2)))", result: '(Y . 2)' },
			{ code: "(nth 1 '(a b c))", result: 'B' }
		]
	},
	{
		id: 'predicates',
		title: 'Predicates and equality',
		names: [
			'null',
			'atom',
			'listp',
			'consp',
			'endp',
			'numberp',
			'integerp',
			'rationalp',
			'floatp',
			'symbolp',
			'keywordp',
			'stringp',
			'functionp',
			'zerop',
			'plusp',
			'minusp',
			'evenp',
			'oddp',
			'eq',
			'eql',
			'equal'
		],
		note: 'EQ: the same object; EQL: also numbers of the same type and value; EQUAL: also lists and strings with equal contents.',
		examples: [
			{ code: "(atom '(a))", result: 'NIL' },
			{ code: "(eq '(a) '(a))", result: 'NIL' },
			{ code: "(equal '(a) '(a))", result: 'T' }
		]
	},
	{
		id: 'numbers',
		title: 'Numbers',
		names: [
			'+',
			'-',
			'*',
			'/',
			'=',
			'/=',
			'<',
			'>',
			'<=',
			'>=',
			'1+',
			'1-',
			'mod',
			'rem',
			'max',
			'min',
			'abs',
			'sqrt',
			'expt',
			'floor',
			'ceiling',
			'truncate',
			'round',
			'float',
			'gcd'
		],
		note: 'FLOOR, CEILING, TRUNCATE and ROUND return their first value (the quotient).',
		examples: [
			{ code: '(/ 7 2)', result: '7/2' },
			{ code: '(/ 7.0 2)', result: '3.5' },
			{ code: '(floor 7 2)', result: '3' },
			{ code: '(mod -7 3)', result: '2' },
			{ code: '(expt 2 64)', result: '18446744073709551616' }
		]
	},
	{
		id: 'functions',
		title: 'Functions as values',
		names: [
			'function',
			'funcall',
			'apply',
			'mapcar',
			'reduce',
			'remove-if',
			'remove-if-not',
			'every',
			'some',
			'identity',
			'eval'
		],
		examples: [
			{ code: "(mapcar #'(lambda (x) (* 2 x)) '(1 2 3))", result: '(2 4 6)' },
			{ code: "(funcall #'+ 1 2)", result: '3' },
			{ code: "(apply #'+ 1 '(2 3))", result: '6' },
			{ code: "(remove-if #'oddp '(1 2 3 4))", result: '(2 4)' }
		]
	},
	{
		id: 'output',
		title: 'Output and tracing',
		names: ['print', 'prin1', 'princ', 'terpri', 'fresh-line', 'format', 'trace', 'untrace'],
		note: `FORMAT takes T (write the text) or NIL (return it as a string) and the directives ${FORMAT_DIRECTIVES.join(' ')}. (trace f) records calls to F even with the trace switch off.`,
		examples: [
			{ code: '(format nil "~a is ~d" \'x 5)', result: '"X is 5"' },
			{ code: '(print 42)', result: '42' }
		]
	}
];

export const REFERENCE_NOTES: readonly string[] = [
	"Symbols are read without regard to case and print in upper case: (car '(a b)) prints A.",
	'NIL is both false and the empty list (); every other value counts as true, and T is the usual true value.',
	"'x is short for (quote x): the expression is returned as data, not evaluated.",
	'Integers have no size limit; / on integers gives a ratio such as 7/2; decimals are single floats (3.5, 0.33333334).',
	'Results print the way Common Lisp prints them: strings in double quotes, dotted pairs as (A . B), functions as #<FUNCTION NAME>.',
	'Built-in functions cannot be redefined (Common Lisp’s package lock): use names like MY-LENGTH.',
	`Each top-level form may take ${DEFAULT_MAX_STEPS.toLocaleString('en-US')} evaluation steps and ${DEFAULT_MAX_DEPTH.toLocaleString('en-US')} nested function calls.`,
	'Not supported: LOOP, DO, FLET and LABELS, macros, multiple values, characters, vectors, hash tables and structures.'
];
