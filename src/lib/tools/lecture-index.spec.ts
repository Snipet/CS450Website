import { describe, expect, it } from 'vitest';
import { deckOrder, decks } from '$lib/lectures';
import { formatSlides, lectureIndex } from './lecture-index';
import { tools } from './registry';
import type { ToolMeta } from './types';

const meta = (slug: string, cites: ToolMeta['cites']): ToolMeta => ({
	slug,
	title: slug,
	summary: '',
	topic: 'search',
	order: 0,
	cites
});

describe('formatSlides', () => {
	it('merges single slides and ranges into sorted ranges', () => {
		expect(formatSlides([{ deck: 'informed', slide: 4 }])).toBe('slide 4');
		expect(
			formatSlides([
				{ deck: 'informed', slide: [8, 11] },
				{ deck: 'informed', slide: 12 },
				{ deck: 'informed', slide: 3 },
				{ deck: 'informed', slide: [10, 14] }
			])
		).toBe('slides 3, 8–14');
		expect(formatSlides([{ deck: 'informed' }, { deck: 'informed', slide: 2 }])).toBe('whole deck');
	});
});

describe('lectureIndex', () => {
	it('lists every deck in order with the tools that cite it', () => {
		const index = lectureIndex([
			meta('a', [{ deck: 'uninformed', slide: 4 }]),
			meta('b', [
				{ deck: 'informed', slide: 6 },
				{ deck: 'uninformed', slide: [40, 41] }
			])
		]);
		expect(index.map((e) => e.deck.id)).toEqual(deckOrder);
		const uninformed = index.find((e) => e.deck.id === 'uninformed')!;
		expect(uninformed.tools.map((t) => [t.tool.slug, t.slides])).toEqual([
			['a', 'slide 4'],
			['b', 'slides 40–41']
		]);
		expect(index.find((e) => e.deck.id === 'intro')!.tools).toEqual([]);
	});

	it('only cites slides that exist in the registered tools', () => {
		for (const tool of tools) {
			for (const c of tool.cites) {
				const [lo, hi] =
					c.slide === undefined
						? [1, 1]
						: typeof c.slide === 'number'
							? [c.slide, c.slide]
							: c.slide;
				expect(lo, tool.slug).toBeGreaterThanOrEqual(1);
				expect(hi, tool.slug).toBeLessThanOrEqual(decks[c.deck].slides);
				expect(lo, tool.slug).toBeLessThanOrEqual(hi);
			}
		}
	});
});
