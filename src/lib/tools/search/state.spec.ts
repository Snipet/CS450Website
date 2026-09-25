import { describe, expect, it } from 'vitest';
import {
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	formatGraphText,
	parseGraphText
} from '$lib/theory/graphs';
import type { LinkStates } from '$lib/tools/links';
import {
	DEFAULT_MAX_EXPANSIONS,
	MAX_MAX_EXPANSIONS,
	STRATEGIES,
	cleanSettings,
	completeSearchState,
	defaultSearchState,
	defaultShape,
	isSavedSearchState,
	isValidGraphText,
	settingsOf
} from './state';

const tinyText = formatGraphText(TINY_PROBLEM, { positions: true });

describe('search tool state', () => {
	it('opens on A* tree search from Arad to Bucharest, drawn as the map', () => {
		const d = defaultSearchState();
		expect(parseGraphText(d.graph).spec).toEqual(ROMANIA_PROBLEM);
		expect(d).toMatchObject({
			strategy: 'astar',
			mode: 'tree',
			goalTest: 'expand',
			depthLimit: 3,
			weight: 2,
			order: 'alphabetical',
			annotation: 'auto',
			shape: 'square',
			maxExpansions: DEFAULT_MAX_EXPANSIONS,
			step: 0
		});
		expect(DEFAULT_MAX_EXPANSIONS).toBe(500);
	});

	it('offers every strategy in lecture order', () => {
		expect(STRATEGIES).toEqual(['bfs', 'dfs', 'dls', 'ids', 'ucs', 'greedy', 'astar', 'wastar']);
	});

	it('accepts a cross-tool link (LinkStates["search"]) and fills in the defaults', () => {
		const link: LinkStates['search'] = { graph: tinyText, strategy: 'ucs', mode: 'graph' };
		expect(isSavedSearchState(link)).toBe(true);
		expect(completeSearchState(link)).toEqual({
			...defaultSearchState(),
			graph: tinyText,
			strategy: 'ucs',
			mode: 'graph',
			shape: 'circle'
		});
		expect(isSavedSearchState({ graph: tinyText })).toBe(true);
	});

	it('keeps every field of full saved state', () => {
		const full = {
			...defaultSearchState(),
			graph: tinyText,
			strategy: 'wastar' as const,
			weight: 3.5,
			goalTest: 'generate' as const,
			order: 'listed' as const,
			annotation: 'fgh' as const,
			shape: 'circle' as const,
			maxExpansions: MAX_MAX_EXPANSIONS,
			step: 12
		};
		expect(isSavedSearchState(full)).toBe(true);
		expect(completeSearchState(full)).toEqual(full);
	});

	it('rejects bad values', () => {
		const graph = tinyText;
		for (const bad of [
			null,
			'graph',
			[],
			{},
			{ graph: 5 },
			{ graph: 'A - B 1' }, // no start or goal
			{ graph: '' },
			{ graph, strategy: 'dijkstra' },
			{ graph, mode: 'explored' },
			{ graph, goalTest: 'always' },
			{ graph, depthLimit: -1 },
			{ graph, depthLimit: 2.5 },
			{ graph, depthLimit: 51 },
			{ graph, weight: 0.5 },
			{ graph, weight: Number.NaN },
			{ graph, weight: 11 },
			{ graph, order: 'random' },
			{ graph, annotation: 'gh' },
			{ graph, shape: 'hexagon' },
			{ graph, maxExpansions: 0 },
			{ graph, maxExpansions: MAX_MAX_EXPANSIONS + 1 },
			{ graph, step: -1 },
			{ graph, step: 1.5 }
		])
			expect(isSavedSearchState(bad), JSON.stringify(bad)).toBe(false);
	});

	it('draws the Romania map with squares and other graphs with circles', () => {
		expect(defaultShape(formatGraphText(ROMANIA_PROBLEM))).toBe('square');
		expect(defaultShape(formatGraphText(ROMANIA_IASI_FAGARAS, { positions: true }))).toBe('square');
		expect(defaultShape(tinyText)).toBe('circle');
		expect(defaultShape('not a graph')).toBe('circle');
		expect(completeSearchState({ graph: formatGraphText(ROMANIA_PROBLEM) }).shape).toBe('square');
	});

	it('validates graph text and splits off the settings', () => {
		expect(isValidGraphText(tinyText)).toBe(true);
		expect(isValidGraphText('start: A\ngoal: B\nA - B -3')).toBe(false);
		const { graph, step, ...rest } = defaultSearchState();
		expect(graph).toBeTypeOf('string');
		expect(step).toBe(0);
		expect(settingsOf(defaultSearchState())).toEqual(rest);
	});

	it('cleanSettings keeps the numbers a number field reports valid for the run and the link', () => {
		// A number field reports 2.5 while "2.5" is typed into an integer field.
		const patch = cleanSettings({ depthLimit: 2.5, maxExpansions: 30.2, weight: 1.3 });
		expect(patch).toEqual({ depthLimit: 3, maxExpansions: 30, weight: 1.3 });
		const saved = { graph: tinyText, ...settingsOf(defaultSearchState()), ...patch, step: 0 };
		expect(isSavedSearchState(saved)).toBe(true);
		expect(cleanSettings({ depthLimit: -4, maxExpansions: 1e9, weight: 99 })).toEqual({
			depthLimit: 0,
			maxExpansions: MAX_MAX_EXPANSIONS,
			weight: 10
		});
		expect(cleanSettings({ depthLimit: NaN, maxExpansions: NaN, weight: NaN })).toEqual({
			depthLimit: 0,
			maxExpansions: 1,
			weight: 2
		});
		expect(cleanSettings({ strategy: 'bfs' })).toEqual({ strategy: 'bfs' });
		// Without cleaning, such a state is rejected when the link is opened.
		expect(isSavedSearchState({ graph: tinyText, depthLimit: 2.5 })).toBe(false);
	});
});
