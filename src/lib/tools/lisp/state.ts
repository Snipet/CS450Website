/**
 * The Lisp tool's URL state: the editor's code, the trace toggle, the
 * exercise mode and exercise, and the code typed for the current Write
 * exercise (only when it differs from the starter). A link carrying only
 * LinkStates['lisp'] (`{ code?, exercise? }`) is accepted: the exercise's
 * mode follows from its id.
 */
import type { LinkStates } from '$lib/tools/links';
import { EXERCISES, exerciseById, type ExerciseMode } from './exercises';
import { DEFAULT_PRESET } from './presets';

/** Longest code (editor or exercise attempt) kept in a link. */
export const MAX_CODE = 20_000;

export const MODES: readonly ExerciseMode[] = ['interpret', 'write'];

export interface LispToolState {
	code: string;
	trace: boolean;
	mode: ExerciseMode;
	/** The open exercise (its mode is `mode`). */
	exercise: string;
	/** Code typed for the open Write exercise; null for its starter. */
	attempt: string | null;
}

export type SavedLispState = LinkStates['lisp'] &
	Partial<Pick<LispToolState, 'trace' | 'mode' | 'attempt'>>;

export const firstExercise = (mode: ExerciseMode): string =>
	EXERCISES.find((e) => e.mode === mode)!.id;

export function defaultLispState(): LispToolState {
	return {
		code: DEFAULT_PRESET.value.code,
		trace: true,
		mode: 'interpret',
		exercise: firstExercise('interpret'),
		attempt: null
	};
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const isCode = (v: unknown): v is string => typeof v === 'string' && v.length <= MAX_CODE;

export const isMode = (v: unknown): v is ExerciseMode => (MODES as readonly unknown[]).includes(v);

export const isExerciseId = (v: unknown): v is string =>
	typeof v === 'string' && exerciseById(v) !== undefined;

/** Accepts saved state whose fields, when present, have the right types and known values. */
export function isSavedLispState(value: unknown): value is SavedLispState {
	if (!isObject(value)) return false;
	const checks: [string, (x: unknown) => boolean][] = [
		['code', isCode],
		['exercise', isExerciseId],
		['trace', (x) => typeof x === 'boolean'],
		['mode', isMode],
		['attempt', (x) => x === null || isCode(x)]
	];
	return checks.every(([key, ok]) => value[key] === undefined || ok(value[key]));
}

/**
 * Saved state with defaults for missing fields. The exercise decides the
 * mode; a mode alone opens that mode's first exercise. An attempt is kept
 * only for a Write exercise.
 */
export function completeLispState(saved: SavedLispState): LispToolState {
	const d = defaultLispState();
	const exercise = saved.exercise ? exerciseById(saved.exercise) : undefined;
	const mode = exercise?.mode ?? saved.mode ?? d.mode;
	return {
		code: saved.code ?? d.code,
		trace: saved.trace ?? d.trace,
		mode,
		exercise: exercise?.id ?? firstExercise(mode),
		attempt: exercise?.mode === 'write' ? (saved.attempt ?? null) : null
	};
}
