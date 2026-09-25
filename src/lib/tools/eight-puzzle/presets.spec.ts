import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import {
	PUZZLE_GRAPH_LIMITS,
	SLIDE_GOAL,
	SLIDE_START,
	formatBoard,
	isBoard,
	isSolvable,
	puzzleProblem
} from '$lib/theory/puzzle';
import { search } from '$lib/theory/search';
import { DEFAULT_PRESET, PUZZLE_PRESETS } from './presets';

/**
 * Optimal solution length of every board that can reach the slide goal: one
 * breadth-first graph search out from the goal (moves are reversible).
 */
function depthsToGoal(): Map<string, number> {
	const everywhere = { ...puzzleProblem(SLIDE_GOAL, SLIDE_GOAL, 'zero'), isGoal: () => false };
	const r = search(everywhere, {
		strategy: 'bfs',
		mode: 'graph',
		record: 'summary',
		...PUZZLE_GRAPH_LIMITS
	});
	const out = new Map<string, number>();
	for (const n of r.nodes) if (!out.has(n.key)) out.set(n.key, n.depth);
	return out;
}

describe('PUZZLE_PRESETS', () => {
	it('starts with the slide start state (Informed Search slide 32)', () => {
		expect(DEFAULT_PRESET.id).toBe('slide');
		expect(DEFAULT_PRESET.value).toEqual({ start: SLIDE_START, goal: SLIDE_GOAL, depth: 26 });
		expect(DEFAULT_PRESET.cite).toEqual({ deck: 'informed', slide: 32 });
	});

	it('has unique ids, valid boards, and citations of existing slides', () => {
		expect(new Set(PUZZLE_PRESETS.map((p) => p.id)).size).toBe(PUZZLE_PRESETS.length);
		for (const p of PUZZLE_PRESETS) {
			expect(isBoard(p.value.start), p.id).toBe(true);
			expect(isBoard(p.value.goal), p.id).toBe(true);
			expect(p.cite, p.id).toBeDefined();
			const slide = p.cite!.slide as number;
			expect(slide).toBeLessThanOrEqual(decks[p.cite!.deck].slides);
			expect(p.description, p.id).toContain(formatBoard(p.value.start));
		}
	});

	it('includes boards 4, 8, 12, 20, 24 and 31 moves from the goal', () => {
		const depths = PUZZLE_PRESETS.map((p) => p.value.depth);
		for (const d of [4, 8, 12, 20, 24, 31]) expect(depths).toContain(d);
		expect(depths).toContain(null);
	});

	it('states each optimal solution length exactly (checked by BFS)', () => {
		const depths = depthsToGoal();
		for (const p of PUZZLE_PRESETS) {
			expect(p.value.goal, p.id).toBe(SLIDE_GOAL);
			expect(depths.get(p.value.start) ?? null, p.id).toBe(p.value.depth);
			expect(isSolvable(p.value.start, p.value.goal), p.id).toBe(p.value.depth !== null);
		}
		// 31 moves is the largest depth: no board is farther from the goal.
		expect([...depths.values()].reduce((a, b) => Math.max(a, b), 0)).toBe(31);
	});
});
