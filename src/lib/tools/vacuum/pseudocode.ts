/**
 * Pseudocode for each agent program, in the notation of Rational Agents
 * slide 3, with the program rules each line returns. The reflex program is
 * the slide's text exactly (docs/ARCHITECTURE.md §3.5).
 */
import type { ProgramId } from '$lib/theory/agents/vacuum';

export interface CodeLine {
	text: string;
	/** Indentation level. */
	indent: number;
	/** Program rules (indices into `AgentProgram.rules`) that return from this line. */
	rules?: readonly number[];
}

export const PROGRAM_CODE: Readonly<Record<ProgramId, readonly CodeLine[]>> = {
	reflex: [
		{ text: 'function Vacuum-Agent([location, status]) returns an action', indent: 0 },
		{ text: 'if status = Dirty then return Suck', indent: 1, rules: [0] },
		{ text: 'else if location = A then return Right', indent: 1, rules: [1] },
		{ text: 'else if location = B then return Left', indent: 1, rules: [2] }
	],
	'reflex-state': [
		{ text: 'function Vacuum-Agent-With-State([location, status]) returns an action', indent: 0 },
		{
			text: 'persistent: model, the last status seen in each square, initially unknown',
			indent: 1
		},
		{ text: 'model[location] ← status', indent: 1 },
		{ text: 'if status = Dirty then return Suck', indent: 1, rules: [0] },
		{
			text: 'else if model[A] = Clean and model[B] = Clean then return NoOp',
			indent: 1,
			rules: [1]
		},
		{ text: 'else if location = A then return Right', indent: 1, rules: [2] },
		{ text: 'else if location = B then return Left', indent: 1, rules: [3] }
	],
	random: [
		{ text: 'function Random-Vacuum-Agent([location, status]) returns an action', indent: 0 },
		{
			text: 'return one of Left, Right, Suck, NoOp, chosen uniformly at random',
			indent: 1,
			rules: [0, 1, 2, 3]
		}
	],
	table: [
		{ text: 'function Table-Driven-Vacuum-Agent([location, status]) returns an action', indent: 0 },
		{ text: 'persistent: table, an action for each of the four percepts', indent: 1 },
		{ text: 'return table[location, status]', indent: 1, rules: [0, 1, 2, 3] }
	]
};

/** Index of the line that returned `rule`, or -1. */
export function firedLine(program: ProgramId, rule: number): number {
	return PROGRAM_CODE[program].findIndex((line) => line.rules?.includes(rule) ?? false);
}

export type CodeTokenKind = 'keyword' | 'function' | 'variable' | 'action' | 'text';

export interface CodeToken {
	text: string;
	kind: CodeTokenKind;
}

const KEYWORDS = new Set([
	'function',
	'returns',
	'if',
	'then',
	'else',
	'return',
	'and',
	'persistent'
]);
const VARIABLES = new Set(['location', 'status', 'model', 'table', 'Dirty', 'Clean', 'A', 'B']);
const ACTIONS = new Set(['Left', 'Right', 'Suck', 'NoOp', 'action']);

/**
 * Splits a pseudocode line into tokens colored as on the slide: keywords,
 * the function name, percept variables and values, and actions. Words are
 * letters, digits and hyphens; everything else is text.
 */
export function tokenizeCode(line: string): CodeToken[] {
	const out: CodeToken[] = [];
	const push = (text: string, kind: CodeTokenKind) => {
		const last = out[out.length - 1];
		if (kind === 'text' && last?.kind === 'text') last.text += text;
		else out.push({ text, kind });
	};
	let afterFunction = false;
	for (const m of line.matchAll(/[A-Za-z][A-Za-z0-9-]*|[^A-Za-z]+/g)) {
		const word = m[0];
		if (!/^[A-Za-z]/.test(word)) {
			push(word, 'text');
			continue;
		}
		if (afterFunction) {
			push(word, 'function');
			afterFunction = false;
		} else if (KEYWORDS.has(word)) {
			push(word, 'keyword');
			afterFunction = word === 'function';
		} else if (VARIABLES.has(word)) push(word, 'variable');
		else if (ACTIONS.has(word)) push(word, 'action');
		else push(word, 'text');
	}
	return out;
}
