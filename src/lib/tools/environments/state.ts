/**
 * The task-environments tool's state: the columns of the comparison table
 * (examples and custom environments) and the selected column. It is kept in
 * the URL hash; a link carrying only `{ preset }` (LinkStates['environments'])
 * opens the slide 17 table with that example added and selected.
 *
 * All functions return new values and never change their inputs.
 */
import {
	PEAS_PARTS,
	SLIDE_17_IDS,
	emptyPeas,
	environmentExample,
	isDimensionValue,
	isEnvironmentProfile,
	normalizeProfile,
	peasExample,
	sameProfile,
	type Dimension,
	type DimensionValues,
	type EnvironmentExample,
	type EnvironmentProfile,
	type Peas,
	type PeasPart
} from '$lib/theory/agents/environments';

/** Most columns the table holds. */
export const MAX_COLUMNS = 12;
/** Longest custom environment name. */
export const MAX_NAME_LENGTH = 60;
/** Longest PEAS line. */
export const MAX_PEAS_LENGTH = 300;

/** A column showing one of ENVIRONMENT_EXAMPLES. Its key is the example id. */
export interface ExampleColumn {
	kind: 'example';
	key: string;
	/** Values changed on this page (the whole profile); absent: the example's own values. */
	values?: EnvironmentProfile;
}

/** A column for an environment described on this page. */
export interface CustomColumn {
	kind: 'custom';
	/** "custom-1", "custom-2", … */
	key: string;
	name: string;
	values: EnvironmentProfile;
	peas: Peas;
}

export type Column = ExampleColumn | CustomColumn;

export interface EnvironmentsToolState {
	columns: Column[];
	/** Key of the selected column, or null. */
	selected: string | null;
}

/** What the URL hash may carry: the full state, a cross-tool link, or both. */
export interface SavedEnvironmentsState {
	columns?: Column[];
	selected?: string | null;
	/** An example id to add (if missing) and select. */
	preset?: string;
}

/** The slide 17 table with Autonomous driving selected. */
export function defaultEnvironmentsState(): EnvironmentsToolState {
	return {
		columns: SLIDE_17_IDS.map((key) => ({ kind: 'example', key })),
		selected: 'autonomous-driving'
	};
}

// ---------------------------------------------------------------------------
// Reading columns
// ---------------------------------------------------------------------------

/** The example a column shows, if it is an example column. */
export function columnExample(column: Column): EnvironmentExample | undefined {
	return column.kind === 'example' ? environmentExample(column.key) : undefined;
}

/** The column's current values: its edits, or the example's own values. */
export function columnProfile(column: Column): EnvironmentProfile {
	if (column.kind === 'custom') return column.values;
	return column.values ?? columnExample(column)?.profile ?? {};
}

/** The column's display name; an unnamed custom environment is "Untitled environment". */
export function columnName(column: Column): string {
	if (column.kind === 'custom') return column.name.trim() || 'Untitled environment';
	return columnExample(column)?.name ?? column.key;
}

/** Whether an example column's values differ from the example's. */
export function isEdited(column: Column): boolean {
	return column.kind === 'example' && column.values !== undefined;
}

/**
 * The column's PEAS text: a custom column's own, or the PEAS example linked
 * to the example (null when the slides give none).
 */
export function columnPeas(column: Column): Peas | null {
	if (column.kind === 'custom') return column.peas;
	const id = columnExample(column)?.peas;
	return id ? (peasExample(id)?.peas ?? null) : null;
}

export function findColumn(state: EnvironmentsToolState, key: string | null): Column | undefined {
	return key === null ? undefined : state.columns.find((c) => c.key === key);
}

// ---------------------------------------------------------------------------
// Changing columns
// ---------------------------------------------------------------------------

/** Adds an example (if it is not in the table yet) and selects it. */
export function addExample(state: EnvironmentsToolState, id: string): EnvironmentsToolState {
	if (!environmentExample(id)) return state;
	if (state.columns.some((c) => c.key === id)) return { ...state, selected: id };
	if (state.columns.length >= MAX_COLUMNS) return state;
	return { columns: [...state.columns, { kind: 'example', key: id }], selected: id };
}

/** The next free custom key: one more than the largest in use. */
export function nextCustomKey(columns: readonly Column[]): string {
	let n = 0;
	for (const c of columns) {
		const m = /^custom-(\d+)$/.exec(c.key);
		if (m) n = Math.max(n, Number(m[1]));
	}
	return `custom-${n + 1}`;
}

/**
 * Adds a custom environment ("New environment", no values set, unless `init`
 * says otherwise) at the end, or after the column `after`, and selects it.
 */
export function addCustom(
	state: EnvironmentsToolState,
	init: Partial<Pick<CustomColumn, 'name' | 'values' | 'peas'>> = {},
	after?: string
): EnvironmentsToolState {
	if (state.columns.length >= MAX_COLUMNS) return state;
	const key = nextCustomKey(state.columns);
	const n = Number(key.slice('custom-'.length));
	const column: CustomColumn = {
		kind: 'custom',
		key,
		name: (init.name ?? (n > 1 ? `New environment ${n}` : 'New environment')).slice(
			0,
			MAX_NAME_LENGTH
		),
		values: normalizeProfile(init.values ?? {}),
		peas: { ...emptyPeas(), ...init.peas }
	};
	const at = after === undefined ? -1 : state.columns.findIndex((c) => c.key === after);
	const columns = [...state.columns];
	columns.splice(at < 0 ? columns.length : at + 1, 0, column);
	return { columns, selected: key };
}

/**
 * A custom copy of a column, placed after it and selected: same values, and
 * the column's PEAS text (empty when it has none).
 */
export function duplicateColumn(state: EnvironmentsToolState, key: string): EnvironmentsToolState {
	const column = findColumn(state, key);
	if (!column) return state;
	const suffix = ' (copy)';
	const base = columnName(column).slice(0, MAX_NAME_LENGTH - suffix.length);
	return addCustom(
		state,
		{
			name: base + suffix,
			values: columnProfile(column),
			peas: columnPeas(column) ?? emptyPeas()
		},
		key
	);
}

/** Removes a column. When it was selected, the next column (or the previous one) is selected. */
export function removeColumn(state: EnvironmentsToolState, key: string): EnvironmentsToolState {
	const i = state.columns.findIndex((c) => c.key === key);
	if (i < 0) return state;
	const columns = state.columns.filter((c) => c.key !== key);
	let selected = state.selected;
	if (selected === key) selected = (columns[i] ?? columns[i - 1])?.key ?? null;
	return { columns, selected };
}

export function selectColumn(state: EnvironmentsToolState, key: string): EnvironmentsToolState {
	return findColumn(state, key) ? { ...state, selected: key } : state;
}

function replaceColumn(
	state: EnvironmentsToolState,
	key: string,
	update: (c: Column) => Column
): EnvironmentsToolState {
	if (!findColumn(state, key)) return state;
	return { ...state, columns: state.columns.map((c) => (c.key === key ? update(c) : c)) };
}

/**
 * Sets (or with `undefined` clears) one dimension of a column. An example
 * column whose values come back to the example's own drops its edits.
 */
export function setColumnValue<D extends Dimension>(
	state: EnvironmentsToolState,
	key: string,
	dimension: D,
	value: DimensionValues[D] | undefined
): EnvironmentsToolState {
	if (value !== undefined && !isDimensionValue(dimension, value)) return state;
	return replaceColumn(state, key, (c) => {
		const values = normalizeProfile({ ...columnProfile(c), [dimension]: value });
		if (c.kind === 'custom') return { ...c, values };
		const own = columnExample(c)?.profile ?? {};
		return sameProfile(values, own) ? { kind: 'example', key: c.key } : { ...c, values };
	});
}

/** Puts an example column back to the example's own values. */
export function resetColumn(state: EnvironmentsToolState, key: string): EnvironmentsToolState {
	return replaceColumn(state, key, (c) => (c.kind === 'example' ? { kind: 'example', key } : c));
}

export function renameColumn(
	state: EnvironmentsToolState,
	key: string,
	name: string
): EnvironmentsToolState {
	return replaceColumn(state, key, (c) =>
		c.kind === 'custom' ? { ...c, name: name.slice(0, MAX_NAME_LENGTH) } : c
	);
}

export function setColumnPeas(
	state: EnvironmentsToolState,
	key: string,
	part: PeasPart,
	text: string
): EnvironmentsToolState {
	return replaceColumn(state, key, (c) =>
		c.kind === 'custom' ? { ...c, peas: { ...c.peas, [part]: text.slice(0, MAX_PEAS_LENGTH) } } : c
	);
}

/** Whether the state is the default table with nothing changed. */
export function isDefaultTable(state: EnvironmentsToolState): boolean {
	const d = defaultEnvironmentsState();
	return (
		state.columns.length === d.columns.length &&
		state.columns.every((c, i) => c.kind === 'example' && !c.values && c.key === d.columns[i].key)
	);
}

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

function isPeas(value: unknown): value is Peas {
	if (!isObject(value)) return false;
	const keys = Object.keys(value);
	if (keys.length !== PEAS_PARTS.length) return false;
	return PEAS_PARTS.every((p) => {
		const text = value[p.id];
		return typeof text === 'string' && text.length <= MAX_PEAS_LENGTH;
	});
}

function isColumn(value: unknown): value is Column {
	if (!isObject(value) || typeof value.key !== 'string') return false;
	if (value.kind === 'example') {
		if (!environmentExample(value.key)) return false;
		return value.values === undefined || isEnvironmentProfile(value.values);
	}
	if (value.kind === 'custom') {
		return (
			/^custom-\d{1,4}$/.test(value.key) &&
			typeof value.name === 'string' &&
			value.name.length <= MAX_NAME_LENGTH &&
			isEnvironmentProfile(value.values) &&
			isPeas(value.peas)
		);
	}
	return false;
}

/**
 * Accepts saved state and cross-tool links: `columns` (at most MAX_COLUMNS,
 * unique keys), `selected` (a key or null), and `preset` (an example id),
 * each optional.
 */
export function isSavedEnvironmentsState(value: unknown): value is SavedEnvironmentsState {
	if (!isObject(value)) return false;
	const { columns, selected, preset } = value;
	if (preset !== undefined && (typeof preset !== 'string' || !environmentExample(preset)))
		return false;
	if (selected !== undefined && selected !== null && typeof selected !== 'string') return false;
	if (columns !== undefined) {
		if (!Array.isArray(columns) || columns.length > MAX_COLUMNS) return false;
		if (!columns.every(isColumn)) return false;
		if (new Set(columns.map((c: Column) => c.key)).size !== columns.length) return false;
	}
	return true;
}

/**
 * The state a saved value describes: its columns (or the default table), its
 * selection when that column exists, then `preset` added and selected.
 */
export function completeEnvironmentsState(saved: SavedEnvironmentsState): EnvironmentsToolState {
	const base = defaultEnvironmentsState();
	const columns: Column[] = (saved.columns ?? base.columns).map((c) =>
		c.kind === 'custom'
			? { ...c, values: normalizeProfile(c.values), peas: { ...c.peas } }
			: c.values && !sameProfile(c.values, columnExample(c)?.profile ?? {})
				? { kind: 'example', key: c.key, values: normalizeProfile(c.values) }
				: { kind: 'example', key: c.key }
	);
	let selected = saved.selected ?? (saved.columns ? null : base.selected);
	if (selected === null || !columns.some((c) => c.key === selected)) {
		selected = columns[0]?.key ?? null;
	}
	let state: EnvironmentsToolState = { columns, selected };
	if (saved.preset) state = addExample(state, saved.preset);
	return state;
}
