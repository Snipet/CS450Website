/**
 * Russell & Norvig's RECURSIVE-BEST-FIRST-SEARCH (AIMA 3rd ed., Figure 3.26)
 * as shown next to the tree, with the lines each step executes. The engine
 * (`theory/search/rbfs.ts`) follows it line by line.
 */
import type { RbfsStep } from '$lib/theory/search/rbfs';

export type LineId =
	| 'search-head'
	| 'search-call'
	| 'head'
	| 'goal'
	| 'succ-init'
	| 'succ-for'
	| 'succ-add'
	| 'empty'
	| 'f-for'
	| 'f-set'
	| 'loop'
	| 'best'
	| 'test'
	| 'alt'
	| 'recurse'
	| 'result';

export interface CodeLine {
	id: LineId;
	text: string;
	indent: number;
	/** First line of a function (drawn bold). */
	head?: boolean;
	/** A gap before the line. */
	gap?: boolean;
	/** A comment after the code. */
	comment?: string;
}

export const RBFS_CODE: readonly CodeLine[] = [
	{
		id: 'search-head',
		text: 'function RECURSIVE-BEST-FIRST-SEARCH(problem) returns a solution, or failure',
		indent: 0,
		head: true
	},
	{
		id: 'search-call',
		text: 'return RBFS(problem, MAKE-NODE(problem.INITIAL-STATE), ∞)',
		indent: 1
	},
	{
		id: 'head',
		text: 'function RBFS(problem, node, f_limit) returns a solution, or failure and a new f-cost limit',
		indent: 0,
		head: true,
		gap: true
	},
	{ id: 'goal', text: 'if problem.GOAL-TEST(node.STATE) then return SOLUTION(node)', indent: 1 },
	{ id: 'succ-init', text: 'successors ← [ ]', indent: 1 },
	{ id: 'succ-for', text: 'for each action in problem.ACTIONS(node.STATE) do', indent: 1 },
	{ id: 'succ-add', text: 'add CHILD-NODE(problem, node, action) into successors', indent: 2 },
	{ id: 'empty', text: 'if successors is empty then return failure, ∞', indent: 1 },
	{
		id: 'f-for',
		text: 'for each s in successors do',
		indent: 1,
		comment: 'update f with value from previous search, if any'
	},
	{ id: 'f-set', text: 's.f ← max(s.g + s.h, node.f)', indent: 2 },
	{ id: 'loop', text: 'loop do', indent: 1 },
	{ id: 'best', text: 'best ← the lowest f-value node in successors', indent: 2 },
	{ id: 'test', text: 'if best.f > f_limit then return failure, best.f', indent: 2 },
	{ id: 'alt', text: 'alternative ← the second-lowest f-value among successors', indent: 2 },
	{
		id: 'recurse',
		text: 'result, best.f ← RBFS(problem, best, min(f_limit, alternative))',
		indent: 2
	},
	{ id: 'result', text: 'if result ≠ failure then return result', indent: 2 }
];

export interface StepLines {
	/** Lines the step executes, in order. */
	lines: LineId[];
	/** The line the step ends on (drawn strongest). */
	main: LineId | null;
}

/** The lines a step executes. Before the first step: the top-level call. */
export function linesOf(step: RbfsStep | undefined): StepLines {
	if (!step) return { lines: ['search-call'], main: 'search-call' };
	switch (step.kind) {
		case 'expand':
			return {
				lines: ['goal', 'succ-init', 'succ-for', 'succ-add', 'empty', 'f-for', 'f-set'],
				main: 'f-set'
			};
		case 'dead-end':
			return { lines: ['goal', 'succ-init', 'succ-for', 'empty'], main: 'empty' };
		case 'call':
			return { lines: ['loop', 'best', 'test', 'alt', 'recurse'], main: 'recurse' };
		case 'return':
			return { lines: ['loop', 'best', 'test'], main: 'test' };
		case 'goal':
			return { lines: ['goal'], main: 'goal' };
		case 'fail':
			return step.reason === 'exhausted'
				? { lines: ['search-call'], main: 'search-call' }
				: { lines: [], main: null };
	}
}

export type CodeTokenKind = 'keyword' | 'name' | 'text';

export interface CodeToken {
	text: string;
	kind: CodeTokenKind;
}

const KEYWORDS = new Set([
	'function',
	'returns',
	'return',
	'if',
	'then',
	'for',
	'each',
	'in',
	'do',
	'loop'
]);

/** Splits a line into keywords (bold in the book), function and field names (small capitals), and other text. */
export function tokenizeCode(line: string): CodeToken[] {
	const out: CodeToken[] = [];
	const push = (text: string, kind: CodeTokenKind) => {
		const last = out[out.length - 1];
		if (last?.kind === kind && kind === 'text') last.text += text;
		else out.push({ text, kind });
	};
	for (const m of line.matchAll(/[A-Za-z_][A-Za-z0-9_-]*|[^A-Za-z_]+/g)) {
		const w = m[0];
		if (KEYWORDS.has(w)) push(w, 'keyword');
		else if (/^[A-Z][A-Z-]+$/.test(w)) push(w, 'name');
		else push(w, 'text');
	}
	return out;
}
