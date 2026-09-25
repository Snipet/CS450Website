import { describe, expect, it } from 'vitest';
import { ERAS } from './content';
import { completeHistoryState, defaultHistoryState, isEraId, isHistoryState } from './state';

describe('history URL state', () => {
	it('starts with no era highlighted', () => {
		expect(defaultHistoryState()).toEqual({ era: null });
	});

	it('recognizes era ids', () => {
		for (const e of ERAS) expect(isEraId(e.id)).toBe(true);
		expect(isEraId('bronze-age')).toBe(false);
		expect(isEraId(1943)).toBe(false);
	});

	it('validates saved state', () => {
		expect(isHistoryState({ era: null })).toBe(true);
		expect(isHistoryState({ era: 'expert-systems' })).toBe(true);
		expect(isHistoryState({ era: 'nope' })).toBe(false);
		expect(isHistoryState({})).toBe(true);
		expect(isHistoryState(null)).toBe(false);
		expect(isHistoryState([])).toBe(false);
	});

	it('fills in a missing era', () => {
		expect(completeHistoryState({})).toEqual({ era: null });
		expect(completeHistoryState({ era: 'big-data' })).toEqual({ era: 'big-data' });
	});
});
