/**
 * The midterm checklist as stored in this browser's localStorage: which
 * review items are checked off, and whether checked items are hidden.
 * Reading never throws: missing, corrupt, or old data reads as an empty
 * checklist, and ids that are not on the sheet are dropped.
 */

export const CHECKLIST_KEY = 'cmsc450-midterm-checklist';

export interface ChecklistData {
	checked: Set<string>;
	hideChecked: boolean;
}

interface Stored {
	v: 1;
	checked: string[];
	hideChecked: boolean;
}

export function emptyChecklist(): ChecklistData {
	return { checked: new Set(), hideChecked: false };
}

/** Parses stored text, keeping only ids in `known`. */
export function readChecklist(
	raw: string | null,
	known: Pick<ReadonlySet<string>, 'has'>
): ChecklistData {
	if (!raw) return emptyChecklist();
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return emptyChecklist();
	}
	if (typeof value !== 'object' || value === null) return emptyChecklist();
	const v = value as Partial<Record<keyof Stored, unknown>>;
	if (v.v !== 1) return emptyChecklist();
	const checked = Array.isArray(v.checked)
		? v.checked.filter((id): id is string => typeof id === 'string' && known.has(id))
		: [];
	return { checked: new Set(checked), hideChecked: v.hideChecked === true };
}

/** The text to store, with checked ids in sheet order. */
export function writeChecklist(data: ChecklistData, order: readonly string[]): string {
	const stored: Stored = {
		v: 1,
		checked: order.filter((id) => data.checked.has(id)),
		hideChecked: data.hideChecked
	};
	return JSON.stringify(stored);
}

export interface Progress {
	done: number;
	total: number;
}

export function progressOf(ids: readonly string[], checked: ReadonlySet<string>): Progress {
	return { done: ids.filter((id) => checked.has(id)).length, total: ids.length };
}

/** "3 of 16" style percentage, 0 when there is nothing to check. */
export function percent(p: Progress): number {
	return p.total ? Math.round((p.done / p.total) * 100) : 0;
}

/**
 * The first unchecked id after `from` in sheet order, wrapping around to the
 * start; null when everything is checked. Without `from`, the first unchecked id.
 */
export function nextUnchecked(
	order: readonly string[],
	checked: ReadonlySet<string>,
	from: string | null = null
): string | null {
	const start = from === null ? -1 : order.indexOf(from);
	for (let k = 1; k <= order.length; k++) {
		const id = order[(start + k + order.length) % order.length];
		if (!checked.has(id)) return id;
	}
	return null;
}
