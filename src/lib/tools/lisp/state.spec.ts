import { describe, expect, it } from 'vitest';
import { decode, encode } from '$lib/url-state';
import { DEFAULT_PRESET } from './presets';
import {
	MAX_CODE,
	completeLispState,
	defaultLispState,
	firstExercise,
	isSavedLispState
} from './state';

describe('Lisp tool state', () => {
	it('opens on the factorial program with tracing and the first Interpret exercise', () => {
		const d = defaultLispState();
		expect(d).toEqual({
			code: DEFAULT_PRESET.value.code,
			trace: true,
			mode: 'interpret',
			exercise: 'read-car-cdr',
			attempt: null
		});
		expect(isSavedLispState(d)).toBe(true);
		expect(firstExercise('write')).toBe('write-my-length');
	});

	it('accepts the LinkStates shape; the exercise decides the mode', () => {
		expect(isSavedLispState({})).toBe(true);
		expect(isSavedLispState({ code: '(+ 1 2)' })).toBe(true);
		expect(isSavedLispState({ exercise: 'write-flatten' })).toBe(true);
		expect(completeLispState({ exercise: 'write-flatten' })).toEqual({
			...defaultLispState(),
			mode: 'write',
			exercise: 'write-flatten'
		});
		expect(completeLispState({ code: 'x', exercise: 'read-let', mode: 'write' })).toMatchObject({
			code: 'x',
			mode: 'interpret',
			exercise: 'read-let'
		});
		expect(completeLispState({ mode: 'write' }).exercise).toBe('write-my-length');
	});

	it('keeps an attempt only for a Write exercise', () => {
		expect(
			completeLispState({ exercise: 'write-flatten', attempt: '(defun flatten (x) x)' }).attempt
		).toBe('(defun flatten (x) x)');
		expect(completeLispState({ exercise: 'read-let', attempt: 'x' }).attempt).toBeNull();
	});

	it('rejects bad shapes and values', () => {
		for (const bad of [
			null,
			[],
			'x',
			{ code: 5 },
			{ code: 'x'.repeat(MAX_CODE + 1) },
			{ exercise: 'nope' },
			{ exercise: 3 },
			{ mode: 'read' },
			{ trace: 'yes' },
			{ attempt: 4 }
		])
			expect(isSavedLispState(bad)).toBe(false);
	});

	it('round-trips through the URL hash', () => {
		const s = { ...defaultLispState(), code: "(car '(a b))", trace: false };
		expect(decode(encode(s), isSavedLispState)).toEqual(s);
	});
});
