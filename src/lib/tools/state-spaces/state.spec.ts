import { describe, expect, it } from 'vitest';
import type { LinkStates } from '$lib/tools/links';
import { SLIDE_START } from '$lib/theory/puzzle';
import {
	clampSquares,
	completeStateSpaces,
	configOf,
	defaultStateSpaces,
	isSavedStateSpaces,
	stateForScenario
} from './state';

describe('state spaces URL state', () => {
	it('opens on Romania with breadth-first search', () => {
		expect(defaultStateSpaces()).toEqual({
			problem: 'romania',
			squares: 2,
			selected: 'Arad',
			strategy: 'bfs',
			step: 0
		});
	});

	it('accepts the LinkStates shape and its own fields', () => {
		const links: LinkStates['state-spaces'][] = [
			{},
			{ problem: 'vacuum', squares: 2 },
			{ problem: 'puzzle' },
			{ squares: 5 }
		];
		for (const l of links) expect(isSavedStateSpaces(l)).toBe(true);
		expect(isSavedStateSpaces({ ...defaultStateSpaces(), selected: null })).toBe(true);
	});

	it('rejects values of the wrong shape', () => {
		for (const bad of [
			null,
			[],
			'romania',
			{ problem: 'chess' },
			{ squares: 2.5 },
			{ squares: 0 },
			{ squares: 11 },
			{ selected: 4 },
			{ strategy: 'dfs' },
			{ step: -1 }
		]) {
			expect(isSavedStateSpaces(bad), JSON.stringify(bad)).toBe(false);
		}
	});

	it('completes saved state: squares clamped, foreign states replaced', () => {
		expect(completeStateSpaces({ problem: 'vacuum', squares: 2 })).toEqual({
			problem: 'vacuum',
			squares: 2,
			selected: 'A DD',
			strategy: 'bfs',
			step: 0
		});
		expect(completeStateSpaces({ problem: 'vacuum', squares: 7 }).squares).toBe(4);
		expect(completeStateSpaces({ problem: 'vacuum', squares: 1 }).selected).toBe('A DD');
		expect(completeStateSpaces({ problem: 'vacuum', squares: 3, selected: 'B CDC' }).selected).toBe(
			'B CDC'
		);
		expect(completeStateSpaces({ problem: 'romania', selected: 'B CDC' }).selected).toBe('Arad');
		expect(completeStateSpaces({ problem: 'puzzle', selected: null }).selected).toBe(SLIDE_START);
		expect(completeStateSpaces({ problem: 'robot', step: 3, strategy: 'ucs' })).toMatchObject({
			selected: '',
			step: 3,
			strategy: 'ucs'
		});
	});

	it('scenarios start at the initial state and the first step', () => {
		expect(stateForScenario({ problem: 'vacuum', squares: 3, strategy: 'ucs' })).toEqual({
			problem: 'vacuum',
			squares: 3,
			selected: 'A DDD',
			strategy: 'ucs',
			step: 0
		});
		expect(clampSquares(3.4)).toBe(3);
		expect(configOf({ ...defaultStateSpaces(), step: 5 })).toEqual({
			problem: 'romania',
			squares: 2,
			selected: 'Arad',
			strategy: 'bfs'
		});
		expect(clampSquares(-1)).toBe(2);
	});
});
