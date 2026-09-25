import { describe, expect, it } from 'vitest';
import {
	DIMENSION_IDS,
	courseMethods,
	isEnvironmentProfile,
	profileDiagnostics
} from '$lib/theory/agents/environments';
import { POKER, searchSettingFits } from './questions';

describe('search setting question', () => {
	it('finds that only the word jumble solver fits among the slide 17 examples', () => {
		expect(searchSettingFits()).toEqual([
			{
				id: 'word-jumble',
				name: 'Word jumble solver',
				fits: true,
				differs: [],
				missing: ['known']
			},
			{
				id: 'chess-clock',
				name: 'Chess with a clock',
				fits: false,
				differs: ['strategic'],
				missing: ['known']
			},
			{
				id: 'scrabble',
				name: 'Scrabble',
				fits: false,
				differs: ['partially observable', 'stochastic'],
				missing: ['known']
			},
			{
				id: 'autonomous-driving',
				name: 'Autonomous driving',
				fits: false,
				differs: ['partially observable', 'stochastic', 'continuous'],
				missing: ['known']
			}
		]);
	});

	it('accepts other example ids and skips unknown ones', () => {
		expect(searchSettingFits(['romania', 'nope', 'vacuum'])).toEqual([
			{ id: 'romania', name: 'Route finding in Romania', fits: true, differs: [], missing: [] },
			{
				id: 'vacuum',
				name: 'Vacuum world',
				fits: false,
				differs: ['partially observable'],
				missing: []
			}
		]);
	});
});

describe('poker question', () => {
	it('classifies every dimension with a reason', () => {
		expect(isEnvironmentProfile(POKER.values)).toBe(true);
		expect(Object.keys(POKER.values)).toEqual(DIMENSION_IDS);
		expect(Object.keys(POKER.reasons)).toEqual(DIMENSION_IDS);
		expect(profileDiagnostics(POKER.values)).toEqual([]);
	});

	it('falls under games and Markov decision processes', () => {
		expect(courseMethods(POKER.values).map((m) => [m.row.id, m.status])).toEqual([
			['games', 'applies'],
			['stochastic-sequential-known', 'applies']
		]);
	});
});
