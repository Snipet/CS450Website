import { describe, expect, it } from 'vitest';
import { decks, type Citation } from '$lib/lectures';
import {
	AI_BOOM,
	ERAS,
	EVENTS,
	FOUNDATIONS,
	FOUNDATIONS_CITE,
	PERCEPTRON_ARTICLE,
	SIMON_QUOTE,
	STATE_OF_THE_ART,
	STATE_OF_THE_ART_CITE,
	THEMES,
	THEMES_CITE,
	TIMELINE_CITE,
	TIMELINE_END,
	TIMELINE_START,
	WINTERS
} from './content';

function expectValidCite(c: Citation) {
	expect(c.deck).toBe('intro');
	const [a, b] = typeof c.slide === 'number' ? [c.slide, c.slide] : (c.slide ?? [1, 1]);
	expect(a).toBeGreaterThanOrEqual(1);
	expect(b).toBeGreaterThanOrEqual(a);
	expect(b).toBeLessThanOrEqual(decks.intro.slides);
}

const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;

describe('history content', () => {
	it('cites slides that exist in the Introduction deck', () => {
		const cites = [
			FOUNDATIONS_CITE,
			TIMELINE_CITE,
			SIMON_QUOTE.cite,
			PERCEPTRON_ARTICLE.cite,
			THEMES_CITE,
			AI_BOOM.overview.cite,
			AI_BOOM.themesCite,
			STATE_OF_THE_ART_CITE,
			...EVENTS.map((e) => e.cite),
			...WINTERS.map((w) => w.cite)
		];
		for (const c of cites) expectValidCite(c);
	});

	it('lists the eight foundations and ten state-of-the-art areas of the slides', () => {
		expect(FOUNDATIONS).toHaveLength(8);
		expect(unique(FOUNDATIONS)).toBe(true);
		expect(STATE_OF_THE_ART).toHaveLength(10);
		expect(unique(STATE_OF_THE_ART)).toBe(true);
	});

	it('reproduces the slide 20 timeline', () => {
		expect(ERAS.map((e) => `${e.start}–${e.end ?? 'present'} ${e.label}`)).toEqual([
			'1943–1956 Inception',
			'1952–1969 Early enthusiasm & expectations',
			'1966–1973 A dose of reality',
			'1969–1986 Expert systems',
			'1986–present Return of neural networks',
			'1987–present Probabilistic reasoning and machine learning',
			'2001–present Big data',
			'2011–present Deep learning'
		]);
	});

	it('orders eras by start year, each with a positive span inside the chart range', () => {
		expect(unique(ERAS.map((e) => e.id))).toBe(true);
		for (let i = 1; i < ERAS.length; i++) {
			expect(ERAS[i].start).toBeGreaterThanOrEqual(ERAS[i - 1].start);
		}
		for (const e of ERAS) {
			expect(e.start).toBeGreaterThanOrEqual(TIMELINE_START);
			expect(e.end ?? TIMELINE_END).toBeGreaterThan(e.start);
			expect(e.end ?? TIMELINE_END).toBeLessThanOrEqual(TIMELINE_END);
		}
	});

	it('orders events by year inside the chart range, with unique ids', () => {
		expect(unique(EVENTS.map((e) => e.id))).toBe(true);
		for (let i = 1; i < EVENTS.length; i++) {
			expect(EVENTS[i].year).toBeGreaterThanOrEqual(EVENTS[i - 1].year);
		}
		for (const e of EVENTS) {
			expect(e.year).toBeGreaterThanOrEqual(TIMELINE_START);
			expect(e.year).toBeLessThanOrEqual(TIMELINE_END);
		}
		expect(EVENTS.map((e) => e.year)).toEqual([1950, 1957, 1958, 1973, 1980, 2009, 2013, 2016]);
	});

	it('shades the AI winters inside the chart range, in order', () => {
		expect(WINTERS.map((w) => w.period)).toEqual(['Late 1970s', 'Late 1980s–early 1990s']);
		expect(unique(WINTERS.map((w) => w.id))).toBe(true);
		for (const w of WINTERS) {
			expect(w.band[1]).toBeGreaterThan(w.band[0]);
			expect(w.band[0]).toBeGreaterThanOrEqual(TIMELINE_START);
			expect(w.points.length).toBeGreaterThan(0);
		}
		expect(WINTERS[1].band[0]).toBeGreaterThan(WINTERS[0].band[1]);
	});

	it('keeps the slide 21 prediction numbers', () => {
		expect(SIMON_QUOTE.year).toBe(1957);
		expect(SIMON_QUOTE.outcome).toContain(`${SIMON_QUOTE.actualYears} years later`);
		expect(SIMON_QUOTE.outcome).toContain(`instead of ${SIMON_QUOTE.predictedYears}`);
		expect(SIMON_QUOTE.emphasis).toContain(`within ${SIMON_QUOTE.predictedYears} years`);
		expect(PERCEPTRON_ARTICLE.year).toBe(1958);
	});

	it('has three historical themes with unique ids', () => {
		expect(THEMES.map((t) => t.title)).toEqual([
			'Boom and bust cycles',
			'Silver bulletism',
			'Image problems'
		]);
		expect(unique(THEMES.map((t) => t.id))).toBe(true);
	});

	it('names the slide 25–26 source and its charts', () => {
		expect(AI_BOOM.venue).toBe('AAAI 2017');
		expect(AI_BOOM.themes).toHaveLength(16);
		expect(unique(AI_BOOM.themes)).toBe(true);
		const [from, to] = AI_BOOM.overview.years;
		expect(AI_BOOM.overview.takeoff).toBeGreaterThan(from);
		expect(AI_BOOM.overview.takeoff).toBeLessThan(to);
	});
});
