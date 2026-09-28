import { describe, expect, it } from 'vitest';
import { ASTAR_WRONG_PROBLEM } from '$lib/theory/graphs';
import type { LinkStates } from '$lib/tools/links';
import { specText } from './edit';
import { presetById } from './presets';
import {
	completeHeuristicsState,
	defaultHeuristicsState,
	isAlpha,
	isFactor,
	isHeuristicRecord,
	isSavedHeuristicsState,
	isSecondChoice
} from './state';

describe('heuristics tool state', () => {
	it('opens on Romania with the straight-line distance, compared with h = 0', () => {
		const d = defaultHeuristicsState();
		expect(d.graph).toBe(presetById('romania-sld')!.value.graph);
		expect(d).toMatchObject({
			second: { kind: 'zero' },
			alpha: 2,
			selected: null,
			preset: 'romania-sld'
		});
	});

	it('accepts a cross-tool link with only the graph (LinkStates["heuristics"])', () => {
		const link: LinkStates['heuristics'] = { graph: specText(ASTAR_WRONG_PROBLEM) };
		expect(isSavedHeuristicsState(link)).toBe(true);
		const s = completeHeuristicsState(link);
		expect(s).toEqual({
			graph: link.graph,
			second: { kind: 'zero' },
			alpha: 2,
			selected: null,
			preset: null
		});
	});

	it('rejects bad graphs and wrongly typed fields', () => {
		const graph = specText(ASTAR_WRONG_PROBLEM);
		expect(isSavedHeuristicsState(null)).toBe(false);
		expect(isSavedHeuristicsState([graph])).toBe(false);
		expect(isSavedHeuristicsState({ graph: 'A - B\nstart: A' })).toBe(false);
		expect(isSavedHeuristicsState({ graph, alpha: 0.5 })).toBe(false);
		expect(isSavedHeuristicsState({ graph, alpha: 11 })).toBe(false);
		expect(isSavedHeuristicsState({ graph, selected: 3 })).toBe(false);
		expect(isSavedHeuristicsState({ graph, preset: 3 })).toBe(false);
		expect(isSavedHeuristicsState({ graph, second: { kind: 'other' } })).toBe(false);
		expect(
			isSavedHeuristicsState({
				graph,
				second: { kind: 'scaled', factor: 0.5 },
				alpha: 3,
				selected: 'A',
				preset: 'astar-wrong'
			})
		).toBe(true);
	});

	it('checks the second heuristic', () => {
		expect(isSecondChoice({ kind: 'zero' })).toBe(true);
		expect(isSecondChoice({ kind: 'perfect' })).toBe(true);
		expect(isSecondChoice({ kind: 'preset' })).toBe(true);
		expect(isSecondChoice({ kind: 'scaled', factor: 2 })).toBe(true);
		expect(isSecondChoice({ kind: 'scaled' })).toBe(false);
		expect(isSecondChoice({ kind: 'scaled', factor: -1 })).toBe(false);
		expect(isSecondChoice({ kind: 'custom', h: { A: 1 } })).toBe(true);
		expect(isSecondChoice({ kind: 'custom', h: { A: -1 } })).toBe(false);
		expect(isSecondChoice({ kind: 'custom', h: [1] })).toBe(false);
		expect(isHeuristicRecord({ A: 1, B: 0 })).toBe(true);
		expect(isHeuristicRecord({ A: 'x' })).toBe(false);
		expect(isAlpha(1)).toBe(true);
		expect(isAlpha(Number.NaN)).toBe(false);
		expect(isFactor(0)).toBe(true);
		expect(isFactor(10.5)).toBe(false);
	});

	it('drops a selected state that is not in the graph and an unknown preset', () => {
		const graph = specText(ASTAR_WRONG_PROBLEM);
		const s = completeHeuristicsState({ graph, selected: 'Arad', preset: 'nope' });
		expect(s.selected).toBeNull();
		expect(s.preset).toBeNull();
		expect(completeHeuristicsState({ graph, selected: 'A', preset: 'astar-wrong' })).toMatchObject({
			selected: 'A',
			preset: 'astar-wrong'
		});
	});
});
