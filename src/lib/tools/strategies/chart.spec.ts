import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, TINY_PROBLEM } from '$lib/theory/graphs';
import { CHART_METRICS, chartBars, chartScale, metricTitle } from './chart';
import { compareStrategies } from './compare';

const TREE = { mode: 'tree', alpha: 2, limit: 1000 } as const;

describe('chartBars', () => {
	it('scales to the largest value', () => {
		const rows = compareStrategies(TINY_PROBLEM, TREE).rows;
		const bars = chartBars(rows, 'generated');
		expect(chartScale(rows, 'generated')).toBe(54);
		expect(bars.find((b) => b.strategy === 'ids')).toMatchObject({
			value: 54,
			percent: 100,
			clipped: false,
			found: true
		});
		expect(bars.find((b) => b.strategy === 'ucs')!.percent).toBe(29.6);
	});

	it('scales to the runs that found a solution and clips longer bars', () => {
		const rows = compareStrategies(ROMANIA_PROBLEM, TREE).rows;
		expect(chartScale(rows, 'generated')).toBe(132);
		const dfs = chartBars(rows, 'generated').find((b) => b.strategy === 'dfs')!;
		expect(dfs).toMatchObject({
			value: 3501,
			percent: 100,
			clipped: true,
			found: false,
			outcome: 'limit'
		});
	});

	it('uses every run when none found a solution, and handles zeros', () => {
		const rows = compareStrategies(ROMANIA_PROBLEM, TREE).rows.map((r) => ({
			...r,
			outcome: 'limit' as const
		}));
		expect(chartScale(rows, 'generated')).toBe(3501);
		expect(chartBars([], 'expanded')).toEqual([]);
		const zero = rows.map((r) => ({ ...r, maxFrontier: 0 }));
		expect(chartBars(zero, 'maxFrontier').every((b) => b.percent === 0)).toBe(true);
	});

	it('names the metrics', () => {
		expect(CHART_METRICS.map((m) => m.value)).toEqual(['generated', 'expanded', 'maxFrontier']);
		expect(metricTitle('generated')).toBe('Nodes generated');
		expect(metricTitle('expanded')).toBe('Nodes expanded');
		expect(metricTitle('maxFrontier')).toBe('Largest frontier');
	});
});
