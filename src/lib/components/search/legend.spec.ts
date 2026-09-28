import { describe, expect, it } from 'vitest';
import {
	GRAPH_STATUS_WORDS,
	LEGEND_ORDER,
	LEGEND_TEXT,
	graphLegend,
	statusWord,
	treeLegend
} from './legend';

describe('legend', () => {
	it('has a caption for every key', () => {
		for (const key of LEGEND_ORDER) expect(LEGEND_TEXT[key]).toBeTruthy();
	});

	it('graphLegend lists the statuses in use, in a fixed order', () => {
		expect(graphLegend(undefined)).toEqual([]);
		expect(
			graphLegend(
				{ path: ['A', 'B'], dropped: ['C'], current: 'A', frontier: ['B', 'D'], explored: [] },
				{ goals: ['B'], heuristic: true }
			)
		).toEqual(['current', 'frontier', 'goal', 'path', 'dropped', 'heuristic']);
		expect(graphLegend({ explored: ['A'] })).toEqual(['explored']);
		expect(graphLegend({ cutoff: ['B'], frontier: ['C'] })).toEqual(['frontier', 'cutoff']);
		// States drawn as the solution path or as being expanded do not show the other colors.
		expect(
			graphLegend({ path: ['S', 'A', 'G'], explored: ['S', 'A'], frontier: ['G'], current: 'X' })
		).toEqual(['current', 'path']);
		expect(graphLegend({ path: ['S', 'G'], explored: ['S', 'B'], frontier: ['C'] })).toEqual([
			'frontier',
			'explored',
			'path'
		]);
		expect(graphLegend({ cutoff: [] })).toEqual([]);
	});

	it('statusWord uses the default words or the page’s own text', () => {
		expect(statusWord('dropped')).toBe('not added');
		expect(statusWord('cutoff')).toBe(GRAPH_STATUS_WORDS.cutoff);
		expect(statusWord('dropped', {})).toBe('not added');
		expect(statusWord('dropped', { dropped: 'Overestimates h*' })).toBe('overestimates h*');
		expect(statusWord('dropped', { dropped: 'h > h*' })).toBe('h > h*');
		expect(statusWord('current', { current: 'A* picks this' })).toBe('A* picks this');
		expect(statusWord('frontier', { frontier: '  ' })).toBe('on the frontier');
		expect(statusWord('goal', { dropped: 'x' })).toBe('goal state');
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
