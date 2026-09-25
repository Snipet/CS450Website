import { describe, expect, it } from 'vitest';
import type { LinkStates } from '$lib/tools/links';
import { problemText } from './problems';
import { hanoiFacts, nodeCounts } from './counts';
import {
	MAX_B,
	MAX_DISKS,
	MAX_GRAPH_TEXT,
	cleanCounts,
	cleanDisks,
	completeStrategiesState,
	defaultStrategiesState,
	isSavedStrategiesState,
	savedStateOf
} from './state';

describe('defaultStrategiesState', () => {
	it('opens on Romania with tree search and b = 10, d = 5', () => {
		expect(defaultStrategiesState()).toEqual({
			preset: 'romania',
			graph: null,
			mode: 'tree',
			alpha: 2,
			limit: 1000,
			b: 10,
			d: 5,
			m: 10,
			cStar: 10,
			eps: 1,
			disks: 5
		});
	});
});

describe('isSavedStrategiesState', () => {
	it("accepts LinkStates['strategies']", () => {
		const link: LinkStates['strategies'] = { graph: 'start: S\ngoal: G\nS -> G 1' };
		expect(isSavedStrategiesState(link)).toBe(true);
		expect(isSavedStrategiesState({})).toBe(true);
	});

	it('accepts graph text with errors (the page shows them)', () => {
		expect(isSavedStrategiesState({ graph: 'start: S\nS -> -> G' })).toBe(true);
		expect(isSavedStrategiesState({ graph: null })).toBe(true);
	});

	it('accepts the full state', () => {
		expect(isSavedStrategiesState(savedStateOf(defaultStrategiesState()))).toBe(true);
	});

	it('rejects wrong shapes and out-of-range fields', () => {
		for (const bad of [
			null,
			[],
			'x',
			{ graph: 3 },
			{ graph: 'x'.repeat(MAX_GRAPH_TEXT + 1) },
			{ preset: 'nope' },
			{ mode: 'bidirectional' },
			{ alpha: 0.5 },
			{ alpha: 11 },
			{ limit: 0 },
			{ limit: 10.5 },
			{ limit: 20_000 },
			{ b: 0 },
			{ b: 1001 },
			{ d: -1 },
			{ m: 1.5 },
			{ cStar: -1 },
			{ eps: 0 },
			{ disks: 0 },
			{ disks: 65 }
		]) {
			expect(isSavedStrategiesState(bad), JSON.stringify(bad)?.slice(0, 40)).toBe(false);
		}
	});
});

describe('completeStrategiesState', () => {
	it('fills in defaults', () => {
		expect(completeStrategiesState({ mode: 'graph', b: 3 })).toEqual({
			...defaultStrategiesState(),
			mode: 'graph',
			b: 3
		});
	});

	it('keeps graph text from a link', () => {
		const graph = 'start: S\ngoal: G\nS -> G 1';
		expect(completeStrategiesState({ graph })).toMatchObject({ graph, preset: 'romania' });
	});

	it('loads the text of a lecture problem as that problem', () => {
		const s = completeStrategiesState({ graph: problemText('tiny') });
		expect(s.graph).toBeNull();
		expect(s.preset).toBe('tiny');
	});
});

describe('savedStateOf', () => {
	it('writes the preset, or the graph instead of it', () => {
		const d = defaultStrategiesState();
		const saved = savedStateOf(d);
		expect(saved.preset).toBe('romania');
		expect('graph' in saved).toBe(false);
		const withGraph = savedStateOf({ ...d, graph: 'start: S' });
		expect(withGraph.graph).toBe('start: S');
		expect('preset' in withGraph).toBe(false);
		expect(completeStrategiesState(saved)).toEqual(d);
	});
});

describe('cleanCounts and cleanDisks', () => {
	it('turn values typed into the number fields into valid count inputs', () => {
		// A number field reports 2.5 while "2.5" is typed; the counts throw on it.
		const raw = { b: 2.5, d: 3.4, m: -1, cStar: 10, eps: 1 };
		expect(() => nodeCounts(raw)).toThrow(RangeError);
		const clean = cleanCounts(raw);
		expect(clean).toEqual({ b: 3, d: 3, m: 0, cStar: 10, eps: 1 });
		expect(nodeCounts(clean).bfs.total).toBe(40n);
		expect(isSavedStrategiesState({ ...defaultStrategiesState(), ...clean })).toBe(true);
		expect(cleanCounts({ b: NaN, d: Infinity, m: 5, cStar: NaN, eps: 0 })).toEqual({
			b: 1,
			d: 1000,
			m: 5,
			cStar: 0,
			eps: 0.1
		});
		expect(cleanCounts({ b: 1e9, d: 0, m: 0, cStar: 1e9, eps: 1e9 }).b).toBe(MAX_B);
	});

	it('cleanDisks keeps the Hanoi note from throwing', () => {
		expect(() => hanoiFacts(3.5)).toThrow(RangeError);
		expect(cleanDisks(3.5)).toBe(4);
		expect(hanoiFacts(cleanDisks(3.5)).moves).toBe(15n);
		expect(cleanDisks(0)).toBe(1);
		expect(cleanDisks(NaN)).toBe(1);
		expect(cleanDisks(1000)).toBe(MAX_DISKS);
	});
});
