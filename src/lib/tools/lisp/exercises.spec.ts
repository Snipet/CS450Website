import { describe, expect, it } from 'vitest';
import { readAll } from '$lib/theory/lisp';
import { checkWrite, runInterpret } from './check';
import {
	EXERCISES,
	INTERPRET_EXERCISES,
	WRITE_EXERCISES,
	exerciseById,
	exercisesFor
} from './exercises';

describe('exercise catalog', () => {
	it('has at least ten exercises of each kind with unique ids', () => {
		expect(INTERPRET_EXERCISES.length).toBeGreaterThanOrEqual(10);
		expect(WRITE_EXERCISES.length).toBeGreaterThanOrEqual(10);
		const ids = EXERCISES.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const e of INTERPRET_EXERCISES) expect(e.id).toMatch(/^read-[a-z-]+$/);
		for (const e of WRITE_EXERCISES) expect(e.id).toMatch(/^write-[a-z-]+$/);
		expect(exerciseById('write-flatten')?.mode).toBe('write');
		expect(exerciseById('nope')).toBeUndefined();
		expect(exercisesFor('interpret')).toBe(INTERPRET_EXERCISES);
		expect(exercisesFor('write')).toBe(WRITE_EXERCISES);
	});

	it('pins the exercise ids (other pages link to them)', () => {
		expect(EXERCISES.map((e) => e.id)).toEqual([
			'read-car-cdr',
			'read-cons-list-append',
			'read-dotted-pairs',
			'read-quote',
			'read-predicates',
			'read-cond',
			'read-count-items',
			'read-sum-positives',
			'read-reverse',
			'read-nested-lists',
			'read-mapcar',
			'read-let',
			'read-closures',
			'read-accumulator',
			'read-print',
			'read-errors',
			'write-my-length',
			'write-sum-list',
			'write-factorial',
			'write-fibonacci',
			'write-my-reverse',
			'write-my-member',
			'write-last-element',
			'write-remove-all',
			'write-count-occurrences',
			'write-square-all',
			'write-max-list',
			'write-count-atoms',
			'write-flatten',
			'write-insert-sorted',
			'write-my-append'
		]);
	});
});

describe('Interpret exercises', () => {
	it.each(INTERPRET_EXERCISES.map((e) => [e.id, e] as const))(
		'%s: every answer is what the evaluator prints',
		(_id, exercise) => {
			const run = runInterpret(exercise);
			expect(run.setup.diagnostics).toEqual([]);
			expect(run.setup.forms.every((f) => !f.error)).toBe(true);
			expect(run.prompts.map((p) => (p.error ? 'error' : p.printed))).toEqual(
				exercise.prompts.map((p) => p.answer)
			);
		}
	);

	it('trace the calls to the exercise’s functions', () => {
		const run = runInterpret(
			exerciseById('read-count-items') as (typeof INTERPRET_EXERCISES)[number]
		);
		expect(run.prompts[0].trace.map((t) => t.kind)).toEqual([
			'call',
			'call',
			'call',
			'call',
			'return',
			'return',
			'return',
			'return'
		]);
		const print = runInterpret(exerciseById('read-print') as (typeof INTERPRET_EXERCISES)[number]);
		expect(print.prompts[0].output).toBe('\n3 ');
		expect(print.prompts[1].output).toBe('\n1 \n2 ');
	});
});

describe('Write exercises', () => {
	it.each(WRITE_EXERCISES.map((e) => [e.id, e] as const))(
		'%s: the reference solution passes its own tests',
		(_id, exercise) => {
			const check = checkWrite(exercise, exercise.solution);
			expect(check.diagnostics).toEqual([]);
			expect(check.tests.filter((t) => !t.pass)).toEqual([]);
			expect(check.complete).toBe(true);
			expect(check.defined).toBe(true);
			expect(check.definitions.map((f) => f.printed)).toEqual([exercise.name]);
		}
	);

	it.each(WRITE_EXERCISES.map((e) => [e.id, e] as const))(
		'%s: the starter reads, defines the function, and fails some test',
		(_id, exercise) => {
			expect(readAll(exercise.starter).diagnostics).toEqual([]);
			expect(exercise.starter.toUpperCase()).toContain(`(DEFUN ${exercise.name} `);
			const check = checkWrite(exercise, exercise.starter);
			expect(check.defined).toBe(true);
			expect(check.passed).toBeLessThan(check.tests.length);
			expect(exercise.description.toUpperCase()).toContain(exercise.name);
		}
	);
});
