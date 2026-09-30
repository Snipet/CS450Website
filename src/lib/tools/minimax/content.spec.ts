import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { NOTES, QUESTIONS } from './content';
import { MINIMAX_PRESETS } from './presets';

const FORBIDDEN = [
	/help(s)? you/i,
	/\blearn(ing)? by\b/i,
	/intuition/i,
	/\bexplor/i,
	/\bdiscover/i,
	/\bstudents?\b/i,
	/common mistake/i,
	/misconception/i,
	/understand/i
];

const texts = [
	...NOTES.flatMap((n) => [n.title, ...n.points]),
	...QUESTIONS.flatMap((q) => [q.question, q.answer]),
	...MINIMAX_PRESETS.flatMap((p) => [p.label, p.description ?? ''])
];

describe('minimax tool copy', () => {
	it('cites slides of the deck and links to presets that exist', () => {
		for (const item of [...NOTES, ...QUESTIONS]) {
			expect(item.cite.deck).toBe('adversarial');
			const s = item.cite.slide!;
			const [a, b] = typeof s === 'number' ? [s, s] : s;
			expect(a).toBeGreaterThanOrEqual(1);
			expect(b).toBeLessThanOrEqual(decks.adversarial.slides);
			if (item.preset) {
				const p = MINIMAX_PRESETS.find((x) => x.id === item.preset!.id);
				expect(p?.label).toBe(item.preset.label);
			}
		}
	});

	it('states what things are, not what the site teaches', () => {
		for (const t of texts) for (const re of FORBIDDEN) expect(t).not.toMatch(re);
	});
});
