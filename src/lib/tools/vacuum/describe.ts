/**
 * Sentences for the vacuum tool: step announcements, figure labels, and the
 * environment's properties (Rational Agents, slides 9–16).
 */
import {
	formatPercept,
	type AgentProgram,
	type SquareModel,
	type Square,
	type VacuumStep,
	type VacuumWorld
} from '$lib/theory/agents/vacuum';

/** "+2", "0", "−1" */
export function signed(n: number): string {
	if (n > 0) return `+${formatNumber(n)}`;
	if (n < 0) return `−${formatNumber(-n)}`;
	return '0';
}

/** Up to two decimals, no trailing zeros; a minus sign for negatives. */
export function formatNumber(n: number): string {
	const text = String(Math.round(n * 100) / 100);
	return text.startsWith('-') ? `−${text.slice(1)}` : text;
}

/** "t = 3: percept [B, Dirty], action Suck, score 4" (the live announcement). */
export function announceStep(step: VacuumStep): string {
	return `t = ${step.t}: percept ${formatPercept(step.percept)}, action ${step.action}, score ${formatNumber(step.total)}`;
}

function list(squares: readonly Square[]): string {
	return squares.join(' and ');
}

/**
 * What happened in a step, after the announcement: the rule that chose the
 * action, its effect, the reward, and dirt that appeared afterwards.
 */
export function explainStep(step: VacuumStep, program: AgentProgram): string {
	const why =
		program.id === 'random'
			? `The random choice is ${step.action}.`
			: program.id === 'table'
				? `The table row ${formatPercept(step.percept)} → ${step.action} applies.`
				: `Rule “${program.rules[step.rule]}” fires.`;
	const effect = actionEffect(step.before, step.action);
	const dirt = step.dirtied.length ? ` Afterwards dirt appears in ${list(step.dirtied)}.` : '';
	return `${why} ${effect} Reward ${signed(step.reward)}.${dirt}`;
}

/** What an action does in a world, as a sentence. */
export function actionEffect(world: VacuumWorld, action: VacuumStep['action']): string {
	const here = world.location;
	switch (action) {
		case 'Suck':
			return world.dirt[here] ? `Square ${here} is cleaned.` : `Square ${here} is already clean.`;
		case 'Left':
			return here === 'A' ? 'A is the left square: the agent stays in A.' : 'The agent moves to A.';
		case 'Right':
			return here === 'B'
				? 'B is the right square: the agent stays in B.'
				: 'The agent moves to B.';
		default:
			return 'Nothing changes.';
	}
}

/** "The agent is in A; A is dirty, B is dirty." */
export function describeWorld(world: VacuumWorld): string {
	const status = (s: Square) => `${s} is ${world.dirt[s] ? 'dirty' : 'clean'}`;
	return `The agent is in ${world.location}; ${status('A')}, ${status('B')}.`;
}

/**
 * The world figure's accessible name: the time step, the world the agent
 * perceives, dirt that appeared after the previous step, and the action.
 */
export function worldFigureLabel(step: VacuumStep, fresh: readonly Square[] = []): string {
	const appeared = fresh.length ? ` Dirt appeared in ${list(fresh)} after the previous step.` : '';
	return `Vacuum world at t = ${step.t}. ${describeWorld(step.before)}${appeared} The agent perceives ${formatPercept(step.percept)} and takes the action ${step.action}.`;
}

/** The score chart's accessible name: the first dozen totals and the final one. */
export function scoreSummary(totals: readonly number[], measureName: string): string {
	if (!totals.length) return `Score over time under “${measureName}”: no time steps.`;
	const shown = totals.slice(0, 12).map(formatNumber).join(', ');
	const more = totals.length > 12 ? ', …' : '';
	return `Score after each time step under “${measureName}”: ${shown}${more}; ${formatNumber(totals[totals.length - 1])} after t = ${totals.length}.`;
}

/** "model[A] = Clean, model[B] = unknown" */
export function describeModel(model: SquareModel): string {
	return (['A', 'B'] as const).map((s) => `model[${s}] = ${model[s] ?? 'unknown'}`).join(', ');
}

/**
 * The vacuum world's task-environment properties in the order of Rational
 * Agents slides 9–16: the dimension, its value, and a short label.
 */
export function environmentProperties(p: number): { name: string; value: string; label: string }[] {
	const stochastic = p > 0;
	return [
		{ name: 'Observable', value: 'Partially', label: 'Partially observable' },
		{
			name: 'Deterministic',
			value: stochastic ? 'Stochastic' : 'Deterministic',
			label: stochastic ? 'Stochastic' : 'Deterministic'
		},
		{ name: 'Episodic', value: 'Sequential', label: 'Sequential' },
		{ name: 'Static', value: 'Static', label: 'Static' },
		{ name: 'Discrete', value: 'Discrete', label: 'Discrete' },
		{ name: 'Agents', value: 'Single', label: 'Single agent' }
	];
}
