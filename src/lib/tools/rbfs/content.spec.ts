import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { tool } from '$lib/tools/catalog/rbfs';
import { NOTES, SLIDE_CITE, SOURCE } from './content';
import { RBFS_PRESETS } from './presets';

const FORBIDDEN = [
	/help(s)? you/i,
	/\blearn/i,
	/intuition/i,
	/\bexplor(?!ed set)/i, // "explored set" is the lectures' term
	/\bdiscover/i,
	/\bstudents?\b/i,
	/common mistake/i,
	/misconception/i,
	/understand/i
];

const texts = [
	tool.title,
	tool.summary,
	SOURCE,
	...NOTES.flatMap((n) => [n.title, ...n.points]),
	...RBFS_PRESETS.flatMap((p) => [p.label, p.description ?? ''])
];

describe('RBFS tool copy', () => {
	it('states what things are, not what the site teaches', () => {
		for (const t of texts) for (const re of FORBIDDEN) expect(t).not.toMatch(re);
	});

	it('cites the slide that names RBFS and slides that exist', () => {
		expect(SLIDE_CITE).toEqual({ deck: 'informed', slide: 4 });
		expect(tool.cites).toContainEqual(SLIDE_CITE);
		for (const n of NOTES) {
			if (!n.cite) continue;
			const s = n.cite.slide as number;
			expect(s).toBeLessThanOrEqual(decks[n.cite.deck].slides);
		}
		expect(tool).toMatchObject({ slug: 'rbfs', topic: 'informed', order: 15 });
	});
});
