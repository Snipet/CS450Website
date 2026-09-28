/**
 * The vacuum tool's URL state: the configuration and the time step shown. A
 * link carrying only some fields (LinkStates['vacuum']) is accepted; the others
 * take their defaults.
 */
import {
	REFLEX_TABLE,
	VACUUM_ACTIONS,
	isMeasureId,
	isProgramId,
	parseWorldName,
	tableActions,
	tableFromActions,
	worldName,
	type MeasureId,
	type PerceptTable,
	type ProgramId,
	type VacuumAction
} from '$lib/theory/agents/vacuum';

export const MIN_TOOL_STEPS = 1;
export const MAX_TOOL_STEPS = 200;
export const MAX_SEED = 99_999;

export interface VacuumToolState {
	program: ProgramId;
	/** The percept → action table as four letters in PERCEPTS order (`encodeTable`), e.g. "RSLS". */
	table: string;
	/** Initial state name, e.g. "A DD" (`worldName`). */
	initial: string;
	steps: number;
	/** Probability that a clean square becomes dirty after each time step. */
	p: number;
	seed: number;
	measure: MeasureId;
}

/** What the URL hash may carry: any configuration fields, and the index of the time step shown. */
export type SavedVacuumState = Partial<VacuumToolState> & {
	/** Index of the time step shown (0 = t 1); clamped to the run's length. */
	step?: number;
};

const LETTER: Record<VacuumAction, string> = { Left: 'L', Right: 'R', Suck: 'S', NoOp: 'N' };

/** Four letters (L, R, S, N) for the table's actions in PERCEPTS order. */
export function encodeTable(table: PerceptTable): string {
	return tableActions(table)
		.map((a) => LETTER[a])
		.join('');
}

/** Reads `encodeTable` text (case-insensitive); null unless it is exactly four action letters. */
export function decodeTable(text: string): PerceptTable | null {
	if (!/^[LRSN]{4}$/i.test(text)) return null;
	const actions = [...text.toUpperCase()].map(
		(c) => VACUUM_ACTIONS.find((a) => LETTER[a] === c) as VacuumAction
	);
	return tableFromActions(actions);
}

/** The page as first opened: the slide 3 reflex agent in "A DD" for 10 steps. */
export function defaultVacuumState(): VacuumToolState {
	return {
		program: 'reflex',
		table: encodeTable(REFLEX_TABLE),
		initial: 'A DD',
		steps: 10,
		p: 0,
		seed: 1,
		measure: 'clean-squares'
	};
}

const isInt = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Accepts saved state whose fields, when present, have the right types and ranges. */
export function isSavedVacuumState(value: unknown): value is SavedVacuumState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (v.program !== undefined && !isProgramId(v.program)) return false;
	if (v.table !== undefined && (typeof v.table !== 'string' || !decodeTable(v.table))) return false;
	if (v.initial !== undefined && (typeof v.initial !== 'string' || !parseWorldName(v.initial)))
		return false;
	if (v.steps !== undefined && !isInt(v.steps, MIN_TOOL_STEPS, MAX_TOOL_STEPS)) return false;
	if (v.p !== undefined && (typeof v.p !== 'number' || !Number.isFinite(v.p) || v.p < 0 || v.p > 1))
		return false;
	if (v.seed !== undefined && !isInt(v.seed, 0, MAX_SEED)) return false;
	if (v.measure !== undefined && !isMeasureId(v.measure)) return false;
	if (v.step !== undefined && !isInt(v.step, 0, MAX_TOOL_STEPS - 1)) return false;
	return true;
}

/** Saved configuration with defaults for missing fields, names normalized (the step is not part of it). */
export function completeVacuumState(saved: SavedVacuumState): VacuumToolState {
	const d = defaultVacuumState();
	const table = saved.table !== undefined ? decodeTable(saved.table) : null;
	const initial = saved.initial !== undefined ? parseWorldName(saved.initial) : null;
	return {
		program: saved.program ?? d.program,
		table: table ? encodeTable(table) : d.table,
		initial: initial ? worldName(initial) : d.initial,
		steps: saved.steps ?? d.steps,
		p: saved.p ?? d.p,
		seed: saved.seed ?? d.seed,
		measure: saved.measure ?? d.measure
	};
}
