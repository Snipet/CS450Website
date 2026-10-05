import { describe, expect, it } from 'vitest';
import { evaluate } from '$lib/theory/lisp';
import { DEFAULT_PRESET, LISP_PRESETS, matchPreset } from './presets';

describe('Lisp presets', () => {
	it('have unique ids, groups, descriptions and code that reads', () => {
		const ids = LISP_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of LISP_PRESETS) {
			expect(p.group).toBeTruthy();
			expect(p.description).toBeTruthy();
			expect(p.cite).toBeUndefined();
			expect(evaluate(p.value.code).read).toBe(true);
		}
	});

	it('run without errors, except the ones about errors', () => {
		for (const p of LISP_PRESETS) {
			const errors = evaluate(p.value.code).forms.filter((f) => f.error);
			if (p.group === 'Errors and limits') expect(errors.length).toBeGreaterThan(0);
			else expect(errors.map((f) => f.error!.message)).toEqual([]);
		}
	});

	it('the factorial preset is the default and matches its own code', () => {
		expect(DEFAULT_PRESET.id).toBe('factorial');
		expect(matchPreset(DEFAULT_PRESET.value.code)?.id).toBe('factorial');
		expect(matchPreset('(+ 1 2)')).toBeNull();
		expect(evaluate(DEFAULT_PRESET.value.code).forms.map((f) => f.printed)).toEqual([
			'FACT',
			'6',
			'2432902008176640000',
			'(1 1 2 6 24 120)'
		]);
	});
});
