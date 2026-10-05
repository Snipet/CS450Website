import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, TINY_PROBLEM, formatGraphText, parseGraphText } from '$lib/theory/graphs';
import type { LinkStates } from '$lib/tools/links';
import {
	DEFAULT_MAX_EXPANSIONS,
	MAX_MAX_EXPANSIONS,
	MIN_MAX_EXPANSIONS,
	ROMANIA_TEXT,
	cleanMaxExpansions,
	completeRbfsState,
	defaultRbfsState,
	defaultShape,
	isSavedRbfsState,
	isValidGraphText
} from './state';

const tinyText = formatGraphText(TINY_PROBLEM, { positions: true });

describe('RBFS tool state', () => {
	it('opens on Arad to Bucharest with straight-line distances, drawn as the map', () => {
		const d = defaultRbfsState();
		expect(parseGraphText(d.graph).spec).toEqual(ROMANIA_PROBLEM);
		expect(d).toEqual({
			graph: ROMANIA_TEXT,
			shape: 'square',
			maxExpansions: DEFAULT_MAX_EXPANSIONS,
			step: 0
		});
	});

	it('accepts the LinkStates shape and its own fields', () => {
		const link: LinkStates['rbfs'] = { graph: tinyText };
		expect(isSavedRbfsState(link)).toBe(true);
		expect(isSavedRbfsState({})).toBe(true);
		expect(
			isSavedRbfsState({ graph: tinyText, shape: 'circle', maxExpansions: 40, step: 3, extra: 1 })
		).toBe(true);
	});

	it('rejects values of the wrong shape', () => {
		for (const bad of [
			null,
			undefined,
			'graph',
			42,
			[],
			[tinyText],
			{ graph: 7 },
			{ graph: 'start: A' }, // no goal: an error
			{ graph: tinyText, shape: 'hexagon' },
			{ graph: tinyText, maxExpansions: 0 },
			{ graph: tinyText, maxExpansions: MAX_MAX_EXPANSIONS + 1 },
			{ graph: tinyText, maxExpansions: 2.5 },
			{ graph: tinyText, step: -1 },
			{ graph: tinyText, step: 1.5 },
			{ step: '3' }
		])
			expect(isSavedRbfsState(bad), JSON.stringify(bad)).toBe(false);
	});

	it('fills in defaults, drawing the Romania map as squares and other graphs as circles', () => {
		expect(completeRbfsState({})).toEqual(defaultRbfsState());
		expect(completeRbfsState({ graph: tinyText })).toEqual({
			graph: tinyText,
			shape: 'circle',
			maxExpansions: DEFAULT_MAX_EXPANSIONS,
			step: 0
		});
		expect(completeRbfsState({ graph: ROMANIA_TEXT, shape: 'circle', step: 4 })).toMatchObject({
			shape: 'circle',
			step: 4
		});
		expect(defaultShape(ROMANIA_TEXT)).toBe('square');
		expect(defaultShape(tinyText)).toBe('circle');
		expect(defaultShape('not a graph')).toBe('circle');
	});

	it('checks graph text', () => {
		expect(isValidGraphText(tinyText)).toBe(true);
		expect(isValidGraphText('start: A\ngoal: B\nA - B -3')).toBe(false);
	});

	it('cleans a typed expansion limit', () => {
		expect(cleanMaxExpansions(40)).toBe(40);
		expect(cleanMaxExpansions(40.4)).toBe(40);
		expect(cleanMaxExpansions(0)).toBe(MIN_MAX_EXPANSIONS);
		expect(cleanMaxExpansions(-5)).toBe(MIN_MAX_EXPANSIONS);
		expect(cleanMaxExpansions(1e9)).toBe(MAX_MAX_EXPANSIONS);
		expect(cleanMaxExpansions(NaN)).toBe(MIN_MAX_EXPANSIONS);
		expect(cleanMaxExpansions(Infinity)).toBe(MAX_MAX_EXPANSIONS);
		expect(cleanMaxExpansions(-Infinity)).toBe(MIN_MAX_EXPANSIONS);
	});
});
