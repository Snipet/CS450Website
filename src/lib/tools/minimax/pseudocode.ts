/**
 * The code shown next to the tree: the minimax definition of slide 11, the
 * Alpha-Beta-Search / Max-Value / Min-Value pseudocode of slides 21–22, and
 * the multi-player back-up of slide 13, with the line each step executes.
 * With a depth cutoff, a line for the evaluation function is added after the
 * terminal test (slide 24).
 */
import type { AlphaBetaStep, ValueFn } from '$lib/theory/games';
import type { GameRun, GameStep } from './view';

export type LineId =
	| 'mm-head'
	| 'mm-terminal'
	| 'mm-cutoff'
	| 'mm-max'
	| 'mm-min'
	| 'mm-strategy'
	| 'ab-search'
	| 'ab-search-call'
	| 'ab-search-return'
	| `${ValueFn}-${'head' | 'terminal' | 'cutoff' | 'init' | 'for' | 'update' | 'test' | 'bound' | 'end' | 'return'}`
	| 'n-head'
	| 'n-terminal'
	| 'n-cutoff'
	| 'n-backup'
	| 'n-choose';

export interface CodeLine {
	id: LineId;
	text: string;
	indent: number;
	/** First line of a function or definition (drawn bold). */
	head?: boolean;
	/** A gap before the line. */
	gap?: boolean;
	/** A sentence rather than code: only function names are marked. */
	prose?: boolean;
}

export interface CodeListing {
	title: string;
	lines: CodeLine[];
}

/** Slide 11 (with slide 24's cutoff line when `cutoff`), and slide 10's minimax strategy. */
function minimaxCode(cutoff: boolean): CodeListing {
	const lines: CodeLine[] = [
		{ id: 'mm-head', text: 'Minimax(node) =', indent: 0, head: true },
		{ id: 'mm-terminal', text: 'Utility(node) if node is terminal', indent: 1 }
	];
	if (cutoff)
		lines.push({ id: 'mm-cutoff', text: 'Eval(node) if node is at the cutoff depth', indent: 1 });
	lines.push(
		{ id: 'mm-max', text: 'max_action Minimax(Succ(node, action)) if player = MAX', indent: 1 },
		{ id: 'mm-min', text: 'min_action Minimax(Succ(node, action)) if player = MIN', indent: 1 },
		{
			id: 'mm-strategy',
			text: 'Minimax strategy: choose the move that gives the best worst-case payoff',
			indent: 0,
			gap: true,
			prose: true
		}
	);
	return { title: 'Minimax', lines };
}

function valueFunction(fn: ValueFn, cutoff: boolean): CodeLine[] {
	const max = fn === 'max';
	const other = max ? 'Min-Value' : 'Max-Value';
	const lines: CodeLine[] = [
		{
			id: `${fn}-head`,
			text: `Function v = ${max ? 'Max-Value' : 'Min-Value'}(node, α, β)`,
			indent: 0,
			head: true,
			gap: true
		},
		{ id: `${fn}-terminal`, text: 'if Terminal(node) return Utility(node)', indent: 1 }
	];
	if (cutoff)
		lines.push({ id: `${fn}-cutoff`, text: 'if Cutoff(node) return Eval(node)', indent: 1 });
	lines.push(
		{ id: `${fn}-init`, text: max ? 'v = −∞' : 'v = +∞', indent: 1 },
		{ id: `${fn}-for`, text: 'for each action from node', indent: 1 },
		{
			id: `${fn}-update`,
			text: `v = ${max ? 'Max' : 'Min'}(v, ${other}(Succ(node, action), α, β))`,
			indent: 2
		},
		{ id: `${fn}-test`, text: max ? 'if v ≥ β return v' : 'if v ≤ α return v', indent: 2 },
		{ id: `${fn}-bound`, text: max ? 'α = Max(α, v)' : 'β = Min(β, v)', indent: 2 },
		{ id: `${fn}-end`, text: 'end for', indent: 1 },
		{ id: `${fn}-return`, text: 'return v', indent: 1 }
	);
	return lines;
}

/** Slides 21–22: the search calls the root player's function; both functions follow. */
function alphaBetaCode(root: ValueFn, cutoff: boolean): CodeListing {
	const first: ValueFn = root;
	const second: ValueFn = root === 'max' ? 'min' : 'max';
	return {
		title: 'Alpha-beta pruning',
		lines: [
			{ id: 'ab-search', text: 'Function action = Alpha-Beta-Search(node)', indent: 0, head: true },
			{
				id: 'ab-search-call',
				text: `v = ${root === 'max' ? 'Max-Value' : 'Min-Value'}(node, −∞, ∞)`,
				indent: 1
			},
			{ id: 'ab-search-return', text: 'return the action from node with value v', indent: 1 },
			...valueFunction(first, cutoff),
			...valueFunction(second, cutoff)
		]
	};
}

/** Slide 13's bullets as a definition. */
function maxNCode(cutoff: boolean): CodeListing {
	const lines: CodeLine[] = [
		{ id: 'n-head', text: 'Value(node) =', indent: 0, head: true },
		{ id: 'n-terminal', text: 'Utility(node), a tuple, if node is terminal', indent: 1 }
	];
	if (cutoff)
		lines.push({ id: 'n-cutoff', text: 'Eval(node) if node is at the cutoff depth', indent: 1 });
	lines.push(
		{
			id: 'n-backup',
			text: 'else Value(Succ(node, action)) for the action that maximizes the utility of the player p to move',
			indent: 1,
			prose: true
		},
		{
			id: 'n-choose',
			text: 'Each player maximizes their own utility at their node; utilities are backed up from children to parents',
			indent: 0,
			gap: true,
			prose: true
		}
	);
	return { title: 'Backing up utility tuples', lines };
}

export function codeFor(run: GameRun): CodeListing {
	const cutoff = run.result.cutoff !== null;
	switch (run.kind) {
		case 'minimax':
			return minimaxCode(cutoff);
		case 'alphabeta':
			return alphaBetaCode(run.result.tree.root, cutoff);
		case 'maxn':
			return maxNCode(cutoff);
	}
}

/** The line a step executes. */
export function lineOf(run: GameRun, step: GameStep | undefined): LineId | null {
	if (!step) return null;
	if (run.kind === 'minimax' || run.kind === 'maxn') {
		const p = run.kind === 'minimax' ? 'mm' : 'n';
		switch (step.kind) {
			case 'start':
				return `${p}-head`;
			case 'leaf':
				return `${p}-terminal`;
			case 'eval':
				return `${p}-cutoff`;
			case 'backup':
				if (run.kind === 'maxn') return 'n-backup';
				return 'player' in step && step.player === 'min' ? 'mm-min' : 'mm-max';
			case 'decision':
				return run.kind === 'minimax' ? 'mm-strategy' : 'n-choose';
			default:
				return null;
		}
	}
	const s = step as AlphaBetaStep;
	switch (s.kind) {
		case 'start':
			return 'ab-search-call';
		case 'decision':
			return 'ab-search-return';
		case 'call':
			return `${s.fn}-init`;
		case 'leaf':
			return `${s.fn}-terminal`;
		case 'eval':
			return `${s.fn}-cutoff`;
		case 'update':
			return `${s.fn}-update`;
		case 'prune':
			return `${s.fn}-test`;
		case 'bound':
			return `${s.fn}-bound`;
		case 'return':
			return `${s.fn}-return`;
	}
}

export type CodeTokenKind = 'keyword' | 'max' | 'min' | 'function' | 'alpha' | 'beta' | 'text';

export interface CodeToken {
	text: string;
	kind: CodeTokenKind;
	/** Subscript after the text (max with subscript action). */
	sub?: string;
}

const KEYWORDS = new Set(['Function', 'if', 'return', 'for', 'each', 'from', 'end', 'else']);
const FUNCTIONS = new Set([
	'Alpha-Beta-Search',
	'Minimax',
	'Terminal',
	'Utility',
	'Eval',
	'Cutoff',
	'Succ',
	'Max',
	'Min',
	'Value'
]);

/**
 * Splits a line into tokens colored as on slides 21–22: Max-Value and α in
 * one color, Min-Value and β in another, keywords in italics.
 */
export function tokenizeCode(line: string, prose = false): CodeToken[] {
	const out: CodeToken[] = [];
	const push = (text: string, kind: CodeTokenKind) => {
		const last = out[out.length - 1];
		if (kind === 'text' && last?.kind === 'text') last.text += text;
		else out.push({ text, kind });
	};
	for (const m of line.matchAll(/[A-Za-z_][A-Za-z0-9_-]*|α|β|[^A-Za-z_αβ]+/g)) {
		const w = m[0];
		if (w === 'max_action' || w === 'min_action')
			out.push({ text: w.slice(0, 3), kind: 'function', sub: 'action' });
		else if (w === 'α') push(w, 'alpha');
		else if (w === 'β') push(w, 'beta');
		else if (w === 'Max-Value') push(w, 'max');
		else if (w === 'Min-Value') push(w, 'min');
		else if (KEYWORDS.has(w) && !prose) push(w, 'keyword');
		else if (FUNCTIONS.has(w)) push(w, 'function');
		else push(w, 'text');
	}
	return out;
}
