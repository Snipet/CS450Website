import { describe, expect, it } from 'vitest';
import { REFLEX_TABLE, tableFromActions } from '$lib/theory/agents/vacuum';
import type { LinkStates } from '$lib/tools/links';
import {
	MAX_SEED,
	MAX_TOOL_STEPS,
	completeVacuumState,
	decodeTable,
	defaultVacuumState,
	encodeTable,
	isSavedVacuumState
} from './state';

describe('table encoding', () => {
	it('writes four action letters in percept order', () => {
		expect(encodeTable(REFLEX_TABLE)).toBe('RSLS');
		expect(encodeTable(tableFromActions(['NoOp', 'Suck', 'Left', 'Right']))).toBe('NSLR');
	});

	it('reads them back, case-insensitively, and rejects anything else', () => {
		expect(decodeTable('RSLS')).toEqual(REFLEX_TABLE);
		expect(decodeTable('nsnS')).toEqual(tableFromActions(['NoOp', 'Suck', 'NoOp', 'Suck']));
		expect(decodeTable('RSL')).toBeNull();
		expect(decodeTable('RSLSX')).toBeNull();
		expect(decodeTable('RSLX')).toBeNull();
	});
});

describe('URL state', () => {
	it('starts from the slide 3 reflex agent in A DD', () => {
		expect(defaultVacuumState()).toEqual({
			program: 'reflex',
			table: 'RSLS',
			initial: 'A DD',
			steps: 10,
			p: 0,
			seed: 1,
			measure: 'clean-squares'
		});
	});

	it('accepts the LinkStates shape and full states', () => {
		const link: LinkStates['vacuum'] = { program: 'reflex-state' };
		expect(isSavedVacuumState(link)).toBe(true);
		expect(isSavedVacuumState({})).toBe(true);
		expect(isSavedVacuumState(defaultVacuumState())).toBe(true);
		expect(
			isSavedVacuumState({ ...defaultVacuumState(), p: 1, steps: MAX_TOOL_STEPS, seed: MAX_SEED })
		).toBe(true);
	});

	it('rejects fields of the wrong type or range', () => {
		for (const bad of [
			null,
			[],
			'reflex',
			{ program: 'smart' },
			{ table: 'RS' },
			{ table: 3 },
			{ initial: 'C DD' },
			{ steps: 0 },
			{ steps: MAX_TOOL_STEPS + 1 },
			{ steps: 2.5 },
			{ p: -0.1 },
			{ p: 1.5 },
			{ p: '0.1' },
			{ seed: -1 },
			{ seed: 1.5 },
			{ measure: 'moves' }
		]) {
			expect(isSavedVacuumState(bad)).toBe(false);
		}
	});

	it('completes partial states with defaults and normalizes names', () => {
		expect(completeVacuumState({ program: 'random' })).toEqual({
			...defaultVacuumState(),
			program: 'random'
		});
		const s = completeVacuumState({ initial: 'b cd', table: 'nsns', p: 0.2 });
		expect(s.initial).toBe('B CD');
		expect(s.table).toBe('NSNS');
		expect(s.p).toBe(0.2);
	});
});
