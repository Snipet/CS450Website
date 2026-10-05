/**
 * Trace records of calls to user-defined functions, printed the way Common
 * Lisp's TRACE prints them (SBCL style, two spaces per level):
 *
 * ```
 * 0: (FACT 2)
 *   1: (FACT 1)
 *     2: (FACT 0)
 *     2: FACT returned 1
 *   1: FACT returned 1
 * 0: FACT returned 2
 * ```
 *
 * The depth counts traced calls in progress, not every function call.
 */

export interface TraceEntry {
	kind: 'call' | 'return';
	/** Nesting depth among traced calls (0 for the outermost). */
	depth: number;
	/** The function's name, upper case. */
	name: string;
	/** Call: the call as printed, `(FACT 3)`. Return: the value as printed, `6`. */
	text: string;
	/** Index of the top-level form being evaluated. */
	form: number;
}

/** "0: (FACT 3)" or "0: FACT returned 6", without indentation. */
export function traceText(entry: TraceEntry): string {
	return entry.kind === 'call'
		? `${entry.depth}: ${entry.text}`
		: `${entry.depth}: ${entry.name} returned ${entry.text}`;
}

/** One trace line with TRACE's indentation (two spaces per level). */
export function formatTraceLine(entry: TraceEntry): string {
	return `${'  '.repeat(entry.depth)}${traceText(entry)}`;
}

/** The whole trace as text, one line per entry. */
export function formatTrace(entries: readonly TraceEntry[]): string {
	return entries.map(formatTraceLine).join('\n');
}

/**
 * For each entry, the index of its partner: a call's return and a return's
 * call; -1 for a call that never returned (an error unwound it).
 */
export function tracePartners(entries: readonly TraceEntry[]): number[] {
	const out = new Array<number>(entries.length).fill(-1);
	const open: number[] = [];
	const top = () => entries[open[open.length - 1]];
	for (let i = 0; i < entries.length; i++) {
		const e = entries[i];
		if (e.kind === 'call') {
			// Calls at this depth or deeper were unwound (an error, or a new top-level form).
			while (open.length && top().depth >= e.depth) open.pop();
			open.push(i);
		} else {
			while (open.length && top().depth > e.depth) open.pop();
			if (open.length && top().depth === e.depth) {
				const j = open.pop()!;
				out[i] = j;
				out[j] = i;
			}
		}
	}
	return out;
}

/**
 * Indices of the calls in progress at entry `index`, outermost first. On a
 * return line the returning call is still included (innermost).
 */
export function callStackAt(entries: readonly TraceEntry[], index: number): number[] {
	const stack: number[] = [];
	const last = Math.min(index, entries.length - 1);
	const top = () => entries[stack[stack.length - 1]];
	for (let i = 0; i <= last; i++) {
		const e = entries[i];
		if (e.kind === 'call') {
			while (stack.length && top().depth >= e.depth) stack.pop();
			stack.push(i);
		} else {
			while (stack.length && top().depth > e.depth) stack.pop();
			if (i < last && stack.length && top().depth === e.depth) stack.pop();
		}
	}
	return stack;
}
