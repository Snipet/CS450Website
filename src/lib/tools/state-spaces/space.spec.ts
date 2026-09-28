import { describe, expect, it } from 'vitest';
import { vacuumStateSpace } from '$lib/theory/agents/vacuum-space';
import { parseGraphText, ROMANIA_PROBLEM } from '$lib/theory/graphs';
import { SLIDE_START } from '$lib/theory/puzzle';
import { describeStep } from '$lib/components/search/describe';
import {
	basicSearch,
	describeBasicStep,
	describeVacuumState,
	graphSpec,
	initialState,
	isGraphProblem,
	isStateOf,
	searchToolGraph,
	successorRows,
	vacuumEdgeActions,
	vacuumGraph,
	vacuumStart
} from './space';

describe('vacuum world drawing', () => {
	it('uses the slide 9 layout for two and three squares', () => {
		expect(vacuumGraph(2)).toEqual(vacuumStateSpace(2));
		expect(vacuumGraph(3)).toEqual(vacuumStateSpace(3));
	});

	it('splits the wide rows of the four-square world over two lines', () => {
		const g = vacuumGraph(4);
		const base = vacuumStateSpace(4);
		expect(g.edges).toEqual(base.edges);
		expect(g.nodes.map((n) => n.id)).toEqual(base.nodes.map((n) => n.id));
		const keys = new Set(g.nodes.map((n) => `${n.x},${n.y}`));
		expect(keys.size).toBe(64);
		expect(new Set(g.nodes.map((n) => n.y)).size).toBe(8);
		const xs = g.nodes.map((n) => n.x!);
		const ys = g.nodes.map((n) => n.y!);
		const width = Math.max(...xs) - Math.min(...xs);
		const height = Math.max(...ys) - Math.min(...ys);
		expect(width / height).toBeGreaterThan(1.8);
		expect(width / height).toBeLessThan(2.6);
		// The states of a dirt pattern stay side by side, A to D.
		const y = (id: string) => g.nodes.find((n) => n.id === id)!.y;
		expect(new Set(['A DDDD', 'B DDDD', 'C DDDD', 'D DDDD'].map(y)).size).toBe(1);
	});

	it('names the action of every edge and describes states', () => {
		expect(vacuumEdgeActions(2).slice(0, 3)).toEqual(['Left', 'Right', 'Suck']);
		expect(vacuumEdgeActions(3)).toHaveLength(72);
		expect(describeVacuumState('A CD')).toBe('Agent in A; A clean, B dirty');
		expect(describeVacuumState('nonsense')).toBe('nonsense');
		expect(vacuumStart(3)).toBe('A DDD');
	});
});

describe('problems and states', () => {
	it('graph problems, specs, and initial states', () => {
		expect(isGraphProblem('romania')).toBe(true);
		expect(isGraphProblem('puzzle')).toBe(false);
		expect(graphSpec('romania', 2)).toBe(ROMANIA_PROBLEM);
		expect(graphSpec('vacuum', 2)).toMatchObject({ start: 'A DD', goals: ['A CC', 'B CC'] });
		expect(
			['romania', 'vacuum', 'puzzle', 'robot'].map((p) => initialState(p as never, 3))
		).toEqual(['Arad', 'A DDD', SLIDE_START, '']);
	});

	it('checks that a state belongs to the problem', () => {
		expect(isStateOf('romania', 2, 'Sibiu')).toBe(true);
		expect(isStateOf('romania', 2, 'Paris')).toBe(false);
		expect(isStateOf('vacuum', 2, 'B CD')).toBe(true);
		expect(isStateOf('vacuum', 3, 'B CD')).toBe(false);
		expect(isStateOf('vacuum', 2, 'b cd')).toBe(false);
		expect(isStateOf('puzzle', 2, SLIDE_START)).toBe(true);
		// Tiles 1 and 2 swapped: not reachable from the goal.
		expect(isStateOf('puzzle', 2, '021345678')).toBe(false);
		expect(isStateOf('puzzle', 2, '12345678')).toBe(false);
		expect(isStateOf('robot', 2, '')).toBe(true);
	});
});

describe('successor function (slide 14)', () => {
	it('Romania: the roads from a city in name order with their distances', () => {
		expect(successorRows('romania', 2, 'Arad')).toEqual([
			{ action: 'Go to Sibiu', state: 'Sibiu', cost: 140, same: false },
			{ action: 'Go to Timisoara', state: 'Timisoara', cost: 118, same: false },
			{ action: 'Go to Zerind', state: 'Zerind', cost: 75, same: false }
		]);
	});

	it('vacuum world: Left, Right, Suck, marking actions that change nothing', () => {
		expect(successorRows('vacuum', 2, 'A CD')).toEqual([
			{ action: 'Left', state: 'A CD', cost: 1, same: true },
			{ action: 'Right', state: 'B CD', cost: 1, same: false },
			{ action: 'Suck', state: 'A CD', cost: 1, same: true }
		]);
		expect(successorRows('vacuum', 3, 'B DDD').map((r) => r.state)).toEqual([
			'A DDD',
			'C DDD',
			'B DCD'
		]);
	});

	it('8-puzzle: the blank moves Left, Right, Up, Down at cost 1', () => {
		const rows = successorRows('puzzle', 2, SLIDE_START);
		expect(rows.map((r) => r.action)).toEqual(['Left', 'Right', 'Up', 'Down']);
		// 7 2 4 / 5 _ 6 / 8 3 1: moving the blank left swaps it with the 5.
		expect(rows[0].state).toBe('724056831');
		expect(rows.map((r) => r.note)).toEqual([
			'tile 5 moves right',
			'tile 6 moves left',
			'tile 2 moves down',
			'tile 3 moves up'
		]);
		expect(rows.every((r) => r.cost === 1 && !r.same)).toBe(true);
	});

	it('nothing for robot motion planning or a state of another problem', () => {
		expect(successorRows('robot', 2, '')).toEqual([]);
		expect(successorRows('romania', 2, 'A DD')).toEqual([]);
	});
});

describe('search from the start state (slides 13–26)', () => {
	it('Romania: BFS finds the fewest steps, UCS the cheapest path', () => {
		const bfs = basicSearch('romania', 2, 'bfs');
		expect(bfs.mode).toBe('graph');
		expect(bfs.solution!.states).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(bfs.solution!.cost).toBe(450);
		const ucs = basicSearch('romania', 2, 'ucs');
		expect(ucs.solution!.states).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Pitesti',
			'Bucharest'
		]);
		expect(ucs.solution!.cost).toBe(418);
	});

	it('vacuum world: Suck, Right, Suck; UCS expands in the BFS order', () => {
		const bfs = basicSearch('vacuum', 2, 'bfs');
		expect(bfs.solution!.states).toEqual(['A DD', 'A CD', 'B CD', 'B CC']);
		expect(bfs.solution!.actions).toEqual(['Suck', 'Right', 'Suck']);
		expect(basicSearch('vacuum', 2, 'ucs').order).toEqual(bfs.order);
		expect(basicSearch('vacuum', 4, 'bfs').solution!.cost).toBe(7);
	});
});

describe('graph text for the search tool', () => {
	it('Romania with its heuristic and positions', () => {
		const { spec, diagnostics } = parseGraphText(searchToolGraph('romania', 2));
		expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		expect(spec!.start).toBe('Arad');
		expect(spec!.h?.Arad).toBe(366);
	});

	it('the vacuum state space with one edge per pair of states', () => {
		for (const n of [2, 3, 4]) {
			const { spec, diagnostics } = parseGraphText(searchToolGraph('vacuum', n));
			expect(diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
			expect(spec!.graph.directed).toBe(true);
			expect(spec!.graph.nodes).toHaveLength(n * 2 ** n);
			expect(spec!.start).toBe(vacuumStart(n));
			expect(spec!.goals).toHaveLength(n);
		}
		// Two squares: 24 transitions, four states with two self-loops each.
		expect(parseGraphText(searchToolGraph('vacuum', 2)).spec!.graph.edges).toHaveLength(20);
	});
});

describe('step sentences', () => {
	it('name the actions in the vacuum world and each repeated state once', () => {
		const r = basicSearch('vacuum', 2, 'bfs');
		expect(describeBasicStep(r, 0, true)).toBe('Initialize the frontier with A DD.');
		expect(describeBasicStep(r, 1, true)).toBe(
			'Take A DD off the frontier. Not a goal; expand it: Left → A DD, Right → B DD, Suck → A CD. A DD is in the explored set; not added.'
		);
		// B DC: Right and Suck change nothing.
		const i = r.steps.findIndex((s) => s.kind === 'expand' && r.nodes[s.node!].key === 'B DC');
		expect(describeBasicStep(r, i, true)).toMatch(
			/expand it: Left → A DC, Right → B DC, Suck → B DC\. B DC is in the explored set; not added\.$/
		);
		const last = r.steps.length - 1;
		expect(describeBasicStep(r, last, true)).toBe(describeStep(r, last));
	});

	it('UCS notes frontier states with a path cost as low; Romania uses the standard sentences', () => {
		const u = basicSearch('vacuum', 3, 'ucs');
		const texts = u.steps.map((_, i) => describeBasicStep(u, i, true));
		expect(texts[1]).toMatch(/^Take A DDD off the frontier \(g = 0\)\./);
		expect(texts.some((t) => t.includes('already on the frontier with a path cost as low'))).toBe(
			true
		);
		const r = basicSearch('romania', 2, 'bfs');
		expect(describeBasicStep(r, 1, false)).toBe(describeStep(r, 1));
		expect(describeBasicStep(r, 99, true)).toBe('');
	});
});
