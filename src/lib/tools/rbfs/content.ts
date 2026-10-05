/**
 * Short notes shown under the RBFS tool. The Informed Search slides list
 * RBFS on slide 4 ("not on slides"); the notes follow Russell & Norvig,
 * Artificial Intelligence: A Modern Approach, 3rd ed., Section 3.5.3.
 */
import type { Citation } from '$lib/lectures';

/** Where the algorithm and Figure 3.27 come from. */
export const SOURCE =
	'Russell & Norvig, Artificial Intelligence: A Modern Approach, 3rd ed., Section 3.5.3, Figures 3.26–3.27';

/** The slide that names RBFS. */
export const SLIDE_CITE: Citation = { deck: 'informed', slide: 4 };

export interface NoteSection {
	id: string;
	title: string;
	points: readonly string[];
	/** Slides the section relates to, if any. */
	cite?: Citation;
}

export const NOTES: readonly NoteSection[] = [
	{
		id: 'what',
		title: 'Recursive best-first search',
		points: [
			'A best-first search in linear space: it follows the path with the lowest f(n) = g(n) + h(n) depth first and keeps only the nodes of the open calls and their successors.',
			'Each call has an f_limit: the f value of the best alternative path available from any ancestor of the node. When the best successor’s f exceeds it, the call returns failure and its subtree is forgotten.',
			'The returned value, the best f in the forgotten subtree, replaces the node’s f (a backed-up value). The search can then tell whether that subtree is worth expanding again later.',
			'A regenerated successor gets f = max(g + h, f of its parent), so a backed-up value carries over to the nodes below it.'
		],
		cite: SLIDE_CITE
	},
	{
		id: 'properties',
		title: 'Properties',
		points: [
			'Optimal if h(n) is admissible, like A* tree search.',
			'Space: O(bd), linear in the depth of the deepest path it follows.',
			'Time: hard to characterize. It depends on how accurate h is and how often the best path changes as nodes are expanded; RBFS can regenerate the same nodes many times.',
			'Tree search: it has no explored set, so a state can appear on the path more than once (Sibiu → Arad).'
		]
	},
	{
		id: 'compare',
		title: 'Compared with A* and IDA*',
		points: [
			'A* keeps every node it generates, so its memory grows exponentially, but it never generates a node twice. RBFS keeps O(bd) nodes and pays for it with regenerated nodes.',
			'IDA* (iterative deepening A*) also runs in linear space: it repeats depth-first searches with an f cutoff, raising the cutoff each time to the smallest f that exceeded it, without RBFS’s backed-up values.'
		],
		cite: { deck: 'informed', slide: 31 }
	}
];
