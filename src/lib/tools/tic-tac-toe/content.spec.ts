import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { CHESS_CITE, CHESS_SYSTEMS, GAME_NOTES, GAME_TYPES } from './content';

describe('reference content', () => {
	it('cites slides 3, 4, 5, 26 and 27 of the adversarial search deck', () => {
		const cites = [GAME_TYPES.cite, ...GAME_NOTES.map((n) => n.cite), CHESS_CITE];
		expect(cites.map((c) => c.slide)).toEqual([3, 4, 5, 26, 27]);
		for (const c of cites) {
			expect(c.deck).toBe('adversarial');
			expect(c.slide as number).toBeLessThanOrEqual(decks.adversarial.slides);
		}
	});

	it('has the slide 3 table', () => {
		expect(GAME_TYPES.columns).toEqual(['Deterministic', 'Stochastic']);
		expect(GAME_TYPES.rows.map((r) => r.cells)).toEqual([
			['Chess, checkers, go', 'Backgammon, monopoly'],
			['Battleships', 'Scrabble, poker, bridge']
		]);
	});

	it('has the slide 27 systems with their search depths', () => {
		expect(CHESS_SYSTEMS.map((s) => [s.system, s.ply])).toEqual([
			['Baseline', 5],
			['Baseline + alpha-beta', 10],
			['Deep Blue', 14],
			['Hydra (ca. 2006)', 18]
		]);
		expect(CHESS_SYSTEMS[2].details).toMatch(/30 billion evaluations per move/);
		expect(CHESS_SYSTEMS[2].details).toMatch(/8000 features/);
		expect(CHESS_SYSTEMS[3].details).toMatch(/36 billion evaluations per second/);
	});

	it('keeps the slide 5 chess numbers', () => {
		const text = GAME_NOTES.find((n) => n.id === 'vs-search')!.points.join(' ');
		expect(text).toMatch(/branching factor ≈ 35/);
		expect(text).toMatch(/depth ≈ 100/);
		expect(text).toMatch(/10¹⁵⁴ nodes/);
		expect(text).toMatch(/10⁸⁰ atoms/);
	});
});
