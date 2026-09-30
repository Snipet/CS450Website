/**
 * One sentence per step, in the words of Games and Adversarial Search:
 * Minimax(node), Utility(node), Max-Value(node, α, β), "if v ≤ α return v",
 * backed-up utility tuples.
 *
 * | Step          | Sentence                                                                         |
 * | ------------- | -------------------------------------------------------------------------------- |
 * | start (α-β)   | Alpha-Beta-Search(root): v = Max-Value(root, −∞, +∞).                             |
 * | call          | Min-Value(A2, α = 3, β = +∞): A2 is not terminal; v = +∞.                         |
 * | leaf          | Max-Value(A21, α = 3, β = +∞): A21 is terminal; return Utility(A21) = 2.          |
 * | update        | Back in Min-Value(A2): v = Min(+∞, 2) = 2.                                        |
 * | prune         | v = 2 ≤ α = 3: return 2; A22 and A23 are pruned (MAX will never choose A2).       |
 * | bound         | v = 3 > α = −∞, so no pruning; β = Min(+∞, 3) = 3.                                |
 * | return        | End for: Min-Value(A1) returns 3.                                                 |
 * | decision      | Alpha-Beta-Search returns the action from root with value 3: A1.                  |
 * | leaf (mm)     | A11 is terminal: Minimax(A11) = Utility(A11) = 3.                                 |
 * | backup (mm)   | A1, MIN to move: Minimax(A1) = min(3, 12, 8) = 3, from A11.                        |
 * | backup (n)    | A11, player 2 to move: its utilities are 2 (A111) and 3 (A112); back up (4, 3, 2) from A112. |
 */
import { formatBound } from '$lib/components/games/types';
import {
	fnName,
	listNames,
	nodeName,
	playerAt,
	type AlphaBetaStep,
	type GameTree,
	type MaxNStep,
	type MinimaxStep,
	type Utility
} from '$lib/theory/games';
import type { GameRun } from './view';

/** A tuple in prose: "(4, 3, 2)". */
export const tupleText = (t: readonly number[]): string =>
	`(${t.map((x) => formatBound(x)).join(', ')})`;

export const valueText = (u: Utility): string =>
	typeof u === 'number' ? formatBound(u) : tupleText(u);

/** "Root" at the start of a sentence; action labels as written. */
const capital = (name: string): string => (name === 'root' ? 'Root' : name);

const playerWord = (tree: GameTree, depth: number) =>
	playerAt(tree, depth) === 'max' ? 'MAX' : 'MIN';

/** At most `max` values, eliding the middle: "3, 12, …, 8". */
function valueList(values: readonly string[], max = 10): string {
	if (values.length <= max) return values.join(', ');
	return [...values.slice(0, max - 2), '…', values[values.length - 1]].join(', ');
}

export function describeMinimaxStep(
	tree: GameTree,
	s: MinimaxStep,
	values: readonly (number | null)[],
	cutoff: number | null
): string {
	const name = nodeName(tree, s.node);
	switch (s.kind) {
		case 'start':
			return `Minimax(root): ${s.player === 'max' ? 'MAX' : 'MIN'} is to move at the root. Compute the minimax values depth first, left to right${
				cutoff !== null ? `, cutting off the search at depth ${cutoff}` : ''
			}.`;
		case 'leaf':
			return `${name} is terminal: Minimax(${name}) = Utility(${name}) = ${formatBound(s.value)}.`;
		case 'eval':
			return `${name} is at the cutoff depth ${cutoff}: use Eval(${name}) = ${formatBound(s.value)} instead of its minimax value.`;
		case 'backup': {
			const n = tree.nodes[s.node];
			const op = s.player === 'max' ? 'max' : 'min';
			const vals = n.children.map((c) => formatBound(values[c] ?? NaN));
			return `${capital(name)}, ${s.player === 'max' ? 'MAX' : 'MIN'} to move: Minimax(${name}) = ${op}(${valueList(vals)}) = ${formatBound(s.value)}, from ${nodeName(tree, s.best)}.`;
		}
		case 'decision':
			return s.best === null
				? `The root is terminal: its minimax value is ${formatBound(s.value)}, and there is no move to choose.`
				: `Minimax strategy: choose ${nodeName(tree, s.best)}, the move with the best worst-case payoff (${formatBound(s.value)}).`;
	}
}

export function describeAlphaBetaStep(
	tree: GameTree,
	s: AlphaBetaStep,
	cutoff: number | null
): string {
	const name = nodeName(tree, s.node);
	const ab = (alpha: number, beta: number) => `α = ${formatBound(alpha)}, β = ${formatBound(beta)}`;
	switch (s.kind) {
		case 'start':
			return `Alpha-Beta-Search(root): v = ${fnName(s.fn)}(root, −∞, +∞).`;
		case 'call':
			return `${fnName(s.fn)}(${name}, ${ab(s.alpha, s.beta)}): ${name} is not terminal; v = ${s.fn === 'max' ? '−∞' : '+∞'}.`;
		case 'leaf':
			return `${fnName(s.fn)}(${name}, ${ab(s.alpha, s.beta)}): ${name} is terminal; return Utility(${name}) = ${formatBound(s.value)}.`;
		case 'eval':
			return `${fnName(s.fn)}(${name}, ${ab(s.alpha, s.beta)}): ${name} is at the cutoff depth ${cutoff}; return Eval(${name}) = ${formatBound(s.value)}.`;
		case 'update': {
			const op = s.fn === 'max' ? 'Max' : 'Min';
			return `Back in ${fnName(s.fn)}(${name}): v = ${op}(${formatBound(s.before)}, ${formatBound(s.childValue)}) = ${formatBound(s.v)}.`;
		}
		case 'bound':
			return s.fn === 'max'
				? `v = ${formatBound(s.v)} < β = ${formatBound(s.beta)}, so no pruning; α = Max(${formatBound(s.before)}, ${formatBound(s.v)}) = ${formatBound(s.alpha)}.`
				: `v = ${formatBound(s.v)} > α = ${formatBound(s.alpha)}, so no pruning; β = Min(${formatBound(s.before)}, ${formatBound(s.v)}) = ${formatBound(s.beta)}.`;
		case 'prune': {
			const test =
				s.fn === 'max'
					? `v = ${formatBound(s.v)} ≥ β = ${formatBound(s.beta)}`
					: `v = ${formatBound(s.v)} ≤ α = ${formatBound(s.alpha)}`;
			if (!s.skipped.length)
				return `${test}: return ${formatBound(s.v)} (${name} has no actions left to prune).`;
			const who = s.fn === 'max' ? 'MIN' : 'MAX';
			const verb = s.skipped.length === 1 ? 'is' : 'are';
			return `${test}: return ${formatBound(s.v)}; ${listNames(tree, s.skipped)} ${verb} pruned (${who} will never choose ${name}).`;
		}
		case 'return':
			return `End for: ${fnName(s.fn)}(${name}) returns ${formatBound(s.v)}.`;
		case 'decision':
			return s.best === null
				? `The root is terminal: Alpha-Beta-Search has no action to return (value ${formatBound(s.value)}).`
				: `Alpha-Beta-Search returns the action from root with value ${formatBound(s.value)}: ${nodeName(tree, s.best)}.`;
	}
}

export function describeMaxNStep(
	tree: GameTree,
	s: MaxNStep,
	values: readonly (readonly number[] | null)[],
	order: readonly number[],
	cutoff: number | null
): string {
	const name = nodeName(tree, s.node);
	switch (s.kind) {
		case 'start':
			return `Back up utility tuples from the terminal nodes. Players move in the order ${order.join(', ')}, one level each (player ${s.player} at the root); each maximizes its own utility.`;
		case 'leaf':
			return `${name} is terminal: utilities ${tupleText(s.value)}.`;
		case 'eval':
			return `${name} is at the cutoff depth ${cutoff}: evaluation ${tupleText(s.value)}.`;
		case 'backup': {
			const k = s.player - 1;
			const kids = tree.nodes[s.node].children;
			const own = kids.map((c) => `${formatBound(values[c]?.[k] ?? NaN)} (${nodeName(tree, c)})`);
			const list =
				own.length === 1
					? own[0]
					: own.length === 2
						? `${own[0]} and ${own[1]}`
						: valueList(own, 8).replace(/, ([^,]*)$/, ', and $1');
			return `${capital(name)}, player ${s.player} to move: its utilities are ${list}; back up ${tupleText(s.value)} from ${nodeName(tree, s.best)}.`;
		}
		case 'decision':
			return s.best === null
				? `The root is terminal: utilities ${tupleText(s.value)}.`
				: `Player ${s.player} chooses ${nodeName(tree, s.best)} at the root: ${tupleText(s.value)}.`;
	}
}

/** The sentence for step `index` of a run. */
export function describeStep(run: GameRun, index: number): string {
	const steps = run.result.steps;
	const s = steps[Math.max(0, Math.min(index, steps.length - 1))];
	if (!s) return 'No steps.';
	const { tree, cutoff } = run.result;
	switch (run.kind) {
		case 'minimax':
			return describeMinimaxStep(tree, s as MinimaxStep, run.result.values, cutoff);
		case 'alphabeta':
			return describeAlphaBetaStep(tree, s as AlphaBetaStep, cutoff);
		case 'maxn':
			return describeMaxNStep(tree, s as MaxNStep, run.result.values, run.result.order, cutoff);
	}
}

/** The result in one sentence: the value and the action at the root. */
export function describeResult(run: GameRun): string {
	const { tree } = run.result;
	if (run.kind === 'maxn') {
		const r = run.result;
		if (!r.value) return 'No result.';
		return r.best === null
			? `The root is terminal: ${tupleText(r.value)}.`
			: `Backed-up utilities at the root: ${tupleText(r.value)}; player ${r.order[0]} chooses ${nodeName(tree, r.best)}.`;
	}
	const r = run.result;
	if (r.value === null) return 'No result.';
	const who = playerWord(tree, 0);
	return r.best === null
		? `The root is terminal, with utility ${formatBound(r.value)}.`
		: `Minimax value of the root: ${formatBound(r.value)}; ${who} chooses ${nodeName(tree, r.best)}.`;
}
