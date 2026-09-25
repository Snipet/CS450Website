import { describe, expect, it } from 'vitest';
import { LEGEND_ORDER, LEGEND_TEXT, graphLegend, treeLegend } from './legend';

describe('legend', () => {
	it('has a caption for every key', () => {
		for (const key of LEGEND_ORDER) expect(LEGEND_TEXT[key]).toBeTruthy();
	});

	it('graphLegend lists the statuses in use, in a fixed order', () => {
		expect(graphLegend(undefined)).toEqual([]);
		expect(
			graphLegend(
				{ path: ['A', 'B'], dropped: ['C'], current: 'A', frontier: ['B'], explored: [] },
				{ goals: ['B'], heuristic: true }
			)
		).toEqual(['current', 'frontier', 'goal', 'path', 'dropped', 'heuristic']);
		expect(graphLegend({ explored: ['A'] })).toEqual(['explored']);
	});

	it('treeLegend follows the status counts', () => {
		expect(treeLegend({})).toEqual([]);
		expect(
			treeLegend({ frontier: 3, expanded: 2, cutoff: 1, replaced: 1, dropped: 2, current: 1 })
		).toEqual(['current', 'frontier', 'expanded', 'dropped', 'cutoff', 'replaced']);
		expect(treeLegend({ goal: 1, expanded: 4 }, { path: true })).toEqual([
			'expanded',
			'goal',
			'path'
		]);
		expect(treeLegend({ generated: 2 }, { current: true })).toEqual(['current']);
	});
});
