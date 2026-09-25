import { describe, expect, it } from 'vitest';
import type { LinkStates } from '$lib/tools/links';
import { problemText } from './problems';
import {
	MAX_GRAPH_TEXT,
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
