import { describe, expect, it } from 'vitest';
import { decks, type Citation } from '$lib/lectures';
import { parseGraphText } from '$lib/theory/graphs';
import { decodeGrid } from '$lib/theory/grid';
import { parseGameTree } from '$lib/theory/games';
import { evaluate } from '$lib/theory/lisp';
import { EXERCISES } from '$lib/tools/lisp/exercises';
import {
	ALGORITHMS,
	ENVIRONMENT_TYPES,
	GLOSSARY,
	ITEM_ORDER,
	LISP_FORMS,
	LISP_PATTERNS,
	LISP_TRACE,
	POINT_GROUPS,
	PROS_CONS,
	SHEET,
	itemById,
	sectionOf
} from './sheet';

const allItems = SHEET.flatMap((s) => s.items);

function citations(): Citation[] {
	return [
		...allItems.flatMap((i) => [
			...i.facts.flatMap((f) => (f.cite ? [f.cite] : [])),
			...(i.questions ?? []).map((q) => q.cite)
		]),
		...ENVIRONMENT_TYPES.flatMap((t) => (t.cite ? [t.cite] : [])),
		...GLOSSARY.flatMap((g) => g.terms.flatMap((t) => (t.cite ? [t.cite] : []))),
		...ALGORITHMS.map((a) => a.cite)
	];
}

describe('SHEET', () => {
	it('follows the review sheet: four sections with items lettered in order', () => {
		expect(SHEET.map((s) => [s.number, s.title, s.items.length])).toEqual([
			[1, 'Introductory lectures', 3],
			[2, 'Lisp', 2],
			[3, 'Search', 16],
			[4, 'Readings', 1]
		]);
		for (const s of SHEET)
			expect(s.items.map((i) => i.letter).join('')).toBe(
				'abcdefghijklmnop'.slice(0, s.items.length)
			);
	});

	it('has unique ids that can serve as element ids', () => {
		const ids = [...SHEET.map((s) => s.id), ...ITEM_ORDER];
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z][a-z-]*$/);
		expect(ITEM_ORDER).toEqual(allItems.map((i) => i.id));
		expect(itemById('search-bfs')?.title).toBe('Breadth-first');
		expect(sectionOf('search-bfs')?.id).toBe('search');
		expect(itemById('nope')).toBeUndefined();
	});

	it('cites slides that exist', () => {
		for (const c of citations()) {
			const deck = decks[c.deck];
			expect(deck).toBeDefined();
			const [a, b] = typeof c.slide === 'number' ? [c.slide, c.slide] : (c.slide ?? [1, 1]);
			expect(a).toBeGreaterThanOrEqual(1);
			expect(b).toBeGreaterThanOrEqual(a);
			expect(b).toBeLessThanOrEqual(deck.slides);
		}
	});

	it('opens the tools on input they accept', () => {
		for (const item of allItems) {
			for (const ex of item.examples) {
				if (ex.slug === 'search' || ex.slug === 'heuristics') {
					const { spec, diagnostics } = parseGraphText(ex.state.graph);
					expect(
						diagnostics.filter((d) => d.severity === 'error'),
						ex.label
					).toEqual([]);
					expect(spec?.graph.nodes.length).toBeGreaterThan(0);
				}
				if (ex.slug === 'minimax') {
					const { tree, diagnostics } = parseGameTree(ex.state.tree);
					expect(tree, ex.label).not.toBeNull();
					expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
				}
				if (ex.slug === 'grid') expect(decodeGrid(ex.state.grid), ex.label).not.toBeNull();
				if (ex.slug === 'eight-puzzle') expect(ex.state.start).toMatch(/^[0-8]{9}$/);
				if (ex.slug === 'lisp' && ex.state.exercise)
					expect(
						EXERCISES.map((e) => e.id),
						ex.label
					).toContain(ex.state.exercise);
			}
		}
	});

	it('puts every section in exactly one point group', () => {
		const grouped = POINT_GROUPS.flatMap((g) => g.sections).sort();
		expect(grouped).toEqual(SHEET.map((s) => s.id).sort());
	});

	it('covers every method in the pros-and-cons and algorithm tables', () => {
		expect(PROS_CONS.map((p) => p.name)).toEqual(ALGORITHMS.map((a) => a.name));
	});

	it('never names a person behind the course', () => {
		const text = JSON.stringify({ SHEET, GLOSSARY, ENVIRONMENT_TYPES, ALGORITHMS, PROS_CONS });
		expect(text).not.toMatch(/Schwartz|Dr\.|Professor|university/i);
	});

	it('gives Lisp values the evaluator agrees with', () => {
		for (const f of LISP_FORMS) {
			const run = evaluate(f.form);
			expect(
				run.forms.map((x) => x.printed),
				f.form
			).toEqual([f.value]);
		}
		for (const p of LISP_PATTERNS) {
			const run = evaluate(`${p.code}\n${p.call}`);
			expect(run.forms.at(-1)?.printed, p.title).toBe(p.value);
		}
		const run = evaluate(`${LISP_TRACE.code}\n${LISP_TRACE.call}`);
		expect(run.forms.at(-1)?.printed).toBe(LISP_TRACE.steps.at(-1));
		for (const step of LISP_TRACE.steps.slice(0, -1)) {
			// Each line of the trace is an expression with the same value.
			const again = evaluate(`${LISP_TRACE.code}\n${step}`);
			expect(again.forms.at(-1)?.printed, step).toBe('3');
		}
	});
});
