import { describe, expect, it } from 'vitest';
import { FUNCTION_NAMES, SPECIAL_FORMS, evaluate } from '$lib/theory/lisp';
import { REFERENCE, REFERENCE_NOTES } from './reference';

const CXR = /^C[AD]{2,4}R$/;

describe('reference card', () => {
	it('lists only supported names, each once', () => {
		const supported = new Set([...SPECIAL_FORMS, ...FUNCTION_NAMES]);
		const listed = REFERENCE.flatMap((g) => g.names.map((n) => n.toUpperCase()));
		expect(listed.filter((n) => !supported.has(n))).toEqual([]);
		expect(new Set(listed).size).toBe(listed.length);
	});

	it('lists every supported name (cXr combinations are summarized)', () => {
		const listed = new Set(REFERENCE.flatMap((g) => g.names.map((n) => n.toUpperCase())));
		const missing = [...SPECIAL_FORMS, ...FUNCTION_NAMES].filter(
			(n) => !listed.has(n) && !CXR.test(n)
		);
		expect(missing).toEqual([]);
	});

	it('every example prints the stated result', () => {
		for (const g of REFERENCE)
			for (const ex of g.examples) {
				const r = evaluate(ex.code);
				expect([ex.code, r.forms.map((f) => f.printed ?? f.error?.message)]).toEqual([
					ex.code,
					[ex.result]
				]);
			}
	});

	it('has notes', () => {
		expect(REFERENCE_NOTES.length).toBeGreaterThan(3);
		expect(REFERENCE_NOTES.join(' ')).toContain('200,000');
	});
});
