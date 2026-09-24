/**
 * Lecture decks the site's presets cite. Citations use the deck title plus a
 * slide number, e.g. "Uninformed Search · slide 4". Add a deck here when a
 * new lecture is posted; ids are short topic slugs, listed in lecture order.
 */
export type DeckId = 'intro' | 'agents' | 'search' | 'uninformed' | 'informed';

export interface Deck {
	id: DeckId;
	title: string;
	/** Short topic line shown under the title. */
	topic: string;
	/** Textbook chapter or sections the deck covers. */
	chapter: string;
	/** Number of slides, for validating citations. */
	slides: number;
}

export const decks: Record<DeckId, Deck> = {
	intro: {
		id: 'intro',
		title: 'Introduction to AI',
		topic: 'Definitions of AI, the Turing test, foundations, and history',
		chapter: 'Chapter 1',
		slides: 27
	},
	agents: {
		id: 'agents',
		title: 'Rational Agents',
		topic: 'Agents, PEAS, and environment types',
		chapter: 'Chapter 2',
		slides: 21
	},
	search: {
		id: 'search',
		title: 'Solving Problems by Searching',
		topic: 'Search problems, state spaces, and tree search',
		chapter: 'Chapter 3',
		slides: 44
	},
	uninformed: {
		id: 'uninformed',
		title: 'Uninformed Search',
		topic: 'Breadth-first, depth-first, iterative deepening, and uniform-cost search',
		chapter: 'Section 3.4',
		slides: 46
	},
	informed: {
		id: 'informed',
		title: 'Informed Search',
		topic: 'Heuristics, greedy best-first search, and A*',
		chapter: 'Sections 3.5–3.6',
		slides: 44
	}
};

/** Decks in lecture order. */
export const deckOrder: DeckId[] = ['intro', 'agents', 'search', 'uninformed', 'informed'];

export interface Citation {
	deck: DeckId;
	/** A single slide (8) or an inclusive range ([17, 19]). */
	slide?: number | readonly [number, number];
}

/** "Uninformed Search · slide 4", "Rational Agents · slides 6–8". */
export function formatCitation(c: Citation): string {
	const title = decks[c.deck].title;
	if (c.slide === undefined) return title;
	if (typeof c.slide === 'number') return `${title} · slide ${c.slide}`;
	return `${title} · slides ${c.slide[0]}–${c.slide[1]}`;
}
