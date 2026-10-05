import { describe, expect, it } from 'vitest';
import { STRATEGY_PROPERTIES } from '$lib/theory/search';
import { CHOICES, COLUMNS, QUIZ_ROWS, choiceFor, gradeQuiz } from './properties-quiz';

describe('QUIZ_ROWS', () => {
	it('has a choice for every cell of the slide table', () => {
		expect(QUIZ_ROWS).toHaveLength(STRATEGY_PROPERTIES.length);
		for (const row of QUIZ_ROWS) {
			for (const { id } of COLUMNS) {
				expect(row.key[id], `${row.name} ${id}`).not.toBe('');
				expect(CHOICES[id].map((c) => c.id)).toContain(row.key[id]);
			}
		}
	});

	it('matches the slide 42 table', () => {
		const key = Object.fromEntries(QUIZ_ROWS.map((r) => [r.strategy, r.key]));
		expect(key.bfs).toEqual({ complete: 'yes', optimal: 'equal', time: 'bd-exp', space: 'bd-exp' });
		expect(key.dfs).toEqual({ complete: 'no', optimal: 'no', time: 'bm-exp', space: 'bm' });
		expect(key.ids).toEqual({ complete: 'yes', optimal: 'equal', time: 'bd-exp', space: 'bd' });
		expect(key.ucs).toEqual({ complete: 'yes', optimal: 'yes', time: 'g', space: 'g' });
		expect(key.greedy).toEqual({ complete: 'no', optimal: 'no', time: 'bm-exp', space: 'bm-exp' });
		expect(key.astar).toEqual({ complete: 'yes', optimal: 'admissible', time: 'f', space: 'f' });
	});
});

describe('choiceFor', () => {
	it('returns null for text it does not know', () => {
		expect(choiceFor('complete', 'Maybe')).toBeNull();
		expect(choiceFor('optimal', 'Sometimes')).toBeNull();
		expect(choiceFor('time', 'O(n!)')).toBeNull();
	});
});

describe('gradeQuiz', () => {
	it('counts right, answered, and total cells', () => {
		const g = gradeQuiz({
			bfs: { complete: 'yes', optimal: 'yes' },
			dfs: { space: 'bm' }
		});
		expect(g.total).toBe(24);
		expect(g.answered).toBe(3);
		expect(g.right).toBe(2);
		expect(g.cells.bfs).toEqual({ complete: true, optimal: false, time: null, space: null });
		expect(g.cells.dfs.space).toBe(true);
		expect(g.cells.astar.complete).toBeNull();
	});
});
