/**
 * What the Lisp tool's components show: one-line form text, output text,
 * run summaries, trace groups and step labels, and highlighted code
 * segments for read-only code.
 */
import type { HighlightToken } from '$lib/components/ui/types';
import type { RunResult, TraceEntry } from '$lib/theory/lisp';

/** `text` on one line (whitespace runs collapsed), cut at `max` characters with "…". */
export function oneLine(text: string, max = 120): string {
	const flat = text.replace(/\s+/g, ' ').trim();
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Output as shown under a result: PRINT's leading newline is dropped. */
export function displayOutput(output: string): string {
	return output.startsWith('\n') ? output.slice(1) : output;
}

const plural = (n: number, word: string) =>
	`${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

/** One sentence about a run, for the results' live region. */
export function summarizeRun(run: RunResult): string {
	if (!run.read) {
		const n = run.diagnostics.filter((d) => d.severity === 'error').length;
		return `Not run: the code has ${plural(n, 'reading error')}.`;
	}
	if (!run.forms.length) return 'Nothing to evaluate.';
	const errors = run.forms.filter((f) => f.error).length;
	const values = run.forms.length - errors;
	return `Evaluated ${plural(run.forms.length, 'form')}: ${plural(values, 'value')}, ${plural(errors, 'error')}.`;
}

export interface TraceGroup {
	/** Index of the top-level form. */
	form: number;
	/** The form's text on one line. */
	text: string;
	/** The group's entries are `trace.slice(start, end)`. */
	start: number;
	end: number;
}

/** The trace split by top-level form (forms without traced calls are left out). */
export function traceGroups(run: RunResult): TraceGroup[] {
	return run.forms
		.filter((f) => f.traceEnd > f.traceStart)
		.map((f) => ({
			form: f.index,
			text: oneLine(f.text, 80),
			start: f.traceStart,
			end: f.traceEnd
		}));
}

/** The step label for trace line `i`: "Depth 1: call (FACT 2)" or "Depth 1: FACT returned 2". */
export function describeTraceLine(entries: readonly TraceEntry[], i: number): string {
	const e = entries[i];
	if (!e) return 'No calls traced.';
	return `Depth ${e.depth}: ${e.kind === 'call' ? `call ${e.text}` : `${e.name} returned ${e.text}`}`;
}

export interface CodeSegment {
	text: string;
	className?: string;
}

/** Splits `text` into plain and highlighted runs (tokens ascending, not overlapping). */
export function codeSegments(text: string, tokens: readonly HighlightToken[]): CodeSegment[] {
	const out: CodeSegment[] = [];
	let at = 0;
	for (const t of tokens) {
		const from = Math.max(t.from, at);
		const to = Math.min(t.to, text.length);
		if (to <= from) continue;
		if (from > at) out.push({ text: text.slice(at, from) });
		out.push({ text: text.slice(from, to), className: t.className });
		at = to;
	}
	if (at < text.length) out.push({ text: text.slice(at) });
	return out;
}
