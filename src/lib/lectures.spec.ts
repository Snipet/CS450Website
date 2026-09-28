import { describe, expect, it } from 'vitest';
import { deckOrder, decks, formatCitation } from './lectures';

describe('formatCitation', () => {
	it('formats a deck, a slide, and a range', () => {
		expect(formatCitation({ deck: 'uninformed' })).toBe('Uninformed Search');
		expect(formatCitation({ deck: 'uninformed', slide: 4 })).toBe('Uninformed Search · slide 4');
		expect(formatCitation({ deck: 'agents', slide: [6, 8] })).toBe('Rational Agents · slides 6–8');
	});
});

describe('decks', () => {
	it('lists every deck once, in lecture order', () => {
		expect([...deckOrder].sort()).toEqual(Object.keys(decks).sort());
		for (const id of deckOrder) expect(decks[id].id).toBe(id);
	});
});
