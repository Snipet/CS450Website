/**
 * A location in user input: string offsets `[start, end)` into the text named
 * by `source` (`null` for a tool's main text).
 */
export interface Span {
	start: number;
	end: number;
	source: string | null;
}

/** A problem (or note) about user input, located by span when possible. */
export interface Diagnostic {
	severity: 'error' | 'warning' | 'info';
	message: string;
	span?: Span;
}

export const hasErrors = (ds: readonly Diagnostic[]): boolean =>
	ds.some((d) => d.severity === 'error');
