/**
 * The "problem dictates the approach" board (Introduction to AI, slide 18):
 * AI applications, each unplaced or placed in one of the four approaches.
 * Pure functions; every update returns a new array.
 */
import type { Preset } from '$lib/components/ui/types';
import type { Diagnostic } from '$lib/theory/diagnostics';
import { STATE_OF_THE_ART, STATE_OF_THE_ART_CITE } from '../history/content';
import { APPROACH_IDS, isApproachId, type ApproachId } from './content';

export interface BoardItem {
	text: string;
	/** The approach it is placed in, or null while unplaced. */
	at: ApproachId | null;
}

export type Board = readonly BoardItem[];

export const MAX_ITEMS = 40;
export const MAX_TEXT_LENGTH = 60;

/** Collapses runs of whitespace and trims. */
export function cleanText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

const sameText = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Problems with adding `text`; empty when it can be added. */
export function checkNewItem(board: Board, text: string): Diagnostic[] {
	const clean = cleanText(text);
	const error = (message: string): Diagnostic[] => [{ severity: 'error', message }];
	if (!clean) return error('Type an application to add.');
	if (clean.length > MAX_TEXT_LENGTH)
		return error(`Use at most ${MAX_TEXT_LENGTH} characters (this has ${clean.length}).`);
	if (board.some((item) => sameText(item.text, clean)))
		return error(`“${clean}” is already on the board.`);
	if (board.length >= MAX_ITEMS) return error(`The board holds at most ${MAX_ITEMS} applications.`);
	return [];
}

export interface AddResult {
	board: BoardItem[];
	diagnostics: Diagnostic[];
	/** Index of the new item, or null when it was not added. */
	index: number | null;
}

/** Adds an application (cleaned) at the end, unplaced unless `at` is given. */
export function addItem(board: Board, text: string, at: ApproachId | null = null): AddResult {
	const diagnostics = checkNewItem(board, text);
	if (diagnostics.length) return { board: [...board], diagnostics, index: null };
	return {
		board: [...board, { text: cleanText(text), at }],
		diagnostics,
		index: board.length
	};
}

/** Moves item `index` to `at` (null: back to unplaced). Out-of-range indices change nothing. */
export function placeItem(board: Board, index: number, at: ApproachId | null): BoardItem[] {
	return board.map((item, i) => (i === index ? { ...item, at } : item));
}

/** Deletes item `index`. */
export function removeItem(board: Board, index: number): BoardItem[] {
	return board.filter((_, i) => i !== index);
}

/** The items in one place (an approach, or null for unplaced), with their board indices. */
export function itemsIn(board: Board, at: ApproachId | null): { item: BoardItem; index: number }[] {
	const out: { item: BoardItem; index: number }[] = [];
	board.forEach((item, index) => {
		if (item.at === at) out.push({ item, index });
	});
	return out;
}

export function placedCount(board: Board): number {
	return board.filter((item) => item.at !== null).length;
}

export function countsByApproach(board: Board): Record<ApproachId, number> {
	const counts = Object.fromEntries(APPROACH_IDS.map((id) => [id, 0])) as Record<
		ApproachId,
		number
	>;
	for (const item of board) if (item.at) counts[item.at]++;
	return counts;
}

/** Slide 27's application areas, all unplaced. */
export function stateOfTheArtBoard(): BoardItem[] {
	return STATE_OF_THE_ART.map((text) => ({ text, at: null }));
}

export const BOARD_PRESETS: readonly Preset<BoardItem[]>[] = [
	{
		id: 'state-of-the-art',
		label: 'State of the art in AI',
		description: 'The ten application areas from the slide, all unplaced.',
		cite: STATE_OF_THE_ART_CITE,
		value: stateOfTheArtBoard()
	},
	{
		id: 'empty',
		label: 'Empty board',
		description: 'No applications.',
		value: []
	}
];

/** Accepts a saved board: at most MAX_ITEMS clean, distinct texts with valid places. */
export function isBoard(value: unknown): value is BoardItem[] {
	if (!Array.isArray(value) || value.length > MAX_ITEMS) return false;
	const seen: string[] = [];
	for (const item of value) {
		if (typeof item !== 'object' || item === null) return false;
		const { text, at } = item as Record<string, unknown>;
		if (typeof text !== 'string') return false;
		if (!text || text !== cleanText(text) || text.length > MAX_TEXT_LENGTH) return false;
		if (seen.some((s) => sameText(s, text))) return false;
		if (at !== null && !isApproachId(at)) return false;
		seen.push(text);
	}
	return true;
}
