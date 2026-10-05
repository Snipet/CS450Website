/**
 * Checking exercises: running an Interpret exercise's prompts, comparing a
 * typed answer with the printed result (both read as Lisp data and compared
 * with EQUAL, so spacing and case do not matter), and running a Write
 * exercise's tests against the code typed in.
 */
import type { Diagnostic } from '$lib/theory/diagnostics';
import {
	Interpreter,
	equal,
	readAll,
	readOne,
	type FormResult,
	type LispValue,
	type RunResult,
	type TraceEntry
} from '$lib/theory/lisp';
import type { InterpretExercise, WriteExercise } from './exercises';

/** `span.source` of the code typed for a Write exercise. */
export const ATTEMPT_SOURCE = 'attempt';

export interface PromptOutcome {
	expr: string;
	/** The value, or null when the expression signals an error. */
	value: LispValue | null;
	/** The value as printed, or null after an error. */
	printed: string | null;
	error: string | null;
	output: string;
	/** Calls to the exercise's functions while evaluating the expression. */
	trace: TraceEntry[];
}

export interface InterpretRun {
	setup: RunResult;
	prompts: PromptOutcome[];
}

/** Evaluates the setup, then each prompt with tracing on. */
export function runInterpret(exercise: InterpretExercise): InterpretRun {
	const lisp = new Interpreter();
	const setup = lisp.run(exercise.setup, { source: 'setup' });
	const prompts = exercise.prompts.map((p, i): PromptOutcome => {
		const r = lisp.run(p.expr, { source: `prompt-${i}`, trace: true });
		const f = r.forms[r.forms.length - 1];
		if (!f)
			return {
				expr: p.expr,
				value: null,
				printed: null,
				error: r.diagnostics[0]?.message ?? 'Nothing to evaluate.',
				output: '',
				trace: []
			};
		return {
			expr: p.expr,
			value: f.value,
			printed: f.printed,
			error: f.error?.message ?? null,
			output: r.output,
			trace: r.trace
		};
	});
	return { setup, prompts };
}

export type AnswerStatus = 'empty' | 'unreadable' | 'correct' | 'incorrect';

export interface AnswerCheck {
	status: AnswerStatus;
	message: string;
}

const QUOTE_NAME = 'QUOTE';

/** Compares a typed answer with a prompt's outcome. Type `error` for an expression that signals one. */
export function checkAnswer(typed: string, outcome: PromptOutcome): AnswerCheck {
	const text = typed.trim();
	if (!text) return { status: 'empty', message: 'Type the printed result, or error.' };
	const saysError = /^error\.?$/i.test(text);
	if (outcome.value === null)
		return saysError
			? { status: 'correct', message: 'Correct: it signals an error.' }
			: { status: 'incorrect', message: 'Not the result.' };
	if (saysError) return { status: 'incorrect', message: 'Not the result: it returns a value.' };
	const { datum, diagnostics } = readOne(text, { source: 'answer' });
	if (!datum)
		return {
			status: 'unreadable',
			message: `Not readable as Lisp data: ${diagnostics[0]?.message ?? 'nothing to read.'}`
		};
	if (equal(datum, outcome.value)) return { status: 'correct', message: 'Correct.' };
	if (
		datum.kind === 'cons' &&
		datum.car.kind === 'symbol' &&
		datum.car.name === QUOTE_NAME &&
		datum.cdr.kind === 'cons' &&
		equal(datum.cdr.car, outcome.value)
	)
		return {
			status: 'incorrect',
			message: "Printed results have no leading quote: write the value without the '."
		};
	return { status: 'incorrect', message: 'Not the result.' };
}

export interface TestOutcome {
	call: string;
	expected: string;
	/** The value printed, or null after an error. */
	printed: string | null;
	error: string | null;
	output: string;
	pass: boolean;
}

export interface WriteCheck {
	/** False when the code has reading errors (no tests were run). */
	read: boolean;
	/** Reading problems and errors located in the code (span.source ATTEMPT_SOURCE). */
	diagnostics: Diagnostic[];
	/** Results of the code's own top-level forms. */
	definitions: FormResult[];
	/** Whether the code defines the exercise's function. */
	defined: boolean;
	tests: TestOutcome[];
	passed: number;
	/** Excluded built-ins the code uses. */
	forbidden: string[];
	/** Required built-ins the code does not use. */
	missing: string[];
	/** Every test passes and the code uses nothing excluded and everything required. */
	complete: boolean;
}

/** Names of every symbol in the data (iteratively; no recursion limits). */
export function symbolsIn(data: readonly LispValue[]): Set<string> {
	const out = new Set<string>();
	const stack = [...data];
	while (stack.length) {
		const x = stack.pop()!;
		if (x.kind === 'symbol') out.add(x.name);
		else if (x.kind === 'cons') stack.push(x.car, x.cdr);
	}
	return out;
}

/** Evaluates `code`, then each test call in the same environment (each with a fresh step budget). */
export function checkWrite(exercise: WriteExercise, code: string): WriteCheck {
	const lisp = new Interpreter();
	const run = lisp.run(code, { source: ATTEMPT_SOURCE });
	if (!run.read)
		return {
			read: false,
			diagnostics: run.diagnostics,
			definitions: [],
			defined: false,
			tests: [],
			passed: 0,
			forbidden: [],
			missing: [],
			complete: false
		};
	const used = symbolsIn(readAll(code).forms.map((f) => f.datum));
	const forbidden = (exercise.forbid ?? []).filter((n) => used.has(n));
	const missing = (exercise.require ?? []).filter((n) => !used.has(n));
	const diagnostics = [...run.diagnostics];
	const seen = new Set(diagnostics.map((d) => `${d.message}@${d.span?.start}`));
	const tests = exercise.tests.map((t, i): TestOutcome => {
		const r = lisp.run(t.call, { source: `test-${i}` });
		const f = r.forms[0];
		const expected = readOne(t.expected).datum;
		const pass = !!f && f.value !== null && expected !== null && equal(f.value, expected);
		const err = f?.error;
		if (err?.span?.source === ATTEMPT_SOURCE) {
			const key = `${err.message}@${err.span.start}`;
			if (!seen.has(key)) {
				seen.add(key);
				diagnostics.push({ severity: 'error', message: err.message, span: err.span });
			}
		}
		return {
			call: t.call,
			expected: t.expected,
			printed: f?.printed ?? null,
			error: err?.message ?? (f ? null : (r.diagnostics[0]?.message ?? 'Nothing to evaluate.')),
			output: r.output,
			pass
		};
	});
	const passed = tests.filter((t) => t.pass).length;
	return {
		read: true,
		diagnostics,
		definitions: run.forms,
		defined: lisp.userFunctions().includes(exercise.name),
		tests,
		passed,
		forbidden,
		missing,
		complete: passed === tests.length && !forbidden.length && !missing.length
	};
}

const andList = (names: string[]) =>
	names.length <= 1
		? names.join('')
		: `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** One or two sentences about a Write check (for the status line). */
export function summarizeWrite(exercise: WriteExercise, check: WriteCheck): string {
	if (!check.read)
		return 'The code has reading errors (listed under the editor); no tests were run.';
	const n = check.tests.length;
	const parts = [
		check.passed === n ? `All ${n} tests pass.` : `${check.passed} of ${n} tests pass.`
	];
	if (!check.defined) parts.push(`The code does not define ${exercise.name}.`);
	if (check.forbidden.length)
		parts.push(`The code uses ${andList(check.forbidden)}, which this exercise excludes.`);
	if (check.missing.length) parts.push(`The code does not use ${andList(check.missing)}.`);
	return parts.join(' ');
}
