/**
 * The vacuum-cleaner world (Rational Agents, slides 3–5; docs/ARCHITECTURE.md
 * §3.5, §4.5): two squares A and B, an agent that perceives its location and
 * whether that square is dirty, and the actions Left, Right, Suck, NoOp.
 *
 * Agent programs map a percept (plus whatever the program remembers) to an
 * action; `simulate` runs one in the environment and scores it with a
 * performance measure; `evaluate` averages programs over all eight initial
 * states. Everything is pure and reproducible: randomness (stochastic dirt,
 * the random agent) comes from a seeded mulberry32 generator.
 */
import type { Diagnostic } from '../diagnostics';

export type Square = 'A' | 'B';
export type Status = 'Clean' | 'Dirty';
export type VacuumAction = 'Left' | 'Right' | 'Suck' | 'NoOp';

export interface VacuumWorld {
	/** The square the agent is in. */
	location: Square;
	/** Whether each square is dirty. */
	dirt: Record<Square, boolean>;
}

/** What the agent perceives: its location and that square's status, e.g. [A, Dirty]. */
export type Percept = [Square, Status];

export const SQUARES: readonly Square[] = ['A', 'B'];

/** The actions of slide 3, in the slide's order. */
export const VACUUM_ACTIONS: readonly VacuumAction[] = ['Left', 'Right', 'Suck', 'NoOp'];

/** The four possible percepts, in table order. */
export const PERCEPTS: readonly Percept[] = [
	['A', 'Clean'],
	['A', 'Dirty'],
	['B', 'Clean'],
	['B', 'Dirty']
];

// ---------------------------------------------------------------------------
// Worlds and percepts
// ---------------------------------------------------------------------------

/** A world with the agent in `location` and dirt where the flags say. */
export function vacuumWorld(location: Square, dirtA: boolean, dirtB: boolean): VacuumWorld {
	return { location, dirt: { A: dirtA, B: dirtB } };
}

/**
 * The eight states of the two-square world in the order of the state-space
 * diagram (Solving Problems by Searching, slide 9): both squares dirty, then
 * only B dirty, only A dirty, both clean; the agent in A before B.
 */
export const INITIAL_WORLDS: readonly VacuumWorld[] = [
	vacuumWorld('A', true, true),
	vacuumWorld('B', true, true),
	vacuumWorld('A', false, true),
	vacuumWorld('B', false, true),
	vacuumWorld('A', true, false),
	vacuumWorld('B', true, false),
	vacuumWorld('A', false, false),
	vacuumWorld('B', false, false)
];

/**
 * A world's state name: the agent's square, a space, then `D` (dirty) or `C`
 * (clean) for A and B. "A DD" is the slide 3 picture; "B CC" has the agent in B
 * with both squares clean. The same names as `vacuumStateSpace(2)`.
 */
export function worldName(world: VacuumWorld): string {
	const d = (s: Square) => (world.dirt[s] ? 'D' : 'C');
	return `${world.location} ${d('A')}${d('B')}`;
}

/** Reads a name written by `worldName` (case-insensitive, spaces optional); null if it is not one. */
export function parseWorldName(text: string): VacuumWorld | null {
	const m = /^\s*([AB])\s*([CD])([CD])\s*$/i.exec(text);
	if (!m) return null;
	return vacuumWorld(
		m[1].toUpperCase() as Square,
		m[2].toUpperCase() === 'D',
		m[3].toUpperCase() === 'D'
	);
}

/** What the agent's sensors report: its location and whether that square is dirty. */
export function perceive(world: VacuumWorld): Percept {
	return [world.location, world.dirt[world.location] ? 'Dirty' : 'Clean'];
}

/** "[A, Dirty]" */
export function formatPercept(percept: Percept): string {
	return `[${percept[0]}, ${percept[1]}]`;
}

export type PerceptKey = `${Square},${Status}`;

/** "A,Dirty": the key of a percept in a `PerceptTable`. */
export function perceptKey(percept: Percept): PerceptKey {
	return `${percept[0]},${percept[1]}`;
}

/** Position of a percept in `PERCEPTS` (0–3). */
export function perceptIndex(percept: Percept): number {
	return (percept[0] === 'A' ? 0 : 2) + (percept[1] === 'Dirty' ? 1 : 0);
}

/** Number of clean squares (0–2). */
export function cleanCount(world: VacuumWorld): number {
	return SQUARES.filter((s) => !world.dirt[s]).length;
}

/**
 * The environment's response to an action: Left and Right move the agent (and
 * do nothing at the edge), Suck cleans the agent's square, NoOp does nothing.
 */
export function applyAction(world: VacuumWorld, action: VacuumAction): VacuumWorld {
	switch (action) {
		case 'Left':
			return { location: 'A', dirt: { ...world.dirt } };
		case 'Right':
			return { location: 'B', dirt: { ...world.dirt } };
		case 'Suck':
			return { location: world.location, dirt: { ...world.dirt, [world.location]: false } };
		default:
			return { location: world.location, dirt: { ...world.dirt } };
	}
}

// ---------------------------------------------------------------------------
// Seeded random numbers
// ---------------------------------------------------------------------------

/**
 * One step of the mulberry32 generator: the next internal state and a number
 * in [0, 1). Pure, so an agent can keep the state in its memory.
 */
export function mulberry32Next(state: number): { value: number; state: number } {
	const next = (state + 0x6d2b79f5) >>> 0;
	let t = next;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}

/** Normalizes a seed to an unsigned 32-bit integer (non-finite seeds become 0). */
export function seedState(seed: number): number {
	return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
}

/** Seeded pseudo-random numbers in [0, 1) (mulberry32): the same seed gives the same sequence. */
export function mulberry32(seed: number): () => number {
	let state = seedState(seed);
	return () => {
		const r = mulberry32Next(state);
		state = r.state;
		return r.value;
	};
}

// ---------------------------------------------------------------------------
// Agent programs
// ---------------------------------------------------------------------------

/** The slide 3 program, exactly. */
export function reflexVacuumAgent([location, status]: Percept): VacuumAction {
	if (status === 'Dirty') return 'Suck';
	else if (location === 'A') return 'Right';
	// else if location = B
	return 'Left';
}

export type ProgramId = 'reflex' | 'reflex-state' | 'random' | 'table';

export const PROGRAM_IDS: readonly ProgramId[] = ['reflex', 'reflex-state', 'random', 'table'];

/** What a program returns for one percept. */
export interface AgentDecision<M> {
	action: VacuumAction;
	/** The program's memory after this percept. */
	memory: M;
	/** Index into the program's `rules` of the rule that chose the action. */
	rule: number;
}

/**
 * An agent program: maps the current percept and what it remembers to an
 * action. Programs are immutable values; `act` returns the new memory.
 */
export interface AgentProgram<M = unknown> {
	id: ProgramId;
	name: string;
	/** One sentence on what the program does. */
	description: string;
	/** Whether `act` draws random numbers (`evaluate` then averages over several seeds). */
	stochastic: boolean;
	/** The rules the program chooses between, in the order it tests them. */
	rules: readonly string[];
	/** The memory before the first percept; `seed` seeds random programs. */
	init(seed?: number): M;
	act(percept: Percept, memory: M): AgentDecision<M>;
}

/** Percept → action for all four percepts. */
export type PerceptTable = Readonly<Record<PerceptKey, VacuumAction>>;

/** The reflex program written as a table (what slide 3's rules return for each percept). */
export const REFLEX_TABLE: PerceptTable = {
	'A,Clean': 'Right',
	'A,Dirty': 'Suck',
	'B,Clean': 'Left',
	'B,Dirty': 'Suck'
};

/** The table's actions in `PERCEPTS` order. */
export function tableActions(table: PerceptTable): VacuumAction[] {
	return PERCEPTS.map((p) => table[perceptKey(p)]);
}

/** A table from four actions in `PERCEPTS` order. */
export function tableFromActions(actions: readonly VacuumAction[]): PerceptTable {
	const out = {} as Record<PerceptKey, VacuumAction>;
	PERCEPTS.forEach((p, i) => (out[perceptKey(p)] = actions[i] ?? 'NoOp'));
	return out;
}

/** Slide 3: Suck when the square is dirty, otherwise move to the other square. */
export const reflexProgram: AgentProgram<null> = {
	id: 'reflex',
	name: 'Reflex agent',
	description:
		'The Vacuum-Agent program of slide 3: Suck if the square is dirty, otherwise move to the other square.',
	stochastic: false,
	rules: [
		'if status = Dirty then return Suck',
		'else if location = A then return Right',
		'else if location = B then return Left'
	],
	init: () => null,
	act(percept, memory) {
		const action = reflexVacuumAgent(percept);
		const rule = action === 'Suck' ? 0 : action === 'Right' ? 1 : 2;
		return { action, memory, rule };
	}
};

/** The last status the agent perceived in each square; null while it has not been there. */
export type SquareModel = Readonly<Record<Square, Status | null>>;

/**
 * The reflex rules plus a model of the world: the last status perceived in
 * each square. Once both squares are known to be clean it returns NoOp.
 */
export const reflexStateProgram: AgentProgram<SquareModel> = {
	id: 'reflex-state',
	name: 'Reflex agent with state',
	description:
		'Remembers the last status it perceived in each square and returns NoOp once it believes both are clean.',
	stochastic: false,
	rules: [
		'if status = Dirty then return Suck',
		'else if model[A] = Clean and model[B] = Clean then return NoOp',
		'else if location = A then return Right',
		'else if location = B then return Left'
	],
	init: () => ({ A: null, B: null }),
	act([location, status], memory) {
		const model: SquareModel = { ...memory, [location]: status };
		if (status === 'Dirty') return { action: 'Suck', memory: model, rule: 0 };
		if (model.A === 'Clean' && model.B === 'Clean')
			return { action: 'NoOp', memory: model, rule: 1 };
		if (location === 'A') return { action: 'Right', memory: model, rule: 2 };
		return { action: 'Left', memory: model, rule: 3 };
	}
};

/** Uniformly random actions; the memory is the generator state. */
export const randomProgram: AgentProgram<number> = {
	id: 'random',
	name: 'Random agent',
	description: 'Ignores the percept and chooses Left, Right, Suck, or NoOp uniformly at random.',
	stochastic: true,
	rules: VACUUM_ACTIONS.map((a) => `return ${a}`),
	init: (seed = 0) => seedState(seed),
	act(_percept, memory) {
		const r = mulberry32Next(memory);
		const rule = Math.min(VACUUM_ACTIONS.length - 1, Math.floor(r.value * VACUUM_ACTIONS.length));
		return { action: VACUUM_ACTIONS[rule], memory: r.state, rule };
	}
};

/** Looks the percept up in `table`; the rule is the table row (`PERCEPTS` order). */
export function tableProgram(table: PerceptTable): AgentProgram<null> {
	return {
		id: 'table',
		name: 'Table-driven agent',
		description: 'Looks up the action for the current percept in a table of the four percepts.',
		stochastic: false,
		rules: PERCEPTS.map((p) => `${formatPercept(p)} → ${table[perceptKey(p)]}`),
		init: () => null,
		act(percept, memory) {
			return { action: table[perceptKey(percept)], memory, rule: perceptIndex(percept) };
		}
	};
}

/** The program for an id; `table` is used by the table-driven program (default: `REFLEX_TABLE`). */
export function agentProgram(id: ProgramId, table: PerceptTable = REFLEX_TABLE): AgentProgram {
	switch (id) {
		case 'reflex':
			return reflexProgram as AgentProgram;
		case 'reflex-state':
			return reflexStateProgram as AgentProgram;
		case 'random':
			return randomProgram as AgentProgram;
		default:
			return tableProgram(table) as AgentProgram;
	}
}

export const isProgramId = (v: unknown): v is ProgramId =>
	typeof v === 'string' && (PROGRAM_IDS as readonly string[]).includes(v);

export const isVacuumAction = (v: unknown): v is VacuumAction =>
	typeof v === 'string' && (VACUUM_ACTIONS as readonly string[]).includes(v);

// ---------------------------------------------------------------------------
// Performance measures
// ---------------------------------------------------------------------------

export type MeasureId = 'clean-squares' | 'clean-minus-moves';

export const MEASURE_IDS: readonly MeasureId[] = ['clean-squares', 'clean-minus-moves'];

/**
 * A performance measure awarding points at each time step for the world after
 * the agent's action. Add a measure by writing another `PerformanceMeasure`.
 */
export interface PerformanceMeasure {
	id: string;
	name: string;
	/** Short formula-like description, e.g. "+1 per clean square per time step". */
	description: string;
	reward(world: VacuumWorld, action: VacuumAction): number;
}

export const MEASURES: Readonly<Record<MeasureId, PerformanceMeasure>> = {
	'clean-squares': {
		id: 'clean-squares',
		name: 'Clean squares',
		description: '+1 per clean square after each time step',
		reward: (world) => cleanCount(world)
	},
	'clean-minus-moves': {
		id: 'clean-minus-moves',
		name: 'Clean squares, −1 per move',
		description: '+1 per clean square after each time step, −1 for each Left or Right',
		reward: (world, action) => cleanCount(world) - (action === 'Left' || action === 'Right' ? 1 : 0)
	}
};

export const isMeasureId = (v: unknown): v is MeasureId =>
	typeof v === 'string' && (MEASURE_IDS as readonly string[]).includes(v);

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

/** Longest run `simulate` performs. */
export const MAX_STEPS = 1000;

export interface SimulationConfig {
	/** A program id, or any program object. */
	program: ProgramId | AgentProgram;
	/** Table for the 'table' program (default `REFLEX_TABLE`). */
	table?: PerceptTable;
	initial: VacuumWorld;
	/** Number of time steps (0–`MAX_STEPS`). */
	steps: number;
	/**
	 * Probability that each clean square becomes dirty after a time step
	 * (default 0: a deterministic environment).
	 */
	dirtProbability?: number;
	/** Default 'clean-squares'. */
	measure?: MeasureId | PerformanceMeasure;
	/** Seeds the dirt and the random agent (default 0). */
	seed?: number;
}

/** One time step: the agent perceives, acts, and the measure scores the result. */
export interface VacuumStep<M = unknown> {
	/** Time step, from 1. */
	t: number;
	/** The world the agent perceives. */
	before: VacuumWorld;
	percept: Percept;
	action: VacuumAction;
	/** Index of the program rule that chose the action. */
	rule: number;
	/** The program's memory after acting. */
	memory: M;
	/** The world after the action (what the measure scores). */
	world: VacuumWorld;
	/** Points for this step. */
	reward: number;
	/** Points so far, including this step. */
	total: number;
	/** Squares that became dirty after the step (stochastic dirt); the next step starts with them dirty. */
	dirtied: Square[];
}

export interface VacuumRun {
	program: ProgramId;
	measure: string;
	steps: VacuumStep[];
	/** Score after the last step. */
	total: number;
	/** The world after the last step, including dirt that appeared after it. */
	final: VacuumWorld;
	/** Problems with the configuration (values out of range are clamped). */
	diagnostics: Diagnostic[];
}

/**
 * Seed of the random agent's generator, derived from the run's seed so the
 * dirt sequence is the same whichever program runs.
 */
export function agentSeed(seed: number): number {
	return (seedState(seed) ^ 0x9e3779b9) >>> 0;
}

function resolveMeasure(measure: SimulationConfig['measure']): PerformanceMeasure {
	if (measure === undefined) return MEASURES['clean-squares'];
	return typeof measure === 'string' ? MEASURES[measure] : measure;
}

function resolveProgram(program: SimulationConfig['program'], table?: PerceptTable): AgentProgram {
	return typeof program === 'string' ? agentProgram(program, table) : program;
}

/** Clamps the numeric settings, reporting what was changed. */
function normalizeRun(config: SimulationConfig): {
	steps: number;
	p: number;
	seed: number;
	diagnostics: Diagnostic[];
} {
	const diagnostics: Diagnostic[] = [];
	let steps = config.steps;
	if (!Number.isFinite(steps) || steps < 0) {
		diagnostics.push({ severity: 'error', message: 'The number of steps must be 0 or more.' });
		steps = 0;
	} else if (!Number.isInteger(steps)) {
		steps = Math.floor(steps);
		diagnostics.push({
			severity: 'warning',
			message: `The number of steps must be a whole number; using ${steps}.`
		});
	}
	if (steps > MAX_STEPS) {
		diagnostics.push({
			severity: 'warning',
			message: `Runs are limited to ${MAX_STEPS} steps.`
		});
		steps = MAX_STEPS;
	}
	let p = config.dirtProbability ?? 0;
	if (!Number.isFinite(p) || p < 0 || p > 1) {
		const clamped = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
		diagnostics.push({
			severity: 'warning',
			message: `The dirt probability must be between 0 and 1; using ${clamped}.`
		});
		p = clamped;
	}
	const seed = config.seed ?? 0;
	if (!Number.isFinite(seed)) {
		diagnostics.push({ severity: 'warning', message: 'The seed must be a number; using 0.' });
	}
	return { steps, p, seed: Number.isFinite(seed) ? seed : 0, diagnostics };
}

/**
 * Runs an agent program for `steps` time steps. Each step: the agent perceives
 * the world and acts, the environment applies the action, the measure scores
 * the resulting world, and then (when `dirtProbability` > 0) each clean square
 * becomes dirty with that probability. The environment draws one number per
 * square per step (A, then B) from `mulberry32(seed)`, so every program sees
 * the same dirt sequence; the random agent uses its own generator seeded with
 * `agentSeed(seed)`. The same configuration always gives the same run.
 */
export function simulate(config: SimulationConfig): VacuumRun {
	const program = resolveProgram(config.program, config.table);
	const measure = resolveMeasure(config.measure);
	const { steps: count, p, seed, diagnostics } = normalizeRun(config);
	const random = mulberry32(seed);
	let memory = program.init(agentSeed(seed));
	let world: VacuumWorld = {
		location: config.initial.location,
		dirt: { ...config.initial.dirt }
	};
	let total = 0;
	const steps: VacuumStep[] = [];
	for (let t = 1; t <= count; t++) {
		const percept = perceive(world);
		const decision = program.act(percept, memory);
		memory = decision.memory;
		const after = applyAction(world, decision.action);
		const reward = measure.reward(after, decision.action);
		total += reward;
		const dirtied: Square[] = [];
		if (p > 0) {
			for (const s of SQUARES) {
				const u = random();
				if (!after.dirt[s] && u < p) dirtied.push(s);
			}
		}
		steps.push({
			t,
			before: world,
			percept,
			action: decision.action,
			rule: decision.rule,
			memory,
			world: after,
			reward,
			total,
			dirtied
		});
		world = dirtied.length
			? { location: after.location, dirt: { ...after.dirt, ...dirtyAll(dirtied) } }
			: after;
	}
	return { program: program.id, measure: measure.id, steps, total, final: world, diagnostics };
}

function dirtyAll(squares: readonly Square[]): Partial<Record<Square, boolean>> {
	return Object.fromEntries(squares.map((s) => [s, true]));
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** Runs per initial state when a run involves randomness (stochastic dirt or a random agent). */
export const DEFAULT_EVALUATION_RUNS = 20;

export interface EvaluationConfig {
	table?: PerceptTable;
	steps: number;
	dirtProbability?: number;
	measure?: MeasureId | PerformanceMeasure;
	/** First seed; runs use `seed`, `seed + 1`, … (default 0; also for a non-finite seed). */
	seed?: number;
	/** Seeds per initial state when randomness is involved (default 20; also for a non-finite value). */
	runs?: number;
}

export interface ProgramEvaluation {
	program: ProgramId;
	name: string;
	/** Mean total over all initial states and runs. */
	average: number;
	/** Lowest and highest mean total of a single initial state. */
	min: number;
	max: number;
	/** Mean total per initial state, in `INITIAL_WORLDS` order. */
	byInitial: { initial: string; average: number }[];
	/** Runs per initial state (1 when nothing is random). */
	runs: number;
}

/**
 * Expected performance of each program: its total averaged over the eight
 * initial states of `INITIAL_WORLDS`, and over `runs` seeds when the dirt is
 * stochastic or the program is random.
 */
export function evaluate(
	programs: readonly (ProgramId | AgentProgram)[],
	config: EvaluationConfig
): ProgramEvaluation[] {
	const p = config.dirtProbability ?? 0;
	const seed = Number.isFinite(config.seed) ? config.seed! : 0;
	const requested = config.runs ?? DEFAULT_EVALUATION_RUNS;
	const runsIfRandom = Number.isFinite(requested)
		? Math.max(1, Math.floor(requested))
		: DEFAULT_EVALUATION_RUNS;
	return programs.map((entry) => {
		const program = resolveProgram(entry, config.table);
		const runs = p > 0 || program.stochastic ? runsIfRandom : 1;
		const byInitial = INITIAL_WORLDS.map((initial) => {
			let sum = 0;
			for (let r = 0; r < runs; r++) {
				sum += simulate({
					program,
					initial,
					steps: config.steps,
					dirtProbability: p,
					measure: config.measure,
					seed: seed + r
				}).total;
			}
			return { initial: worldName(initial), average: sum / runs };
		});
		const averages = byInitial.map((b) => b.average);
		return {
			program: program.id,
			name: program.name,
			average: averages.reduce((a, b) => a + b, 0) / averages.length,
			min: Math.min(...averages),
			max: Math.max(...averages),
			byInitial,
			runs
		};
	});
}

/** Indices of the evaluations with the highest average (all of them when tied). */
export function bestEvaluations(evaluations: readonly ProgramEvaluation[]): number[] {
	if (!evaluations.length) return [];
	const top = Math.max(...evaluations.map((e) => e.average));
	return evaluations.flatMap((e, i) => (Math.abs(e.average - top) < 1e-9 ? [i] : []));
}
