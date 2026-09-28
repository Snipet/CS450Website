/**
 * The lecture index: for each deck, the tools that cite it and which slides.
 */
import { deckOrder, decks, type Citation, type Deck } from '$lib/lectures';
import type { ToolMeta } from './types';

export interface DeckTool {
	tool: ToolMeta;
	/** "slides 3–5, 8", "slide 4", or "whole deck". */
	slides: string;
}

export interface DeckEntry {
	deck: Deck;
	tools: DeckTool[];
}

/** Every deck in lecture order with the tools citing it (tool order preserved). */
export function lectureIndex(tools: readonly ToolMeta[]): DeckEntry[] {
	return deckOrder.map((id) => ({
		deck: decks[id],
		tools: tools
			.map((tool) => ({ tool, cites: tool.cites.filter((c) => c.deck === id) }))
			.filter((t) => t.cites.length > 0)
			.map(({ tool, cites }) => ({ tool, slides: formatSlides(cites) }))
	}));
}

/** Merges the slides of several citations of one deck into sorted, joined ranges. */
export function formatSlides(cites: readonly Citation[]): string {
	if (cites.some((c) => c.slide === undefined)) return 'whole deck';
	const slides = new Set<number>();
	for (const c of cites) {
		const [lo, hi] = typeof c.slide === 'number' ? [c.slide, c.slide] : c.slide!;
		for (let s = lo; s <= hi; s++) slides.add(s);
	}
	const sorted = [...slides].sort((a, b) => a - b);
	const ranges: string[] = [];
	for (let i = 0; i < sorted.length;) {
		let j = i;
		while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
		ranges.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
		i = j + 1;
	}
	return `${sorted.length === 1 ? 'slide' : 'slides'} ${ranges.join(', ')}`;
}
