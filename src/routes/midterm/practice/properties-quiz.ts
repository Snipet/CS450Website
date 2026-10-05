/**
 * The strategy table as a quiz: completeness, optimality, time and space for
 * BFS, DFS, IDS, UCS, greedy best-first and A* (Uninformed Search, slide 45;
 * Informed Search, slide 42). The answer key is read from the engine's
 * STRATEGY_PROPERTIES, so the quiz and the table on the strategies page agree.
 */
import { STRATEGY_PROPERTIES, type StrategyProperties } from '$lib/theory/search';

export type Column = 'complete' | 'optimal' | 'time' | 'space';
export const COLUMNS: readonly { id: Column; label: string }[] = [
	{ id: 'complete', label: 'Complete?' },
	{ id: 'optimal', label: 'Optimal?' },
	{ id: 'time', label: 'Time' },
	{ id: 'space', label: 'Space' }
];

export interface Choice {
	id: string;
	label: string;
}

const COMPLETE: readonly Choice[] = [
	{ id: 'yes', label: 'Yes' },
	{ id: 'no', label: 'No' }
];
const OPTIMAL: readonly Choice[] = [
	{ id: 'yes', label: 'Yes' },
	{ id: 'no', label: 'No' },
	{ id: 'equal', label: 'If all step costs are equal' },
	{ id: 'admissible', label: 'If h is admissible' }
];
const COMPLEXITY: readonly Choice[] = [
	{ id: 'bd-exp', label: 'O(bᵈ)' },
	{ id: 'bm-exp', label: 'O(bᵐ)' },
	{ id: 'bd', label: 'O(bd)' },
	{ id: 'bm', label: 'O(bm)' },
	{ id: 'g', label: 'Nodes with g(n) ≤ C*' },
	{ id: 'f', label: 'Nodes with g(n) + h(n) ≤ C*' }
];

export const CHOICES: Record<Column, readonly Choice[]> = {
	complete: COMPLETE,
	optimal: OPTIMAL,
	time: COMPLEXITY,
	space: COMPLEXITY
};

/** The choice a cell of the slide table corresponds to, or null for text the quiz does not know. */
export function choiceFor(column: Column, text: string): string | null {
	if (column === 'complete') return text === 'Yes' ? 'yes' : text === 'No' ? 'no' : null;
	if (column === 'optimal') {
		if (text === 'Yes') return 'yes';
		if (text === 'No') return 'no';
		if (text === 'If all step costs are equal') return 'equal';
		if (/admissible/.test(text)) return 'admissible';
		return null;
	}
	// Greedy's "Worst case: O(bᵐ); best case: O(bd)" counts as its worst case.
	const head = text
		.replace(/^Worst case:\s*/, '')
		.split(';')[0]
		.trim();
	const byLabel: Record<string, string> = {
		'O(bᵈ)': 'bd-exp',
		'O(bᵐ)': 'bm-exp',
		'O(bd)': 'bd',
		'O(bm)': 'bm',
		'Number of nodes with g(n) ≤ C*': 'g',
		'Number of nodes with g(n) + h(n) ≤ C*': 'f'
	};
	return byLabel[head] ?? null;
}

export interface QuizRow {
	strategy: StrategyProperties['strategy'];
	name: string;
	/** The slide's text per column. */
	text: Record<Column, string>;
	/** The right choice per column. */
	key: Record<Column, string>;
	notes: string[];
}

export const QUIZ_ROWS: readonly QuizRow[] = STRATEGY_PROPERTIES.map((p) => {
	const text: Record<Column, string> = {
		complete: p.complete,
		optimal: p.optimal,
		time: p.time,
		space: p.space
	};
	const key = Object.fromEntries(
		COLUMNS.map(({ id }) => [id, choiceFor(id, text[id]) ?? ''])
	) as Record<Column, string>;
	return { strategy: p.strategy, name: p.name, text, key, notes: p.notes };
});

/** Answers by strategy and column ('' = not answered). */
export type QuizAnswers = Record<string, Partial<Record<Column, string>>>;

export interface QuizGrade {
	/** Per strategy and column: right, wrong, or null when not answered. */
	cells: Record<string, Record<Column, boolean | null>>;
	right: number;
	answered: number;
	total: number;
}

export function gradeQuiz(answers: QuizAnswers, rows: readonly QuizRow[] = QUIZ_ROWS): QuizGrade {
	let right = 0;
	let answered = 0;
	const cells: QuizGrade['cells'] = {};
	for (const row of rows) {
		const out = {} as Record<Column, boolean | null>;
		for (const { id } of COLUMNS) {
			const given = answers[row.strategy]?.[id] ?? '';
			if (!given) {
				out[id] = null;
				continue;
			}
			answered++;
			out[id] = given === row.key[id];
			if (out[id]) right++;
		}
		cells[row.strategy] = out;
	}
	return { cells, right, answered, total: rows.length * COLUMNS.length };
}
