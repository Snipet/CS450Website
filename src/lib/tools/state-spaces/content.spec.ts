import { describe, expect, it } from 'vitest';
import {
	AGENT_TYPES,
	COMPONENT_ORDER,
	PROBLEM_IDS,
	PUZZLE_SIZES,
	SLIDE_5_COMPONENTS,
	dijkstraWork,
	formatBig,
	formatCount,
	problemInfo,
	sizeRows,
	superscript,
	vacuumCountRows
} from './content';

describe('types of agents (Solving Problems by Searching, slide 2)', () => {
	it('lists the reflex and the planning agent as on the slide', () => {
		expect(AGENT_TYPES.map((a) => a.name)).toEqual(['Reflex agent', 'Planning agent']);
		expect(AGENT_TYPES[0].lead).toBe('Consider how the world IS');
		expect(AGENT_TYPES[1].points).toContain('Must formulate a goal');
	});
});

describe('search problem components', () => {
	it('slide 5 lists five components; the transition model is called Successor', () => {
		expect(SLIDE_5_COMPONENTS.map((c) => c.id)).toEqual([
			'initial',
			'actions',
			'transition',
			'goal',
			'cost'
		]);
		expect(SLIDE_5_COMPONENTS[2].note).toMatch(/Called Successor/);
	});

	it('every problem lists every component in order', () => {
		for (const id of PROBLEM_IDS) {
			const info = problemInfo(id, 3);
			expect(info.id).toBe(id);
			expect(info.components.map((c) => c.id)).toEqual(COMPONENT_ORDER);
			expect(info.components.every((c) => c.text.length > 0)).toBe(true);
		}
	});

	it('Romania follows slide 6 word for word', () => {
		const info = problemInfo('romania');
		const text = Object.fromEntries(info.components.map((c) => [c.id, c.text]));
		expect(text.initial).toBe('Arad');
		expect(text.goal).toBe('Bucharest');
		expect(text.cost).toBe('Sum of edge costs (total distance traveled)');
		expect(info.cite).toEqual({ deck: 'search', slide: 6 });
		// The slide does not list the states; that row is filled in.
		expect(info.components.filter((c) => !c.onSlide).map((c) => c.id)).toEqual(['states']);
	});

	it('marks what slides 8, 10, and 11 leave out', () => {
		const missing = (id: 'vacuum' | 'puzzle' | 'robot') =>
			problemInfo(id)
				.components.filter((c) => !c.onSlide)
				.map((c) => c.id);
		expect(missing('vacuum')).toEqual(['initial', 'goal', 'cost']);
		expect(missing('puzzle')).toEqual(['initial', 'transition', 'goal']);
		expect(missing('robot')).toEqual(['initial', 'transition']);
		expect(problemInfo('vacuum', 3).components[1].text).toMatch(/all 3 squares dirty/);
		expect(problemInfo('puzzle').components[0].text).toBe(
			'Locations of tiles: 181,440 states (9!/2)'
		);
	});
});

describe('state-space sizes', () => {
	it('n·2ⁿ for n = 1 … 10 (slide 8)', () => {
		expect(vacuumCountRows().map((r) => r.states)).toEqual([
			2, 8, 24, 64, 160, 384, 896, 2048, 4608, 10240
		]);
		expect(vacuumCountRows(3).map((r) => r.n)).toEqual([1, 2, 3]);
	});

	it('puzzle sizes as on slide 10', () => {
		expect(PUZZLE_SIZES.map((p) => p.text)).toEqual(['181,440 (9!/2)', '~1.3 trillion', '~10²⁵']);
		expect(PUZZLE_SIZES[0].states).toBe(181_440);
	});

	it('size rows count states, actions, and E + V log₂ V', () => {
		const rows = sizeRows();
		const byName = Object.fromEntries(rows.map((r) => [r.problem, r]));
		expect(byName['Romania'].edges).toBe(46);
		expect(byName['Romania'].work).toBeCloseTo(46 + 20 * Math.log2(20));
		expect(byName['Vacuum world, 2 squares']).toMatchObject({ states: 8, edges: 24 });
		expect(byName['Vacuum world, 10 squares'].states).toBe(10_240);
		expect(byName['8-puzzle']).toMatchObject({ states: 181_440, edges: 483_840 });
		expect(byName['Robot motion planning'].work).toBe(Infinity);
		// Finite rows grow down the table.
		const finite = rows.filter((r) => Number.isFinite(r.work)).map((r) => r.work);
		expect([...finite].sort((a, b) => a - b)).toEqual(finite);
		expect(dijkstraWork(1, 0)).toBe(0);
	});
});

describe('number formatting', () => {
	it('superscripts', () => {
		expect(superscript(25)).toBe('²⁵');
		expect(superscript(-3)).toBe('⁻³');
	});

	it('counts in words and powers of ten', () => {
		expect(formatCount(181440)).toBe('181,440');
		expect(formatBig(483_840)).toBe('483,840');
		expect(formatBig(3_654_000)).toBe('3.7 million');
		expect(formatBig(2e9)).toBe('2 billion');
		expect(formatBig(1.3e12)).toBe('1.3 trillion');
		expect(formatBig(5.6e13)).toBe('56 trillion');
		expect(formatBig(8.6e26)).toBe('8.6 × 10²⁶');
		expect(formatBig(1e25)).toBe('1 × 10²⁵');
		expect(formatBig(Infinity)).toBe('∞');
	});
});
