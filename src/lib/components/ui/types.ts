import type { Citation } from '$lib/lectures';

/** An example input a tool can load, citing the slide it comes from. */
export interface Preset<T> {
	id: string;
	label: string;
	/** Presets with the same group are listed together under that heading. */
	group?: string;
	description?: string;
	cite?: Citation;
	value: T;
}

/**
 * Semantic colors shared by highlights, chips, and badges. A number selects the
 * categorical palette (`--tok-0` … `--tok-5`) modulo 6, so an index can be
 * passed directly.
 */
export type SemanticTone =
	'active' | 'accept' | 'reject' | 'info' | 'explored' | 'heuristic' | 'muted' | 'accent';
export type Tone = SemanticTone | number;

/** Token coloring returned by a `CodeEditor` highlighter, `[from, to)` string indices. */
export interface HighlightToken {
	from: number;
	to: number;
	/** One of the global `hl-*` classes in app.css, or any global class. */
	className: string;
}

export type Size = 'sm' | 'md';
