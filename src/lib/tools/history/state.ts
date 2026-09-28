/**
 * The history page's URL state: the highlighted era, or none.
 */
import { ERAS, type EraId } from './content';

export interface HistoryState {
	era: EraId | null;
}

/** What a link may carry: `{}` means no era highlighted. */
export type SavedHistoryState = Partial<HistoryState>;

export function defaultHistoryState(): HistoryState {
	return { era: null };
}

export const isEraId = (v: unknown): v is EraId =>
	typeof v === 'string' && ERAS.some((e) => e.id === v);

/** `syncToHash` validate: `{ era }` with a known era id, null, or no era. */
export function isHistoryState(value: unknown): value is SavedHistoryState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const era = (value as Record<string, unknown>).era;
	return era === undefined || era === null || isEraId(era);
}

/** Saved state with the default for a missing era. */
export function completeHistoryState(saved: SavedHistoryState): HistoryState {
	return { era: saved.era ?? null };
}
