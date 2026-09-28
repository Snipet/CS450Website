import { describe, expect, it } from 'vitest';
import { ERAS, EVENTS, TIMELINE_END, TIMELINE_START, WINTERS, type Era } from './content';
import {
	TIMELINE_METRICS,
	assignLanes,
	describeTimeline,
	eraEnd,
	estimateTextWidth,
	eventsDuring,
	formatEraLength,
	formatEraYears,
	formatOverlap,
	layoutTimeline,
	overlappingEras,
	wintersDuring,
	wrapText,
	yearTicks
} from './timeline';

const era = (id: Era['id']) => ERAS.find((e) => e.id === id)!;

describe('era formatting', () => {
	it('formats years and lengths', () => {
		expect(formatEraYears(era('inception'))).toBe('1943–1956');
		expect(formatEraYears(era('deep-learning'))).toBe('2011–present');
		expect(formatEraLength(era('inception'))).toBe('13 years');
		expect(formatEraLength(era('dose-of-reality'))).toBe('7 years');
		expect(formatEraLength({ id: 'inception', label: 'x', start: 1950, end: 1951 })).toBe('1 year');
		expect(formatEraLength(era('big-data'))).toBe('since 2001');
	});

	it('ends present eras at the chart end', () => {
		expect(eraEnd(era('expert-systems'), 2025)).toBe(1986);
		expect(eraEnd(era('big-data'), 2025)).toBe(2025);
	});
});

describe('overlappingEras', () => {
	it('finds the eras that share years (slide 20)', () => {
		const names = (id: Era['id']) =>
			overlappingEras(era(id), ERAS).map((o) => `${o.era.id} ${formatOverlap(o)}`);
		expect(names('inception')).toEqual(['early-enthusiasm 1952–1956']);
		expect(names('early-enthusiasm')).toEqual(['inception 1952–1956', 'dose-of-reality 1966–1969']);
		expect(names('dose-of-reality')).toEqual([
			'early-enthusiasm 1966–1969',
			'expert-systems 1969–1973'
		]);
		// 1969–1986 only touches 1952–1969 and 1986–present at a single year.
		expect(names('expert-systems')).toEqual(['dose-of-reality 1969–1973']);
		expect(names('neural-networks')).toEqual([
			'probabilistic since 1987',
			'big-data since 2001',
			'deep-learning since 2011'
		]);
	});
});

describe('eventsDuring / wintersDuring', () => {
	it('places the deck dates in the eras', () => {
		const ids = (id: Era['id']) => eventsDuring(era(id), EVENTS).map((e) => e.id);
		expect(ids('inception')).toEqual(['turing-test']);
		expect(ids('early-enthusiasm')).toEqual(['simon', 'perceptron']);
		expect(ids('dose-of-reality')).toEqual(['lighthill']);
		expect(ids('expert-systems')).toEqual(['lighthill', 'chinese-room']);
		expect(ids('deep-learning')).toEqual(['winograd', 'winograd-challenge']);
	});

	it('places the winters in the eras', () => {
		const ids = (id: Era['id']) => wintersDuring(era(id), WINTERS).map((w) => w.id);
		expect(ids('expert-systems')).toEqual(['first']);
		expect(ids('neural-networks')).toEqual(['second']);
		expect(ids('inception')).toEqual([]);
		expect(ids('big-data')).toEqual([]);
	});
});

describe('describeTimeline', () => {
	it('lists every era, and the highlighted one', () => {
		const text = describeTimeline(ERAS);
		expect(text).toMatch(/^Timeline of 8 overlapping eras of AI from 1943 to the present: /);
		expect(text).toContain('Inception, 1943–1956; Early enthusiasm & expectations, 1952–1969');
		expect(describeTimeline(ERAS, era('big-data'))).toMatch(/Highlighted: Big data\.$/);
	});

	it('handles closed and empty lists', () => {
		expect(describeTimeline([era('inception')])).toBe(
			'Timeline of 1 overlapping eras of AI from 1943 to the year 1956: Inception, 1943–1956.'
		);
		expect(describeTimeline([])).toBe('Timeline of AI eras: none.');
	});
});

describe('text metrics', () => {
	it('estimates width from length and size', () => {
		expect(estimateTextWidth('', 13)).toBe(0);
		expect(estimateTextWidth('abcd', 10)).toBeCloseTo(4 * 10 * 0.56);
	});

	it('wraps greedily and keeps long words whole', () => {
		const w = estimateTextWidth('Probabilistic reasoning', 13);
		expect(wrapText('Probabilistic reasoning and machine learning', w, 13)).toEqual([
			'Probabilistic reasoning',
			'and machine learning'
		]);
		expect(wrapText('Supercalifragilistic', 10, 13)).toEqual(['Supercalifragilistic']);
		expect(wrapText('  two   words ', 1000, 13)).toEqual(['two words']);
		expect(wrapText('', 100, 13)).toEqual([]);
	});
});

describe('yearTicks', () => {
	it('uses decades when there is room and 20 years otherwise', () => {
		expect(yearTicks(1940, 2025, 850)).toEqual([
			1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020
		]);
		expect(yearTicks(1940, 2025, 300)).toEqual([1940, 1960, 1980, 2000, 2020]);
		expect(yearTicks(1943, 1970, 1000)).toEqual([1950, 1960, 1970]);
		expect(yearTicks(2000, 2000, 500)).toEqual([]);
		expect(yearTicks(1940, 2025, 0)).toEqual([]);
	});
});

describe('assignLanes', () => {
	it('stacks markers that are too close', () => {
		expect(assignLanes([0, 30, 60], 20)).toEqual([0, 0, 0]);
		expect(assignLanes([0, 10, 20, 40], 20)).toEqual([0, 1, 0, 0]);
		expect(assignLanes([0, 10, 20, 40], 21)).toEqual([0, 1, 2, 0]);
		expect(assignLanes([50, 0, 5], 20)).toEqual([0, 0, 1]);
		expect(assignLanes([], 20)).toEqual([]);
	});
});

describe('layoutTimeline', () => {
	const layout = (width: number) =>
		layoutTimeline({
			width,
			eras: ERAS,
			events: EVENTS,
			winters: WINTERS,
			start: TIMELINE_START,
			end: TIMELINE_END
		});

	it('puts one row per era, top to bottom, with bars on the year scale', () => {
		const l = layout(900);
		expect(l.rows.map((r) => r.era.id)).toEqual(ERAS.map((e) => e.id));
		for (let i = 1; i < l.rows.length; i++)
			expect(l.rows[i].top).toBeGreaterThan(l.rows[i - 1].bottom);
		const x = (year: number) =>
			l.left + ((year - l.start) / (l.end - l.start)) * (l.right - l.left);
		const inception = l.rows[0];
		expect(inception.x1).toBeCloseTo(x(1943));
		expect(inception.x2).toBeCloseTo(x(1956));
		expect(inception.toPresent).toBe(false);
		const deep = l.rows[7];
		expect(deep.x2).toBeCloseTo(l.present.x);
		expect(deep.toPresent).toBe(true);
		expect(l.present.x).toBeCloseTo(l.right);
	});

	it('keeps every label inside the chart', () => {
		for (const width of [300, 420, 700, 1100]) {
			const l = layout(width);
			for (const r of l.rows) {
				const widest = Math.max(
					...r.label.lines.map(
						(s, i) =>
							estimateTextWidth(s, TIMELINE_METRICS.labelSize) +
							(i === r.label.lines.length - 1 && r.label.yearsInline
								? TIMELINE_METRICS.yearsGap +
									estimateTextWidth(r.label.years, TIMELINE_METRICS.yearsSize)
								: 0)
					)
				);
				expect(r.label.x).toBeGreaterThanOrEqual(l.left);
				expect(r.label.x + widest).toBeLessThanOrEqual(l.right + 0.001);
				expect(r.bottom).toBeLessThan(l.axisY);
			}
			expect(l.height).toBeGreaterThan(l.axisY);
		}
	});

	it('keeps labels on one line when wide and wraps them when narrow', () => {
		expect(layout(1100).rows.every((r) => r.label.lines.length === 1 && r.label.yearsInline)).toBe(
			true
		);
		const narrow = layout(300).rows.find((r) => r.era.id === 'probabilistic')!;
		expect(narrow.label.lines.length).toBeGreaterThan(1);
	});

	it('starts labels at their bar when they fit', () => {
		const l = layout(1100);
		expect(l.rows[0].label.x).toBeCloseTo(l.rows[0].x1);
		const deep = l.rows[7];
		expect(deep.label.x).toBeLessThan(deep.x1);
	});

	it('numbers markers in year order and keeps close ones apart', () => {
		const l = layout(360);
		expect(l.markers.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(l.markers.map((m) => m.event.year)).toEqual(EVENTS.map((e) => e.year));
		const minGap = 2 * TIMELINE_METRICS.markerRadius + 3;
		for (const a of l.markers)
			for (const b of l.markers)
				if (a !== b && a.lane === b.lane)
					expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(minGap);
		// 1957 and 1958 cannot share a lane.
		expect(l.markers[1].lane).not.toBe(l.markers[2].lane);
		for (const m of l.markers) {
			expect(m.y).toBeGreaterThan(l.rows[l.rows.length - 1].bottom);
			expect(m.y + TIMELINE_METRICS.markerRadius).toBeLessThanOrEqual(l.axisY);
		}
	});

	it('labels winter bands only when the labels fit', () => {
		expect(layout(1000).bands.map((b) => b.label)).toEqual(['AI winter', 'AI winter']);
		expect(layout(300).bands.map((b) => b.label)).toEqual([null, null]);
		const l = layout(1000);
		expect(l.bands[0].x1).toBeLessThan(l.bands[0].x2);
		expect(l.bands[0].x2).toBeLessThan(l.bands[1].x1);
	});

	it('picks ticks for the width and never goes below 200 px', () => {
		expect(layout(900).ticks.map((t) => t.year)).toContain(1950);
		expect(layout(300).ticks.map((t) => t.year)).not.toContain(1950);
		expect(layout(50).width).toBe(200);
	});

	it('works without events or winters', () => {
		const l = layoutTimeline({ width: 600, eras: ERAS, start: 1940, end: 2025 });
		expect(l.markers).toEqual([]);
		expect(l.bands).toEqual([]);
		expect(l.axisY).toBeCloseTo(l.rows[l.rows.length - 1].bottom + TIMELINE_METRICS.rowGap);
	});
});
