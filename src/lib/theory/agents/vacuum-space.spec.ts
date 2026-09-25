import { describe, expect, it } from 'vitest';
import { search } from '../search';
import {
	MAX_SQUARES,
	MIN_SQUARES,
	SPACE_ACTIONS,
	isAllClean,
	parseVacuumState,
	squareLetter,
	vacuumGoals,
	vacuumPositions,
	vacuumProblem,
	vacuumProblemSpec,
	vacuumResult,
	vacuumStateCount,
	vacuumStateName,
	vacuumStateSpace,
	vacuumStates,
	vacuumTransitions
} from './vacuum-space';

const SLIDE_9_STATES = ['A DD', 'B DD', 'A CD', 'B CD', 'A DC', 'B DC', 'A CC', 'B CC'];

describe('state counts (Solving Problems by Searching, slide 8)', () => {
	it('has n·2ⁿ states: 8, 24, 64, 160', () => {
		expect([2, 3, 4, 5].map(vacuumStateCount)).toEqual([8, 24, 64, 160]);
		for (let n = MIN_SQUARES; n <= MAX_SQUARES; n++) {
			const names = vacuumStates(n).map(vacuumStateName);
			expect(names.length).toBe(vacuumStateCount(n));
			expect(new Set(names).size).toBe(names.length);
		}
	});

	it('rejects sizes outside 2–5', () => {
		expect(() => vacuumStates(1)).toThrow(RangeError);
		expect(() => vacuumStates(6)).toThrow(RangeError);
		expect(() => vacuumStateSpace(2.5)).toThrow(RangeError);
		expect(() => vacuumProblem(7, 'A DD')).toThrow(RangeError);
	});
});

describe('state names', () => {
	it('letters squares and writes D/C per square', () => {
		expect([0, 1, 2, 3, 4].map(squareLetter).join('')).toBe('ABCDE');
		expect(vacuumStateName({ location: 0, dirt: [true, true] })).toBe('A DD');
		expect(vacuumStateName({ location: 2, dirt: [false, true, false] })).toBe('C CDC');
	});

	it('parses names with diagnostics', () => {
		expect(parseVacuumState('A DD')).toEqual({
			state: { location: 0, dirt: [true, true] },
			diagnostics: []
		});
		expect(parseVacuumState('c dcd', 3).state).toEqual({ location: 2, dirt: [true, false, true] });
		expect(parseVacuumState('BCD').state).toEqual({ location: 1, dirt: [false, true] });
		const bad = parseVacuumState('hello');
		expect(bad.state).toBeNull();
		expect(bad.diagnostics[0]).toMatchObject({
			severity: 'error',
			span: { start: 0, end: 5, source: null }
		});
		expect(parseVacuumState('A DDD', 2).diagnostics[0].message).toBe(
			'The state lists 3 squares; the world has 2.'
		);
		expect(parseVacuumState('C DD').diagnostics[0].message).toBe(
			'There is no square C in a 2-square world.'
		);
		expect(parseVacuumState('A D').diagnostics[0].message).toBe('The world has 2–5 squares.');
	});
});

describe('transition model (slide 8)', () => {
	it('moves stop at the edges and Suck cleans the current square', () => {
		const s = { location: 0, dirt: [true, false, true] };
		expect(vacuumResult(s, 'Left')).toEqual(s);
		expect(vacuumResult(s, 'Right')).toEqual({ location: 1, dirt: s.dirt });
		expect(vacuumResult({ location: 2, dirt: s.dirt }, 'Right').location).toBe(2);
		expect(vacuumResult(s, 'Suck')).toEqual({ location: 0, dirt: [false, false, true] });
		expect(s.dirt).toEqual([true, false, true]);
		expect(SPACE_ACTIONS).toEqual(['Left', 'Right', 'Suck']);
	});

	it('knows the goal', () => {
		expect(isAllClean({ location: 1, dirt: [false, false] })).toBe(true);
		expect(isAllClean({ location: 1, dirt: [false, true] })).toBe(false);
		expect(vacuumGoals(2)).toEqual(['A CC', 'B CC']);
		expect(vacuumGoals(3)).toEqual(['A CCC', 'B CCC', 'C CCC']);
	});
});

describe('state-space graph (slide 9)', () => {
	it('lists the states in slide 9 order', () => {
		expect(vacuumStates(2).map(vacuumStateName)).toEqual(SLIDE_9_STATES);
	});

	it('has the transitions of slide 9, self-loops included', () => {
		const rows = vacuumTransitions(2).map((t) => `${t.from} ${t.action[0]} ${t.to}`);
		expect(rows).toEqual([
			'A DD L A DD',
			'A DD R B DD',
			'A DD S A CD',
			'B DD L A DD',
			'B DD R B DD',
			'B DD S B DC',
			'A CD L A CD',
			'A CD R B CD',
			'A CD S A CD',
			'B CD L A CD',
			'B CD R B CD',
			'B CD S B CC',
			'A DC L A DC',
			'A DC R B DC',
			'A DC S A CC',
			'B DC L A DC',
			'B DC R B DC',
			'B DC S B DC',
			'A CC L A CC',
			'A CC R B CC',
			'A CC S A CC',
			'B CC L A CC',
			'B CC R B CC',
			'B CC S B CC'
		]);
	});

	it('builds a directed graph with cost-1 edges matching the transitions', () => {
		const g = vacuumStateSpace();
		expect(g.directed).toBe(true);
		expect(g.nodes.map((n) => n.id)).toEqual(SLIDE_9_STATES);
		expect(g.edges.length).toBe(24);
		expect(g.edges.every((e) => e.cost === 1)).toBe(true);
		const t = vacuumTransitions(2);
		expect(g.edges.map((e) => [e.from, e.to])).toEqual(t.map((x) => [x.from, x.to]));
		// Slide 9 draws 12 self-loops: L/R at every state, S on the four with the agent's square clean.
		expect(g.edges.filter((e) => e.from === e.to).length).toBe(12);
		for (let n = 3; n <= MAX_SQUARES; n++) {
			expect(vacuumStateSpace(n).edges.length).toBe(3 * vacuumStateCount(n));
		}
	});

	it('places the n = 2 states like the slide 9 diagram', () => {
		const pos = vacuumPositions(2);
		const row = (y: number) =>
			SLIDE_9_STATES.filter((s) => pos.get(s)!.y === y).sort(
				(a, b) => pos.get(a)!.x - pos.get(b)!.x
			);
		expect(row(0)).toEqual(['A DD', 'B DD']);
		expect(row(120)).toEqual(['A CD', 'B CD', 'A DC', 'B DC']);
		expect(row(240)).toEqual(['A CC', 'B CC']);
		expect(Object.fromEntries(pos)).toEqual({
			'A DD': { x: 175, y: 0 },
			'B DD': { x: 315, y: 0 },
			'A CD': { x: 0, y: 120 },
			'B CD': { x: 140, y: 120 },
			'A DC': { x: 350, y: 120 },
			'B DC': { x: 490, y: 120 },
			'A CC': { x: 175, y: 240 },
			'B CC': { x: 315, y: 240 }
		});
		const g = vacuumStateSpace(2);
		expect(g.nodes.every((n) => pos.get(n.id)!.x === n.x && pos.get(n.id)!.y === n.y)).toBe(true);
	});

	it('matches an independent transition model for 2–5 squares', () => {
		for (let n = MIN_SQUARES; n <= MAX_SQUARES; n++) {
			const expected: string[] = [];
			for (const s of vacuumStates(n)) {
				const loc = s.location;
				const dirt = s.dirt.map((d) => (d ? 'D' : 'C'));
				const name = (at: number, d: string[]) => `${'ABCDE'[at]} ${d.join('')}`;
				expected.push(`${name(loc, dirt)} Left ${name(Math.max(0, loc - 1), dirt)}`);
				expected.push(`${name(loc, dirt)} Right ${name(Math.min(n - 1, loc + 1), dirt)}`);
				expected.push(
					`${name(loc, dirt)} Suck ${name(
						loc,
						dirt.map((d, i) => (i === loc ? 'C' : d))
					)}`
				);
			}
			expect(vacuumTransitions(n).map((t) => `${t.from} ${t.action} ${t.to}`)).toEqual(expected);
			// Self-loops: Left in the leftmost square, Right in the rightmost, Suck on a clean square.
			const loops = vacuumStateSpace(n).edges.filter((e) => e.from === e.to).length;
			expect(loops).toBe(2 ** n + 2 ** n + n * 2 ** (n - 1));
			expect(vacuumGoals(n)).toHaveLength(n);
			// Every square dirty, agent at the left end: n Sucks and n − 1 moves Right.
			const start = `A ${'D'.repeat(n)}`;
			const bfs = search(vacuumProblem(n, start), { strategy: 'bfs', mode: 'graph' });
			expect(bfs.solution?.cost).toBe(2 * n - 1);
			expect(bfs.solution?.actions.filter((a) => a === 'Suck')).toHaveLength(n);
			// Every state can be reached from there.
			const all = search(
				{ ...vacuumProblem(n, start), isGoal: () => false },
				{ strategy: 'bfs', mode: 'graph', record: 'summary' }
			);
			expect(all.stats.explored).toBe(vacuumStateCount(n));
		}
	});

	it('gives every state a distinct position for larger worlds', () => {
		for (let n = 3; n <= MAX_SQUARES; n++) {
			const pos = [...vacuumPositions(n).values()].map((p) => `${p.x},${p.y}`);
			expect(new Set(pos).size).toBe(vacuumStateCount(n));
		}
	});
});

describe('vacuumProblem', () => {
	it('lists successors Left, Right, Suck with cost 1', () => {
		const p = vacuumProblem(2, 'A DD');
		expect(p.initial).toBe('A DD');
		expect(p.key('A DD')).toBe('A DD');
		expect(p.label?.('A DD')).toBe('A DD');
		expect(p.successors('A DD')).toEqual([
			{ action: 'Left', state: 'A DD', cost: 1 },
			{ action: 'Right', state: 'B DD', cost: 1 },
			{ action: 'Suck', state: 'A CD', cost: 1 }
		]);
		expect(p.isGoal('B CC')).toBe(true);
		expect(p.isGoal('B CD')).toBe(false);
	});

	it('can leave out self-loops', () => {
		const p = vacuumProblem(2, 'a cd', { selfLoops: false });
		expect(p.initial).toBe('A CD');
		expect(p.successors('A CD')).toEqual([{ action: 'Right', state: 'B CD', cost: 1 }]);
	});

	it('tests the goal on the dirt, not the location letter', () => {
		const p = vacuumProblem(4, 'D CCCC');
		expect(p.isGoal('D CCCC')).toBe(true);
		expect(p.isGoal('D CCDC')).toBe(false);
	});

	it('is solved by breadth-first search in three steps from A DD', () => {
		const result = search(vacuumProblem(2, 'A DD'), { strategy: 'bfs', mode: 'graph' });
		expect(result.solution?.actions).toEqual(['Suck', 'Right', 'Suck']);
		expect(result.solution?.states).toEqual(['A DD', 'A CD', 'B CD', 'B CC']);
		expect(result.solution?.cost).toBe(3);
	});

	it('throws on a start that is not a state', () => {
		expect(() => vacuumProblem(2, 'C DD')).toThrow(RangeError);
		expect(() => vacuumProblem(3, 'A DD')).toThrow(RangeError);
	});

	it('builds a graph problem spec', () => {
		const spec = vacuumProblemSpec(2, 'B DD');
		expect(spec.start).toBe('B DD');
		expect(spec.goals).toEqual(['A CC', 'B CC']);
		expect(spec.graph.nodes.length).toBe(8);
	});
});
