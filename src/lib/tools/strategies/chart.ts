/**
 * Bar lengths for the node-count chart next to the comparison: one count per
 * strategy, scaled to the largest.
 */
import type { ComparedStrategy, ComparisonRow, RunOutcome } from './compare';

export type ChartMetric = 'generated' | 'expanded' | 'maxFrontier';

export const CHART_METRICS: readonly { value: ChartMetric; label: string; title: string }[] = [
	{ value: 'generated', label: 'Generated', title: 'Nodes generated (the slides’ time)' },
	{ value: 'expanded', label: 'Expanded', title: 'Nodes expanded' },
	{
		value: 'maxFrontier',
		label: 'Max frontier',
		title: 'Largest frontier (the slides’ space, plus the explored set in graph search)'
	}
];

/** "Nodes generated", "Nodes expanded", "Largest frontier". */
export function metricTitle(metric: ChartMetric): string {
	switch (metric) {
		case 'generated':
			return 'Nodes generated';
		case 'expanded':
			return 'Nodes expanded';
		case 'maxFrontier':
			return 'Largest frontier';
	}
}

export interface ChartBar {
	strategy: ComparedStrategy;
	value: number;
	/** Bar length in percent of the track (0–100). */
	percent: number;
	/** The value is beyond the scale; the bar fills the track and is drawn cut. */
	clipped: boolean;
	found: boolean;
	outcome: RunOutcome;
}

/**
 * The largest value among the runs that found a solution (all runs when none
 * did), so a run stopped at the limit does not flatten the other bars.
 */
export function chartScale(rows: readonly ComparisonRow[], metric: ChartMetric): number {
	const found = rows.filter((r) => r.outcome === 'found');
	return Math.max(0, ...(found.length ? found : rows).map((r) => r[metric]));
}

/** One bar per row on `chartScale`; longer values fill the track and are marked clipped. */
export function chartBars(rows: readonly ComparisonRow[], metric: ChartMetric): ChartBar[] {
	const scale = chartScale(rows, metric);
	return rows.map((r) => {
		const value = r[metric];
		const clipped = value > scale;
		return {
			strategy: r.strategy,
			value,
			percent: clipped ? 100 : scale > 0 ? Math.round((value / scale) * 1000) / 10 : 0,
			clipped,
			found: r.outcome === 'found',
			outcome: r.outcome
		};
	});
}
