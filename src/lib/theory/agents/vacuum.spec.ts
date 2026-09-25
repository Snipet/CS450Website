import { describe, expect, it } from 'vitest';
import {
	DEFAULT_EVALUATION_RUNS,
	INITIAL_WORLDS,
	MAX_STEPS,
	MEASURES,
	MEASURE_IDS,
	PERCEPTS,
	PROGRAM_IDS,
	REFLEX_TABLE,
	SQUARES,
	VACUUM_ACTIONS,
	agentProgram,
	agentSeed,
	applyAction,
	bestEvaluations,
	cleanCount,
	evaluate,
	formatPercept,
	isMeasureId,
	isProgramId,
	isVacuumAction,
	mulberry32,
	mulberry32Next,
	parseWorldName,
	perceive,
	perceptIndex,
	perceptKey,
	randomProgram,
	reflexProgram,
	reflexStateProgram,
	reflexVacuumAgent,
	seedState,
	simulate,
	tableActions,
	tableFromActions,
	tableProgram,
	vacuumWorld,
	worldName,
	type AgentProgram,
	type PerformanceMeasure,
	type ProgramEvaluation,
	type SquareModel,
	type VacuumAction
} from './vacuum';

const ADD = vacuumWorld('A', true, true);

describe('worlds and percepts', () => {
	it('builds worlds and names them like the state space', () => {
		expect(ADD).toEqual({ location: 'A', dirt: { A: true, B: true } });
		expect(worldName(ADD)).toBe('A DD');
		expect(worldName(vacuumWorld('B', false, true))).toBe('B CD');
		expect(worldName(vacuumWorld('B', true, false))).toBe('B DC');
	});

	it('parses state names and rejects anything else', () => {
		expect(parseWorldName('A DD')).toEqual(ADD);
		expect(parseWorldName(' b cd ')).toEqual(vacuumWorld('B', false, true));
		expect(parseWorldName('ACC')).toEqual(vacuumWorld('A', false, false));
		expect(parseWorldName('C DD')).toBeNull();
		expect(parseWorldName('A DDD')).toBeNull();
		expect(parseWorldName('')).toBeNull();
	});

	it('lists the eight initial states in slide 9 order, all different', () => {
		expect(INITIAL_WORLDS.map(worldName)).toEqual([
			'A DD',
			'B DD',
			'A CD',
			'B CD',
			'A DC',
			'B DC',
			'A CC',
			'B CC'
		]);
		expect(SQUARES).toEqual(['A', 'B']);
	});

	it('perceives the location and its status (slide 3: [A, Dirty])', () => {
		expect(perceive(ADD)).toEqual(['A', 'Dirty']);
		expect(formatPercept(perceive(ADD))).toBe('[A, Dirty]');
		expect(perceive(vacuumWorld('B', true, false))).toEqual(['B', 'Clean']);
	});

	it('keys and indexes the four percepts in table order', () => {
		expect(PERCEPTS.map(formatPercept)).toEqual([
			'[A, Clean]',
			'[A, Dirty]',
			'[B, Clean]',
			'[B, Dirty]'
		]);
		expect(PERCEPTS.map(perceptKey)).toEqual(['A,Clean', 'A,Dirty', 'B,Clean', 'B,Dirty']);
		expect(PERCEPTS.map(perceptIndex)).toEqual([0, 1, 2, 3]);
	});

	it('counts clean squares', () => {
		expect(INITIAL_WORLDS.map(cleanCount)).toEqual([0, 0, 1, 1, 1, 1, 2, 2]);
	});

	it('applies actions: moves stop at the edge, Suck cleans the current square', () => {
		expect(applyAction(ADD, 'Right')).toEqual(vacuumWorld('B', true, true));
		expect(applyAction(ADD, 'Left')).toEqual(ADD);
		expect(applyAction(vacuumWorld('B', true, true), 'Right')).toEqual(
			vacuumWorld('B', true, true)
		);
		expect(applyAction(vacuumWorld('B', true, true), 'Left')).toEqual(ADD);
		expect(applyAction(ADD, 'Suck')).toEqual(vacuumWorld('A', false, true));
		expect(applyAction(vacuumWorld('B', true, true), 'Suck')).toEqual(
			vacuumWorld('B', true, false)
		);
		expect(applyAction(ADD, 'NoOp')).toEqual(ADD);
	});

	it('does not mutate the world', () => {
		const w = vacuumWorld('A', true, true);
		for (const a of VACUUM_ACTIONS) applyAction(w, a);
		expect(w).toEqual(ADD);
		expect(applyAction(w, 'NoOp')).not.toBe(w);
	});
});

describe('mulberry32', () => {
	it('produces the reference sequence', () => {
		const random = mulberry32(0);
		expect(random()).toBe(0.26642920868471265);
		expect(random()).toBe(0.0003297457005828619);
		expect(mulberry32(42)()).toBe(0.6011037519201636);
	});

	it('is reproducible and stays in [0, 1)', () => {
		const a = mulberry32(123);
		const b = mulberry32(123);
		const xs = Array.from({ length: 1000 }, () => a());
		expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
		expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
		const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
		expect(mean).toBeGreaterThan(0.45);
		expect(mean).toBeLessThan(0.55);
	});

	it('has a pure step function matching the generator', () => {
		const first = mulberry32Next(seedState(7));
		const again = mulberry32Next(seedState(7));
		expect(first).toEqual(again);
		const random = mulberry32(7);
		expect(random()).toBe(first.value);
		expect(random()).toBe(mulberry32Next(first.state).value);
	});

	it('normalizes seeds', () => {
		expect(seedState(5)).toBe(5);
		expect(seedState(5.9)).toBe(5);
		expect(seedState(-1)).toBe(4294967295);
		expect(seedState(Number.NaN)).toBe(0);
		expect(mulberry32(Number.POSITIVE_INFINITY)()).toBe(mulberry32(0)());
	});

	it('derives a separate agent seed', () => {
		expect(agentSeed(0)).toBe(0x9e3779b9);
		expect(agentSeed(1)).not.toBe(agentSeed(0));
		expect(agentSeed(3)).toBe(agentSeed(3));
	});
});

describe('agent programs', () => {
	it('reflexVacuumAgent is the slide 3 program on all four percepts', () => {
		expect(reflexVacuumAgent(['A', 'Clean'])).toBe('Right');
		expect(reflexVacuumAgent(['A', 'Dirty'])).toBe('Suck');
		expect(reflexVacuumAgent(['B', 'Clean'])).toBe('Left');
		expect(reflexVacuumAgent(['B', 'Dirty'])).toBe('Suck');
	});

	it('the reflex program reports which slide 3 rule fired', () => {
		expect(reflexProgram.rules).toEqual([
			'if status = Dirty then return Suck',
			'else if location = A then return Right',
			'else if location = B then return Left'
		]);
		const m = reflexProgram.init();
		expect(PERCEPTS.map((p) => reflexProgram.act(p, m))).toEqual([
			{ action: 'Right', memory: null, rule: 1 },
			{ action: 'Suck', memory: null, rule: 0 },
			{ action: 'Left', memory: null, rule: 2 },
			{ action: 'Suck', memory: null, rule: 0 }
		]);
	});

	it('the reflex agent with state remembers statuses and stops once both are clean', () => {
		const p = reflexStateProgram;
		let m: SquareModel = p.init();
		expect(m).toEqual({ A: null, B: null });
		const run = (percept: ['A' | 'B', 'Clean' | 'Dirty']) => {
			const d = p.act(percept, m);
			m = d.memory;
			return [d.action, d.rule];
		};
		expect(run(['A', 'Dirty'])).toEqual(['Suck', 0]);
		expect(m).toEqual({ A: 'Dirty', B: null });
		expect(run(['A', 'Clean'])).toEqual(['Right', 2]);
		expect(run(['B', 'Dirty'])).toEqual(['Suck', 0]);
		expect(run(['B', 'Clean'])).toEqual(['NoOp', 1]);
		expect(m).toEqual({ A: 'Clean', B: 'Clean' });
		expect(run(['B', 'Clean'])).toEqual(['NoOp', 1]);
		// Dirt it perceives again is sucked up.
		expect(run(['B', 'Dirty'])).toEqual(['Suck', 0]);
		expect(run(['B', 'Clean'])).toEqual(['NoOp', 1]);
		// Starting in B with B clean: A is unknown, so it moves Left.
		expect(p.act(['B', 'Clean'], p.init())).toEqual({
			action: 'Left',
			memory: { A: null, B: 'Clean' },
			rule: 3
		});
	});

	it('the random program is seeded, pure, and uses all four actions', () => {
		const p = randomProgram;
		expect(p.stochastic).toBe(true);
		expect(p.init(5)).toBe(5);
		expect(p.init()).toBe(0);
		const once = p.act(['A', 'Dirty'], p.init(5));
		expect(p.act(['A', 'Dirty'], p.init(5))).toEqual(once);
		expect(VACUUM_ACTIONS[once.rule]).toBe(once.action);
		const counts = new Map<VacuumAction, number>();
		let m = p.init(11);
		for (let i = 0; i < 4000; i++) {
			const d = p.act(['A', 'Clean'], m);
			m = d.memory;
			counts.set(d.action, (counts.get(d.action) ?? 0) + 1);
		}
		for (const a of VACUUM_ACTIONS) {
			expect(counts.get(a)).toBeGreaterThan(850);
			expect(counts.get(a)).toBeLessThan(1150);
		}
	});

	it('the table program looks up each percept', () => {
		const table = tableFromActions(['Suck', 'Suck', 'NoOp', 'Left']);
		const p = tableProgram(table);
		expect(p.id).toBe('table');
		expect(p.rules).toEqual([
			'[A, Clean] → Suck',
			'[A, Dirty] → Suck',
			'[B, Clean] → NoOp',
			'[B, Dirty] → Left'
		]);
		expect(PERCEPTS.map((q) => p.act(q, null))).toEqual([
			{ action: 'Suck', memory: null, rule: 0 },
			{ action: 'Suck', memory: null, rule: 1 },
			{ action: 'NoOp', memory: null, rule: 2 },
			{ action: 'Left', memory: null, rule: 3 }
		]);
	});

	it('the reflex table matches the reflex program', () => {
		for (const p of PERCEPTS) expect(REFLEX_TABLE[perceptKey(p)]).toBe(reflexVacuumAgent(p));
		expect(tableActions(REFLEX_TABLE)).toEqual(['Right', 'Suck', 'Left', 'Suck']);
		expect(tableFromActions(tableActions(REFLEX_TABLE))).toEqual(REFLEX_TABLE);
		expect(tableFromActions(['Left'])['B,Dirty']).toBe('NoOp');
	});

	it('looks programs up by id', () => {
		expect(PROGRAM_IDS.map((id) => agentProgram(id).id)).toEqual(PROGRAM_IDS);
		expect(agentProgram('reflex')).toBe(reflexProgram);
		expect(agentProgram('table').act(['A', 'Clean'], null).action).toBe('Right');
		const custom = agentProgram('table', tableFromActions(['NoOp', 'NoOp', 'NoOp', 'NoOp']));
		expect(custom.act(['A', 'Dirty'], null).action).toBe('NoOp');
		for (const id of PROGRAM_IDS) {
			const p = agentProgram(id);
			expect(p.name.length).toBeGreaterThan(0);
			expect(p.description.length).toBeGreaterThan(0);
		}
	});

	it('guards ids and actions', () => {
		expect(isProgramId('reflex-state')).toBe(true);
		expect(isProgramId('smart')).toBe(false);
		expect(isProgramId(3)).toBe(false);
		expect(isVacuumAction('NoOp')).toBe(true);
		expect(isVacuumAction('Up')).toBe(false);
		expect(isMeasureId('clean-minus-moves')).toBe(true);
		expect(isMeasureId('moves')).toBe(false);
	});
});

describe('performance measures', () => {
	it('award a point per clean square, minus a point per move', () => {
		const w = vacuumWorld('B', false, true);
		expect(MEASURE_IDS).toEqual(['clean-squares', 'clean-minus-moves']);
		expect(MEASURES['clean-squares'].reward(w, 'Right')).toBe(1);
		expect(MEASURES['clean-minus-moves'].reward(w, 'Right')).toBe(0);
		expect(MEASURES['clean-minus-moves'].reward(w, 'Left')).toBe(0);
		expect(MEASURES['clean-minus-moves'].reward(w, 'Suck')).toBe(1);
		expect(MEASURES['clean-minus-moves'].reward(vacuumWorld('A', false, false), 'NoOp')).toBe(2);
	});
});

describe('simulate', () => {
	it('reproduces the reflex agent from [A, Dirty], both squares dirty, over 10 steps', () => {
		const run = simulate({ program: 'reflex', initial: ADD, steps: 10 });
		expect(run.program).toBe('reflex');
		expect(run.measure).toBe('clean-squares');
		expect(run.diagnostics).toEqual([]);
		expect(run.steps.map((s) => formatPercept(s.percept))).toEqual([
			'[A, Dirty]',
			'[A, Clean]',
			'[B, Dirty]',
			'[B, Clean]',
			'[A, Clean]',
			'[B, Clean]',
			'[A, Clean]',
			'[B, Clean]',
			'[A, Clean]',
			'[B, Clean]'
		]);
		expect(run.steps.map((s) => s.action)).toEqual([
			'Suck',
			'Right',
			'Suck',
			'Left',
			'Right',
			'Left',
			'Right',
			'Left',
			'Right',
			'Left'
		]);
		expect(run.steps.map((s) => s.rule)).toEqual([0, 1, 0, 2, 1, 2, 1, 2, 1, 2]);
		expect(run.steps.map((s) => s.reward)).toEqual([1, 1, 2, 2, 2, 2, 2, 2, 2, 2]);
		expect(run.steps.map((s) => s.total)).toEqual([1, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
		expect(run.total).toBe(18);
		expect(run.steps.map((s) => s.t)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(worldName(run.steps[0].before)).toBe('A DD');
		expect(worldName(run.steps[0].world)).toBe('A CD');
		expect(worldName(run.steps[2].world)).toBe('B CC');
		expect(worldName(run.final)).toBe('A CC');
	});

	it('scores the same run 10 under the move penalty', () => {
		const run = simulate({
			program: 'reflex',
			initial: ADD,
			steps: 10,
			measure: 'clean-minus-moves'
		});
		expect(run.steps.map((s) => s.reward)).toEqual([1, 0, 2, 1, 1, 1, 1, 1, 1, 1]);
		expect(run.total).toBe(10);
	});

	it('the reflex agent with state scores 18 and 17: it stops moving once both are clean', () => {
		const a = simulate({ program: 'reflex-state', initial: ADD, steps: 10 });
		expect(a.total).toBe(18);
		expect(a.steps.map((s) => s.action)).toEqual([
			'Suck',
			'Right',
			'Suck',
			'NoOp',
			'NoOp',
			'NoOp',
			'NoOp',
			'NoOp',
			'NoOp',
			'NoOp'
		]);
		expect(a.steps[3].memory).toEqual({ A: 'Clean', B: 'Clean' });
		const b = simulate({
			program: 'reflex-state',
			initial: ADD,
			steps: 10,
			measure: 'clean-minus-moves'
		});
		expect(b.total).toBe(17);
	});

	it('gives the expected-utility example its numbers: moving Right 18/19, staying 10/20', () => {
		const score = (program: 'reflex-state' | 'table', initial: string) =>
			simulate({
				program,
				table: tableFromActions(['NoOp', 'Suck', 'NoOp', 'Suck']),
				initial: parseWorldName(initial)!,
				steps: 10,
				measure: 'clean-minus-moves'
			}).total;
		// In A with A clean and B unknown, the agent with state moves Right to check B.
		expect(score('reflex-state', 'A CD')).toBe(18);
		expect(score('reflex-state', 'A CC')).toBe(19);
		// An agent that stays put in A.
		expect(score('table', 'A CD')).toBe(10);
		expect(score('table', 'A CC')).toBe(20);
	});

	it('runs a program object and a custom measure', () => {
		const suckOnly: AgentProgram<null> = {
			...reflexProgram,
			act: (_p, memory) => ({ action: 'Suck', memory, rule: 0 })
		};
		const dirtyCount: PerformanceMeasure = {
			id: 'dirty',
			name: 'Dirty squares',
			description: '+1 per dirty square',
			reward: (w) => 2 - cleanCount(w)
		};
		const run = simulate({ program: suckOnly, initial: ADD, steps: 3, measure: dirtyCount });
		expect(run.measure).toBe('dirty');
		expect(run.steps.map((s) => s.reward)).toEqual([1, 1, 1]);
	});

	it('uses the table for the table-driven program', () => {
		const run = simulate({
			program: 'table',
			table: tableFromActions(['NoOp', 'Suck', 'NoOp', 'Suck']),
			initial: ADD,
			steps: 3
		});
		expect(run.steps.map((s) => s.action)).toEqual(['Suck', 'NoOp', 'NoOp']);
		expect(run.total).toBe(3);
		expect(simulate({ program: 'table', initial: ADD, steps: 10 }).total).toBe(18);
	});

	it('is deterministic and does not mutate the initial world', () => {
		const initial = vacuumWorld('B', true, false);
		const config = { program: 'random' as const, initial, steps: 30, seed: 4 };
		expect(simulate(config)).toEqual(simulate(config));
		expect(initial).toEqual(vacuumWorld('B', true, false));
	});

	it('reproduces stochastic runs by seed', () => {
		const config = {
			program: 'reflex' as const,
			initial: ADD,
			steps: 10,
			dirtProbability: 0.3,
			seed: 7
		};
		const run = simulate(config);
		expect(simulate(config)).toEqual(run);
		expect(run.steps.map((s) => s.dirtied.join(''))).toEqual([
			'A',
			'',
			'',
			'B',
			'',
			'AB',
			'',
			'A',
			'',
			''
		]);
		expect(run.steps.map((s) => worldName(s.before))).toEqual([
			'A DD',
			'A DD',
			'A CD',
			'B CD',
			'B CD',
			'B CC',
			'A DD',
			'A CD',
			'B DD',
			'B DC'
		]);
		expect(run.total).toBe(13);
		expect(simulate({ ...config, seed: 8 }).steps.map((s) => s.dirtied)).not.toEqual(
			run.steps.map((s) => s.dirtied)
		);
	});

	it('only dirties clean squares, each with probability p', () => {
		const always = simulate({
			program: 'reflex',
			initial: ADD,
			steps: 5,
			dirtProbability: 1
		});
		for (const s of always.steps) {
			expect(s.dirtied).toEqual(SQUARES.filter((q) => !s.world.dirt[q]));
			expect(s.reward).toBe(1);
		}
		let dirtied = 0;
		let chances = 0;
		const run = simulate({
			program: 'reflex-state',
			initial: vacuumWorld('A', false, false),
			steps: 1000,
			dirtProbability: 0.2,
			seed: 3
		});
		for (const s of run.steps) {
			chances += cleanCount(s.world);
			dirtied += s.dirtied.length;
		}
		expect(dirtied / chances).toBeGreaterThan(0.17);
		expect(dirtied / chances).toBeLessThan(0.23);
	});

	it('gives every program the same dirt sequence for a seed', () => {
		const runOf = (program: 'reflex' | 'random' | 'reflex-state') =>
			simulate({
				program,
				initial: vacuumWorld('A', false, false),
				steps: 40,
				dirtProbability: 0.25,
				seed: 9
			});
		const runs = [runOf('reflex'), runOf('random'), runOf('reflex-state')];
		let compared = 0;
		for (let i = 0; i < 40; i++) {
			for (const s of SQUARES) {
				const clean = runs.map((r) => !r.steps[i].world.dirt[s]);
				if (!clean.every(Boolean)) continue;
				// A square clean in every run after step i gets dirty in all of them or in none.
				const got = runs.map((r) => r.steps[i].dirtied.includes(s));
				expect(new Set(got).size).toBe(1);
				compared++;
			}
		}
		expect(compared).toBeGreaterThan(5);
	});

	it('clamps bad settings and reports them', () => {
		const neg = simulate({ program: 'reflex', initial: ADD, steps: -2 });
		expect(neg.steps).toEqual([]);
		expect(neg.total).toBe(0);
		expect(neg.final).toEqual(ADD);
		expect(neg.diagnostics[0].severity).toBe('error');
		const frac = simulate({ program: 'reflex', initial: ADD, steps: 2.7 });
		expect(frac.steps.length).toBe(2);
		expect(frac.diagnostics[0].severity).toBe('warning');
		const long = simulate({ program: 'reflex', initial: ADD, steps: MAX_STEPS + 5 });
		expect(long.steps.length).toBe(MAX_STEPS);
		expect(long.diagnostics.map((d) => d.message)).toEqual(['Runs are limited to 1000 steps.']);
		const p = simulate({ program: 'reflex', initial: ADD, steps: 2, dirtProbability: 3 });
		expect(p.diagnostics[0].message).toContain('using 1');
		const nan = simulate({
			program: 'reflex',
			initial: ADD,
			steps: 2,
			dirtProbability: Number.NaN,
			seed: Number.NaN
		});
		expect(nan.diagnostics.length).toBe(2);
		expect(nan.total).toBe(2);
	});
});

describe('evaluate', () => {
	it('averages over the eight initial states (4 steps, clean squares)', () => {
		const ev = evaluate(['reflex', 'reflex-state', 'table'], { steps: 4 });
		expect(ev.map((e) => e.average)).toEqual([7.25, 7.25, 7.25]);
		expect(ev[0].byInitial).toEqual([
			{ initial: 'A DD', average: 6 },
			{ initial: 'B DD', average: 6 },
			{ initial: 'A CD', average: 7 },
			{ initial: 'B CD', average: 8 },
			{ initial: 'A DC', average: 8 },
			{ initial: 'B DC', average: 7 },
			{ initial: 'A CC', average: 8 },
			{ initial: 'B CC', average: 8 }
		]);
		expect(ev[0]).toMatchObject({
			program: 'reflex',
			name: 'Reflex agent',
			min: 6,
			max: 8,
			runs: 1
		});
	});

	it('ranks the reflex agent with state first under the move penalty', () => {
		const ev = evaluate(PROGRAM_IDS, { steps: 4, measure: 'clean-minus-moves' });
		expect(ev.map((e) => e.program)).toEqual(PROGRAM_IDS);
		expect(ev[0].average).toBe(4.25);
		expect(ev[1].average).toBe(6.25);
		expect(ev[1].byInitial.map((b) => b.average)).toEqual([5, 5, 6, 7, 7, 6, 7, 7]);
		expect(bestEvaluations(ev)).toEqual([1]);
	});

	it('averages random runs over seeds', () => {
		const ev = evaluate(['random', 'reflex'], {
			steps: 5,
			dirtProbability: 0,
			seed: 10,
			runs: 3
		});
		expect(ev[0].runs).toBe(3);
		expect(ev[1].runs).toBe(1);
		let sum = 0;
		for (const initial of INITIAL_WORLDS) {
			for (let r = 0; r < 3; r++) {
				sum += simulate({ program: 'random', initial, steps: 5, seed: 10 + r }).total;
			}
		}
		expect(ev[0].average).toBeCloseTo(sum / 24, 12);
	});

	it('averages every program over seeds when dirt is stochastic', () => {
		const ev = evaluate(['reflex'], { steps: 6, dirtProbability: 0.2, seed: 1 });
		expect(ev[0].runs).toBe(DEFAULT_EVALUATION_RUNS);
		let sum = 0;
		for (const initial of INITIAL_WORLDS) {
			for (let r = 0; r < DEFAULT_EVALUATION_RUNS; r++) {
				sum += simulate({
					program: 'reflex',
					initial,
					steps: 6,
					dirtProbability: 0.2,
					seed: 1 + r
				}).total;
			}
		}
		expect(ev[0].average).toBeCloseTo(sum / (8 * DEFAULT_EVALUATION_RUNS), 12);
		expect(evaluate(['reflex'], { steps: 6, dirtProbability: 0.2, seed: 1 })).toEqual(ev);
	});

	it('falls back to the default runs and seed 0 for NaN (never a NaN average)', () => {
		const ev = evaluate(['random'], { steps: 4, runs: Number.NaN, seed: Number.NaN });
		expect(ev[0].runs).toBe(DEFAULT_EVALUATION_RUNS);
		expect(Number.isFinite(ev[0].average)).toBe(true);
		expect(ev).toEqual(evaluate(['random'], { steps: 4, seed: 0 }));
		expect(evaluate(['random'], { steps: 4, runs: 0.5 })[0].runs).toBe(1);
	});

	it('uses the given table for the table-driven program', () => {
		const lazy = tableFromActions(['NoOp', 'NoOp', 'NoOp', 'NoOp']);
		const [e] = evaluate(['table'], { steps: 3, table: lazy });
		// Nothing changes: 0, 0, 1, 1, 1, 1, 2, 2 clean squares, three steps each.
		expect(e.average).toBe(3);
	});
});

describe('bestEvaluations', () => {
	const ev = (average: number): ProgramEvaluation => ({
		program: 'reflex',
		name: 'x',
		average,
		min: average,
		max: average,
		byInitial: [],
		runs: 1
	});
	it('returns every index tied for the highest average', () => {
		expect(bestEvaluations([ev(1), ev(3), ev(2), ev(3)])).toEqual([1, 3]);
		expect(bestEvaluations([ev(5)])).toEqual([0]);
		expect(bestEvaluations([])).toEqual([]);
	});
});
