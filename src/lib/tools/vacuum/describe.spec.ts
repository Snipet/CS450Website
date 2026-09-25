import { describe, expect, it } from 'vitest';
import { agentProgram, simulate, tableFromActions, vacuumWorld } from '$lib/theory/agents/vacuum';
import {
	actionEffect,
	announceStep,
	describeModel,
	describeWorld,
	environmentProperties,
	explainStep,
	formatNumber,
	scoreSummary,
	signed,
	worldFigureLabel
} from './describe';

const ADD = vacuumWorld('A', true, true);

describe('numbers', () => {
	it('formats with up to two decimals and a real minus sign', () => {
		expect(formatNumber(19.25)).toBe('19.25');
		expect(formatNumber(1 / 3)).toBe('0.33');
		expect(formatNumber(-2)).toBe('−2');
		expect(signed(2)).toBe('+2');
		expect(signed(0)).toBe('0');
		expect(signed(-1)).toBe('−1');
	});
});

describe('step text', () => {
	const run = simulate({ program: 'reflex', initial: ADD, steps: 4 });

	it('announces a step as "t = 3: percept [B, Dirty], action Suck, score 4"', () => {
		expect(announceStep(run.steps[2])).toBe('t = 3: percept [B, Dirty], action Suck, score 4');
	});

	it('explains the rule that fired, its effect, and the reward', () => {
		const reflex = agentProgram('reflex');
		expect(explainStep(run.steps[0], reflex)).toBe(
			'Rule “if status = Dirty then return Suck” fires. Square A is cleaned. Reward +1.'
		);
		expect(explainStep(run.steps[1], reflex)).toBe(
			'Rule “else if location = A then return Right” fires. The agent moves to B. Reward +1.'
		);
		const table = simulate({
			program: 'table',
			table: tableFromActions(['Left', 'Suck', 'Left', 'Suck']),
			initial: vacuumWorld('A', false, false),
			steps: 1
		});
		expect(explainStep(table.steps[0], agentProgram('table'))).toBe(
			'The table row [A, Clean] → Left applies. A is the left square: the agent stays in A. Reward +2.'
		);
		const random = simulate({ program: 'random', initial: ADD, steps: 1, seed: 2 });
		expect(explainStep(random.steps[0], agentProgram('random'))).toMatch(
			/^The random choice is (Left|Right|Suck|NoOp)\./
		);
	});

	it('mentions dirt that appears after the step', () => {
		const dirty = simulate({ program: 'reflex', initial: ADD, steps: 1, dirtProbability: 1 });
		expect(explainStep(dirty.steps[0], agentProgram('reflex'))).toBe(
			'Rule “if status = Dirty then return Suck” fires. Square A is cleaned. Reward +1. Afterwards dirt appears in A.'
		);
	});

	it('describes every action effect', () => {
		expect(actionEffect(ADD, 'Suck')).toBe('Square A is cleaned.');
		expect(actionEffect(vacuumWorld('B', true, false), 'Suck')).toBe('Square B is already clean.');
		expect(actionEffect(ADD, 'Left')).toBe('A is the left square: the agent stays in A.');
		expect(actionEffect(vacuumWorld('B', true, false), 'Right')).toBe(
			'B is the right square: the agent stays in B.'
		);
		expect(actionEffect(vacuumWorld('B', true, false), 'Left')).toBe('The agent moves to A.');
		expect(actionEffect(ADD, 'NoOp')).toBe('Nothing changes.');
	});
});

describe('figure labels', () => {
	it('labels the world figure', () => {
		const run = simulate({ program: 'reflex', initial: ADD, steps: 2, dirtProbability: 1 });
		expect(worldFigureLabel(run.steps[1], run.steps[0].dirtied)).toBe(
			'Vacuum world at t = 2. The agent is in A; A is dirty, B is dirty. Dirt appeared in A after the previous step. The agent perceives [A, Dirty] and takes the action Suck.'
		);
		expect(worldFigureLabel(run.steps[0])).toBe(
			'Vacuum world at t = 1. The agent is in A; A is dirty, B is dirty. The agent perceives [A, Dirty] and takes the action Suck.'
		);
	});

	it('summarizes the score line', () => {
		expect(scoreSummary([1, 2, 4], 'Clean squares')).toBe(
			'Score after each time step under “Clean squares”: 1, 2, 4; 4 after t = 3.'
		);
		const long = scoreSummary(
			Array.from({ length: 20 }, (_, i) => i - 3),
			'Clean squares, −1 per move'
		);
		expect(long).toContain('−3, −2, −1, 0, 1, 2, 3, 4, 5, 6, 7, 8, …; 16 after t = 20.');
		expect(scoreSummary([], 'x')).toBe('Score over time under “x”: no time steps.');
	});
});

describe('world, model, and environment text', () => {
	it('describes worlds and models', () => {
		expect(describeWorld(vacuumWorld('B', false, true))).toBe(
			'The agent is in B; A is clean, B is dirty.'
		);
		expect(describeModel({ A: 'Clean', B: null })).toBe('model[A] = Clean, model[B] = unknown');
	});

	it('lists the environment properties in slide order', () => {
		expect(environmentProperties(0).map((e) => e.label)).toEqual([
			'Partially observable',
			'Deterministic',
			'Sequential',
			'Static',
			'Discrete',
			'Single agent'
		]);
		expect(environmentProperties(0.1)[1]).toEqual({
			name: 'Deterministic',
			value: 'Stochastic',
			label: 'Stochastic'
		});
	});
});
