import { describe, expect, it } from 'vitest';
import {
	ATTEMPT_SOURCE,
	checkAnswer,
	checkWrite,
	runInterpret,
	summarizeWrite,
	symbolsIn
} from './check';
import { readAll } from '$lib/theory/lisp';
import type { InterpretExercise, WriteExercise } from './exercises';

const interpret = (prompts: string[], setup = ''): InterpretExercise => ({
	id: 'read-test',
	mode: 'interpret',
	title: 'Test',
	setup,
	prompts: prompts.map((expr) => ({ expr, answer: '' })),
	note: ''
});

const LENGTH: WriteExercise = {
	id: 'write-test',
	mode: 'write',
	title: 'Length',
	name: 'MY-LENGTH',
	description: '(my-length lst)',
	starter: '(defun my-length (lst) nil)',
	tests: [
		{ call: "(my-length '())", expected: '0' },
		{ call: "(my-length '(a b))", expected: '2' }
	],
	solution: '',
	forbid: ['LENGTH'],
	require: ['NULL']
};

describe('checkAnswer', () => {
	const [list, quoted, err, str] = runInterpret(
		interpret(["(list 'a '(b c))", "''a", "(car 'x)", '"Hi"'])
	).prompts;

	it('compares as Lisp data: spacing and case do not matter', () => {
		expect(checkAnswer('(A (B C))', list).status).toBe('correct');
		expect(checkAnswer('  ( a   ( b c ) ) ', list).status).toBe('correct');
		expect(checkAnswer('(a b c)', list)).toEqual({
			status: 'incorrect',
			message: 'Not the result.'
		});
	});

	it('notes a leading quote', () => {
		expect(checkAnswer("'(a (b c))", list)).toEqual({
			status: 'incorrect',
			message: "Printed results have no leading quote: write the value without the '."
		});
		expect(checkAnswer("'a", quoted).status).toBe('correct');
		expect(checkAnswer('(quote a)', quoted).status).toBe('correct');
	});

	it('accepts "error" for an expression that signals one', () => {
		expect(err.error).toBe('The value X is not of type LIST.');
		expect(checkAnswer('error', err).status).toBe('correct');
		expect(checkAnswer('ERROR', err).status).toBe('correct');
		expect(checkAnswer('nil', err).status).toBe('incorrect');
		expect(checkAnswer('error', list)).toEqual({
			status: 'incorrect',
			message: 'Not the result: it returns a value.'
		});
	});

	it('compares strings by contents (case-sensitive)', () => {
		expect(checkAnswer('"Hi"', str).status).toBe('correct');
		expect(checkAnswer('"hi"', str).status).toBe('incorrect');
	});

	it('reports empty and unreadable answers', () => {
		expect(checkAnswer('  ', list).status).toBe('empty');
		expect(checkAnswer('(a (b c)', list)).toEqual({
			status: 'unreadable',
			message: 'Not readable as Lisp data: This ( is never closed: one ) is missing.'
		});
		expect(checkAnswer('a b', list).status).toBe('unreadable');
	});
});

describe('runInterpret', () => {
	it('evaluates prompts after the setup, with output and trace', () => {
		const run = runInterpret(interpret(['(f 2)'], '(defun f (x) (print x) (* x 10))'));
		expect(run.prompts[0]).toMatchObject({ printed: '20', error: null, output: '\n2 ' });
		expect(run.prompts[0].trace.map((t) => t.text)).toEqual(['(F 2)', '20']);
	});

	it('reports a prompt that cannot be read', () => {
		const run = runInterpret(interpret(['(car']));
		expect(run.prompts[0].error).toBe('This ( is never closed: one ) is missing.');
	});
});

describe('checkWrite', () => {
	it('runs the tests and reports values, errors and passes', () => {
		const check = checkWrite(
			LENGTH,
			'(defun my-length (lst) (if (null lst) 0 (+ 1 (my-length (cdr lst)))))'
		);
		expect(check.tests.map((t) => [t.printed, t.pass])).toEqual([
			['0', true],
			['2', true]
		]);
		expect(check.complete).toBe(true);
		expect(summarizeWrite(LENGTH, check)).toBe('All 2 tests pass.');
	});

	it('reports excluded and missing built-ins', () => {
		const check = checkWrite(LENGTH, '(defun my-length (lst) (length lst))');
		expect(check.passed).toBe(2);
		expect(check.forbidden).toEqual(['LENGTH']);
		expect(check.missing).toEqual(['NULL']);
		expect(check.complete).toBe(false);
		expect(summarizeWrite(LENGTH, check)).toBe(
			'All 2 tests pass. The code uses LENGTH, which this exercise excludes. The code does not use NULL.'
		);
	});

	it('reports errors in the code at their location', () => {
		const code = '(defun my-length (lst) (+ 1 (car lst)))';
		const check = checkWrite(LENGTH, code);
		expect(check.tests.map((t) => t.error)).toEqual([
			'The value NIL is not of type NUMBER.',
			'The value A is not of type NUMBER.'
		]);
		expect(check.diagnostics.map((d) => [d.message, d.span?.source])).toEqual([
			['The value NIL is not of type NUMBER.', ATTEMPT_SOURCE],
			['The value A is not of type NUMBER.', ATTEMPT_SOURCE]
		]);
		const d = check.diagnostics[0].span!;
		expect(code.slice(d.start, d.end)).toBe('(+ 1 (car lst))');
	});

	it('reports a missing definition and reading errors', () => {
		const none = checkWrite(LENGTH, '(defun other (x) x)');
		expect(none.defined).toBe(false);
		expect(none.tests[0].error).toBe('The function MY-LENGTH is undefined.');
		expect(summarizeWrite(LENGTH, none)).toBe(
			'0 of 2 tests pass. The code does not define MY-LENGTH. The code does not use NULL.'
		);
		const broken = checkWrite(LENGTH, '(defun my-length (lst)');
		expect(broken.read).toBe(false);
		expect(broken.tests).toEqual([]);
		expect(summarizeWrite(LENGTH, broken)).toBe(
			'The code has reading errors (listed under the editor); no tests were run.'
		);
	});

	it('stops runaway code at the limits', () => {
		const check = checkWrite(LENGTH, '(defun my-length (lst) (my-length lst))');
		expect(check.tests[0].error).toMatch(/Control stack exhausted/);
	});
});

describe('symbolsIn', () => {
	it('collects every symbol name', () => {
		const names = symbolsIn(readAll("(defun f (x) (mapcar #'car '(x)))").forms.map((f) => f.datum));
		expect([...names].sort()).toEqual([
			'CAR',
			'DEFUN',
			'F',
			'FUNCTION',
			'MAPCAR',
			'NIL',
			'QUOTE',
			'X'
		]);
	});
});
