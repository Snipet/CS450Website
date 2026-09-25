/**
 * The approaches page's URL state: the selected cell of the table and the
 * board. A link may carry either field; the other takes its default.
 */
import { isBoard, stateOfTheArtBoard, type BoardItem } from './board';
import { isApproachId, type ApproachId } from './content';

export interface ApproachesState {
	approach: ApproachId;
	board: BoardItem[];
}

export type SavedApproachesState = Partial<ApproachesState>;

/** The page as first opened: "Acting humanly" selected, slide 27's applications unplaced. */
export function defaultApproachesState(): ApproachesState {
	return { approach: 'acting-humanly', board: stateOfTheArtBoard() };
}

/** `syncToHash` validate. */
export function isSavedApproachesState(value: unknown): value is SavedApproachesState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (v.approach !== undefined && !isApproachId(v.approach)) return false;
	if (v.board !== undefined && !isBoard(v.board)) return false;
	return true;
}

/** Saved state with defaults for missing fields. */
export function completeApproachesState(saved: SavedApproachesState): ApproachesState {
	const d = defaultApproachesState();
	return {
		approach: saved.approach ?? d.approach,
		board: saved.board ? saved.board.map((item) => ({ ...item })) : d.board
	};
}
