/**
 * Task environments (Rational Agents, slides 6–20): the PEAS description, the
 * seven environment types, the examples of slide 17, and the "Preview of the
 * course" (slide 18) that maps environment types to the methods of the course.
 *
 * Wording follows the slides; see docs/ARCHITECTURE.md §3.5.
 */
import type { Citation } from '$lib/lectures';
import type { Diagnostic } from '../diagnostics';

// ---------------------------------------------------------------------------
// Dimensions and values
// ---------------------------------------------------------------------------

/** The environment types in slide order (slides 9 and 20). */
export type Dimension =
	'observable' | 'deterministic' | 'episodic' | 'static' | 'discrete' | 'agents' | 'known';

/** The values of each dimension. */
export interface DimensionValues {
	observable: 'fully' | 'partially';
	deterministic: 'deterministic' | 'stochastic' | 'strategic';
	episodic: 'episodic' | 'sequential';
	static: 'static' | 'dynamic' | 'semidynamic';
	discrete: 'discrete' | 'continuous';
	agents: 'single' | 'multi';
	known: 'known' | 'unknown';
}

export type DimensionValue<D extends Dimension = Dimension> = DimensionValues[D];

/**
 * A task environment's type: one value per dimension. Any dimension may be
 * left out (the slide 17 table has no "Known" row; a new environment starts
 * empty).
 */
export type EnvironmentProfile = { [D in Dimension]?: DimensionValues[D] };

export interface ValueInfo<V extends string = string> {
	id: V;
	/** The value as written in the slide 17 table: "Fully", "Multi". */
	label: string;
	/** Full name: "Fully observable", "Multi-agent". */
	name: string;
	/** One-line definition, in the slide's words where it gives one. */
	definition: string;
	/** What the slide pictures for this value, if anything. */
	pictured?: string;
}

export interface DimensionInfo<D extends Dimension = Dimension> {
	id: D;
	/** Row label as in the slide 17 table ("Observable", "Single agent"). */
	label: string;
	/** Slide title: "Fully observable vs. partially observable". */
	title: string;
	/** The slide's question, verbatim. */
	question: string;
	/** The slide's sub-bullets under the question, verbatim. */
	details: readonly string[];
	values: readonly ValueInfo<DimensionValues[D]>[];
	cite: Citation;
}

type DimensionTable = { [D in Dimension]: DimensionInfo<D> };

const DIMENSION_TABLE: DimensionTable = {
	observable: {
		id: 'observable',
		label: 'Observable',
		title: 'Fully observable vs. partially observable',
		question: "Do the agent's sensors give it access to the complete state of the environment?",
		details: ['For any given world state, are the values of all the variables known to the agent?'],
		values: [
			{
				id: 'fully',
				label: 'Fully',
				name: 'Fully observable',
				definition:
					"The agent's sensors give it access to the complete state of the environment: the values of all the variables are known to the agent.",
				pictured: 'simulated robot soccer seen from above'
			},
			{
				id: 'partially',
				label: 'Partially',
				name: 'Partially observable',
				definition:
					"The agent's sensors give it access to only part of the state: some variables' values are not known to the agent.",
				pictured: 'humanoid robots playing soccer'
			}
		],
		cite: { deck: 'agents', slide: 10 }
	},
	deterministic: {
		id: 'deterministic',
		label: 'Deterministic',
		title: 'Deterministic vs. stochastic',
		question:
			'Is the next state of the environment completely determined by the current state and the agent’s action?',
		details: [
			'Is the transition model deterministic (unique successor state given current state and action) or stochastic (distribution over successor states given current state and action)?',
			'Strategic: the environment is deterministic except for the actions of other agents'
		],
		values: [
			{
				id: 'deterministic',
				label: 'Deterministic',
				name: 'Deterministic',
				definition:
					'The transition model gives a unique successor state for the current state and action.',
				pictured: 'checkers'
			},
			{
				id: 'stochastic',
				label: 'Stochastic',
				name: 'Stochastic',
				definition:
					'The transition model gives a distribution over successor states for the current state and action.',
				pictured: 'backgammon, with dice'
			},
			{
				id: 'strategic',
				label: 'Strategic',
				name: 'Strategic',
				definition: 'The environment is deterministic except for the actions of other agents.'
			}
		],
		cite: { deck: 'agents', slide: 11 }
	},
	episodic: {
		id: 'episodic',
		label: 'Episodic',
		title: 'Episodic vs. sequential',
		question:
			'Is the agent’s experience divided into unconnected single decisions/actions, or is it a coherent sequence of observations and actions in which the world evolves according to the transition model?',
		details: [],
		values: [
			{
				id: 'episodic',
				label: 'Episodic',
				name: 'Episodic',
				definition:
					'The agent’s experience is divided into atomic episodes, and the choice of action in each episode depends only on the episode itself.',
				pictured: 'a spam filter'
			},
			{
				id: 'sequential',
				label: 'Sequential',
				name: 'Sequential',
				definition:
					'A coherent sequence of observations and actions in which the world evolves according to the transition model.',
				pictured: 'Pac-Man'
			}
		],
		cite: { deck: 'agents', slide: 12 }
	},
	static: {
		id: 'static',
		label: 'Static',
		title: 'Static vs. dynamic',
		question: 'Is the world changing while the agent is thinking?',
		details: [
			"Semidynamic: the environment does not change with the passage of time, but the agent's performance score does"
		],
		values: [
			{
				id: 'static',
				label: 'Static',
				name: 'Static',
				definition: 'The world does not change while the agent is thinking.',
				pictured: 'a Rubik’s cube'
			},
			{
				id: 'dynamic',
				label: 'Dynamic',
				name: 'Dynamic',
				definition: 'The world changes while the agent is thinking.',
				pictured: 'a cartoon cat chasing a mouse'
			},
			{
				id: 'semidynamic',
				label: 'Semidynamic',
				name: 'Semidynamic',
				definition:
					"The environment does not change with the passage of time, but the agent's performance score does."
			}
		],
		cite: { deck: 'agents', slide: 13 }
	},
	discrete: {
		id: 'discrete',
		label: 'Discrete',
		title: 'Discrete vs. continuous',
		question:
			'Does the environment provide a fixed number of distinct percepts, actions, and environment states?',
		details: [
			'Are the values of the state variables discrete or continuous?',
			'Time can also evolve in a discrete or continuous fashion'
		],
		values: [
			{
				id: 'discrete',
				label: 'Discrete',
				name: 'Discrete',
				definition:
					'A fixed number of distinct percepts, actions, and environment states; the state variables take discrete values.',
				pictured: 'a chess diagram'
			},
			{
				id: 'continuous',
				label: 'Continuous',
				name: 'Continuous',
				definition:
					'The state variables (and possibly time) take continuous values, so there is no fixed number of distinct states.',
				pictured: 'a robot arm moving pieces on a real chessboard'
			}
		],
		cite: { deck: 'agents', slide: 14 }
	},
	agents: {
		id: 'agents',
		label: 'Single agent',
		title: 'Single-agent vs. multiagent',
		question: 'Is an agent operating by itself in the environment?',
		details: [],
		values: [
			{
				id: 'single',
				label: 'Single',
				name: 'Single agent',
				definition: 'The agent operates by itself in the environment.',
				pictured: 'a rat in a maze'
			},
			{
				id: 'multi',
				label: 'Multi',
				name: 'Multi-agent',
				definition: 'Other agents act in the environment as well.',
				pictured: 'a crowd of simulated people'
			}
		],
		cite: { deck: 'agents', slide: 15 }
	},
	known: {
		id: 'known',
		label: 'Known',
		title: 'Known vs. unknown',
		question:
			'Are the rules of the environment (transition model and rewards associated with states) known to the agent?',
		details: [
			'Strictly speaking, not a property of the environment, but of the agent’s state of knowledge'
		],
		values: [
			{
				id: 'known',
				label: 'Known',
				name: 'Known',
				definition:
					'The rules of the environment (transition model and rewards associated with states) are known to the agent.',
				pictured: 'Monopoly'
			},
			{
				id: 'unknown',
				label: 'Unknown',
				name: 'Unknown',
				definition:
					'The agent does not know the rules of the environment (transition model and rewards) in advance.',
				pictured: 'an unfamiliar game world'
			}
		],
		cite: { deck: 'agents', slide: 16 }
	}
};

/** Dimension ids in slide order. */
export const DIMENSION_IDS: readonly Dimension[] = [
	'observable',
	'deterministic',
	'episodic',
	'static',
	'discrete',
	'agents',
	'known'
];

/** The seven dimensions in slide order (slides 9, 10–16, 20). */
export const DIMENSIONS: readonly DimensionInfo[] = DIMENSION_IDS.map(
	(id) => DIMENSION_TABLE[id] as DimensionInfo
);

/** Slide listing the dimensions ("Environment types"). */
export const DIMENSIONS_CITE: Citation = { deck: 'agents', slide: 9 };

/** The dimension with this id. */
export function dimension<D extends Dimension>(id: D): DimensionInfo<D> {
	return DIMENSION_TABLE[id] as DimensionInfo<D>;
}

/** Whether `value` is a dimension id. */
export function isDimension(value: unknown): value is Dimension {
	return typeof value === 'string' && (DIMENSION_IDS as readonly string[]).includes(value);
}

/** Whether `value` is one of the values of dimension `d`. */
export function isDimensionValue<D extends Dimension>(
	d: D,
	value: unknown
): value is DimensionValues[D] {
	return (
		typeof value === 'string' && DIMENSION_TABLE[d].values.some((v: ValueInfo) => v.id === value)
	);
}

/** The value's labels and definition; undefined when it is not a value of `d`. */
export function valueInfo<D extends Dimension>(
	d: D,
	value: DimensionValues[D] | undefined
): ValueInfo<DimensionValues[D]> | undefined {
	return (DIMENSION_TABLE[d].values as readonly ValueInfo<DimensionValues[D]>[]).find(
		(v) => v.id === value
	);
}

/**
 * Position of a value within its dimension, in slide order: 0 for the first
 * value of each "X vs. Y" pair (Fully, Deterministic, …), 1 for the second,
 * 2 for the values the review slide adds in parentheses (Strategic,
 * Semidynamic). -1 when the value does not belong to the dimension.
 */
export function valueIndex<D extends Dimension>(
	d: D,
	value: DimensionValues[D] | undefined
): number {
	return DIMENSION_TABLE[d].values.findIndex((v: ValueInfo) => v.id === value);
}

/** Whether `value` is an object whose fields are dimensions with valid values. */
export function isEnvironmentProfile(value: unknown): value is EnvironmentProfile {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	for (const [key, v] of Object.entries(value)) {
		if (!isDimension(key)) return false;
		if (v !== undefined && !isDimensionValue(key, v)) return false;
	}
	return true;
}

/** A copy of `profile` with only the dimensions that are set, in slide order. */
export function normalizeProfile(profile: EnvironmentProfile): EnvironmentProfile {
	const out: Record<string, string> = {};
	for (const d of DIMENSION_IDS) {
		const v = profile[d];
		if (v !== undefined) out[d] = v;
	}
	return out as EnvironmentProfile;
}

/** Whether two profiles set the same dimensions to the same values. */
export function sameProfile(a: EnvironmentProfile, b: EnvironmentProfile): boolean {
	return DIMENSION_IDS.every((d) => a[d] === b[d]);
}

/**
 * Notes about a profile's combination of values. Strategic means "deterministic
 * except for the actions of other agents" (slide 11), so it needs other agents.
 */
export function profileDiagnostics(profile: EnvironmentProfile): Diagnostic[] {
	const out: Diagnostic[] = [];
	if (profile.deterministic === 'strategic' && profile.agents === 'single') {
		out.push({
			severity: 'warning',
			message:
				'Strategic means deterministic except for the actions of other agents, but this environment is single agent.'
		});
	}
	return out;
}

// ---------------------------------------------------------------------------
// PEAS
// ---------------------------------------------------------------------------

/** The parts of a PEAS description, in order (slide 6). */
export type PeasPart = 'performance' | 'environment' | 'actuators' | 'sensors';

export const PEAS_PARTS: readonly {
	id: PeasPart;
	letter: string;
	name: string;
	/** What the part is (slide 6). */
	definition: string;
}[] = [
	{
		id: 'performance',
		letter: 'P',
		name: 'Performance measure',
		definition: 'A function the agent is maximizing (or minimizing)'
	},
	{
		id: 'environment',
		letter: 'E',
		name: 'Environment',
		definition: 'A formal representation for world states'
	},
	{
		id: 'actuators',
		letter: 'A',
		name: 'Actuators',
		definition: 'Actions that change the state according to a transition model'
	},
	{
		id: 'sensors',
		letter: 'S',
		name: 'Sensors',
		definition: 'Observations that allow the agent to infer the world state'
	}
];

/** A PEAS description: one line of text per part. */
export type Peas = Record<PeasPart, string>;

export interface PeasExample {
	id: string;
	name: string;
	peas: Peas;
	/** Where each part comes from: a slide, or null for text written for this site. */
	sources: Record<PeasPart, Citation | null>;
}

/** PEAS: Performance measure, Environment, Actuators, Sensors (slide 6). */
export const PEAS_CITE: Citation = { deck: 'agents', slide: 6 };

/** An empty PEAS description. */
export function emptyPeas(): Peas {
	return { performance: '', environment: '', actuators: '', sensors: '' };
}

const TAXI_SLIDE: Citation = { deck: 'agents', slide: 7 };
const SPAM_SLIDE: Citation = { deck: 'agents', slide: 8 };
const VACUUM_SLIDE: Citation = { deck: 'agents', slide: 3 };

/** The PEAS examples of slides 7 and 8, as written, and the vacuum world. */
export const PEAS_EXAMPLES: readonly PeasExample[] = [
	{
		id: 'taxi',
		name: 'Autonomous taxi',
		peas: {
			performance: 'Safe, fast, legal, comfortable trip, maximize profits',
			environment: 'Roads, other traffic, pedestrians, customers',
			actuators: 'Steering wheel, accelerator, brake, signal, horn',
			sensors: 'Cameras, LIDAR, speedometer, GPS, odometer, engine sensors, keyboard'
		},
		sources: {
			performance: TAXI_SLIDE,
			environment: TAXI_SLIDE,
			actuators: TAXI_SLIDE,
			sensors: TAXI_SLIDE
		}
	},
	{
		id: 'spam-filter',
		name: 'Spam filter',
		peas: {
			performance: 'Minimizing false positives, false negatives',
			environment: 'A user’s email account, email server',
			actuators: 'Mark as spam, delete, etc.',
			sensors: 'Incoming messages, other information about user’s account'
		},
		sources: {
			performance: SPAM_SLIDE,
			environment: SPAM_SLIDE,
			actuators: SPAM_SLIDE,
			sensors: SPAM_SLIDE
		}
	},
	{
		id: 'vacuum',
		name: 'Vacuum world',
		peas: {
			performance: '+1 per clean square after each time step',
			environment: 'Squares A and B, each clean or dirty',
			actuators: 'Left, Right, Suck, NoOp',
			sensors: 'Location and status, e.g., [A, Dirty]'
		},
		sources: {
			performance: null,
			environment: null,
			actuators: VACUUM_SLIDE,
			sensors: VACUUM_SLIDE
		}
	}
];

/** The PEAS example with this id. */
export function peasExample(id: string): PeasExample | undefined {
	return PEAS_EXAMPLES.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Example environments
// ---------------------------------------------------------------------------

export interface EnvironmentExample {
	id: string;
	name: string;
	/**
	 * 'slide': the values are the slide 17 table's (cited by `cite`).
	 * 'site': the values are this site's classification; the slides do not give them.
	 */
	source: 'slide' | 'site';
	/** The slide that gives the values (slide 17 examples only). */
	cite?: Citation;
	/** Slides where the example itself appears (site examples). */
	appears: readonly Citation[];
	profile: EnvironmentProfile;
	/** One line per dimension explaining the value (written for this site). */
	reasons: Partial<Record<Dimension, string>>;
	/** Id of the PEAS description in PEAS_EXAMPLES, if there is one. */
	peas?: string;
}

/** Examples of different environments (slide 17). */
export const SLIDE_17: Citation = { deck: 'agents', slide: 17 };

/**
 * The slide 17 table, column by column, then examples classified on this
 * site. The table has no "Known" row, so its examples leave `known` unset.
 */
export const ENVIRONMENT_EXAMPLES: readonly EnvironmentExample[] = [
	{
		id: 'word-jumble',
		name: 'Word jumble solver',
		source: 'slide',
		cite: SLIDE_17,
		appears: [SLIDE_17],
		profile: {
			observable: 'fully',
			deterministic: 'deterministic',
			episodic: 'episodic',
			static: 'static',
			discrete: 'discrete',
			agents: 'single'
		},
		reasons: {
			observable: 'All the scrambled letters are in view.',
			deterministic: 'Rearranging letters has exactly one result.',
			episodic: 'Each jumbled word is solved on its own; one answer does not change the next word.',
			static: 'The letters do not change while the solver thinks.',
			discrete: 'Finitely many letters and arrangements.',
			agents: 'No one else acts on the puzzle.'
		}
	},
	{
		id: 'chess-clock',
		name: 'Chess with a clock',
		source: 'slide',
		cite: SLIDE_17,
		appears: [SLIDE_17],
		profile: {
			observable: 'fully',
			deterministic: 'strategic',
			episodic: 'sequential',
			static: 'semidynamic',
			discrete: 'discrete',
			agents: 'multi'
		},
		reasons: {
			observable: 'Both players see the whole board.',
			deterministic: 'A move has one result, but the opponent’s replies are not up to the agent.',
			episodic: 'Every move changes the position the rest of the game starts from.',
			static: 'The board does not change while a player thinks, but the clock keeps running.',
			discrete: 'Finitely many positions and legal moves.',
			agents: 'Two players.'
		}
	},
	{
		id: 'scrabble',
		name: 'Scrabble',
		source: 'slide',
		cite: SLIDE_17,
		appears: [SLIDE_17],
		profile: {
			observable: 'partially',
			deterministic: 'stochastic',
			episodic: 'sequential',
			static: 'static',
			discrete: 'discrete',
			agents: 'multi'
		},
		reasons: {
			observable: 'The other players’ tiles and the tiles left in the bag are hidden.',
			deterministic: 'New tiles are drawn at random from the bag.',
			episodic: 'Each word changes the board for the turns that follow.',
			static: 'The board does not change while a player thinks, and there is no clock.',
			discrete: 'Finitely many tiles, squares, and words.',
			agents: 'Two to four players.'
		}
	},
	{
		id: 'autonomous-driving',
		name: 'Autonomous driving',
		source: 'slide',
		cite: SLIDE_17,
		appears: [SLIDE_17],
		profile: {
			observable: 'partially',
			deterministic: 'stochastic',
			episodic: 'sequential',
			static: 'dynamic',
			discrete: 'continuous',
			agents: 'multi'
		},
		reasons: {
			observable: 'The sensors cannot see everything around the car, or what other drivers intend.',
			deterministic: 'Other traffic, pedestrians, and road conditions make outcomes uncertain.',
			episodic: 'Each maneuver changes the situations that follow.',
			static: 'Traffic keeps moving while the car decides.',
			discrete: 'Positions, speeds, and steering angles are real-valued; time is continuous.',
			agents: 'Other drivers and pedestrians act in the same environment.'
		},
		peas: 'taxi'
	},
	{
		id: 'vacuum',
		name: 'Vacuum world',
		source: 'site',
		appears: [
			{ deck: 'agents', slide: [3, 5] },
			{ deck: 'search', slide: 8 }
		],
		profile: {
			observable: 'partially',
			deterministic: 'deterministic',
			episodic: 'sequential',
			static: 'static',
			discrete: 'discrete',
			agents: 'single',
			known: 'known'
		},
		reasons: {
			observable: 'The percept [location, status] reports the dirt in the agent’s own square only.',
			deterministic: 'Left, Right, and Suck each have one result, and cleaned squares stay clean.',
			episodic: 'Where the agent moves now decides which square it can clean next.',
			static: 'Nothing changes while the agent decides; dirt goes only when the agent sucks it up.',
			discrete: 'Two squares, each clean or dirty: 8 states and 4 actions.',
			agents: 'The vacuum cleaner is the only agent.',
			known: 'The effects of Left, Right, Suck, and NoOp are given in advance.'
		},
		peas: 'vacuum'
	},
	{
		id: 'romania',
		name: 'Route finding in Romania',
		source: 'site',
		appears: [{ deck: 'search', slide: 6 }],
		profile: {
			observable: 'fully',
			deterministic: 'deterministic',
			episodic: 'sequential',
			static: 'static',
			discrete: 'discrete',
			agents: 'single',
			known: 'known'
		},
		reasons: {
			observable: 'The agent knows which city it is in.',
			deterministic: 'Going from city A to city B always ends up in city B.',
			episodic: 'Each road taken decides which cities can come next.',
			static: 'The map and the road lengths do not change while the agent plans.',
			discrete: '20 cities joined by a fixed set of roads.',
			agents: 'No other agent affects the trip.',
			known: 'The map (transition model) and road lengths (step costs) are given.'
		}
	},
	{
		id: 'eight-puzzle',
		name: '8-puzzle',
		source: 'site',
		appears: [
			{ deck: 'search', slide: 10 },
			{ deck: 'informed', slide: 32 }
		],
		profile: {
			observable: 'fully',
			deterministic: 'deterministic',
			episodic: 'sequential',
			static: 'static',
			discrete: 'discrete',
			agents: 'single',
			known: 'known'
		},
		reasons: {
			observable: 'All eight tiles and the blank are in view.',
			deterministic: 'Moving the blank has exactly one result.',
			episodic: 'Each move changes the board the next move starts from.',
			static: 'The board changes only when the agent moves a tile.',
			discrete: '181,440 reachable boards and 4 actions.',
			agents: 'One player; there is no opponent.',
			known: 'The rules for moving tiles are given.'
		}
	},
	{
		id: 'spam-filter',
		name: 'Spam filter',
		source: 'site',
		appears: [
			{ deck: 'agents', slide: 8 },
			{ deck: 'agents', slide: 12 }
		],
		profile: {
			observable: 'partially',
			deterministic: 'stochastic',
			episodic: 'episodic',
			static: 'static',
			discrete: 'discrete',
			agents: 'single',
			known: 'unknown'
		},
		reasons: {
			observable: 'The filter sees a message’s text, not the sender’s intent.',
			deterministic: 'Which message arrives next does not depend on the filter’s last decision.',
			episodic: 'Each message is judged on its own (pictured as episodic on slide 12).',
			static: 'A message does not change while the filter decides.',
			discrete: 'Messages are finite strings; the actions are a few labels.',
			agents:
				'Senders are treated as part of the environment, not as agents reacting to the filter.',
			known: 'What spam looks like is not given; the filter estimates it from examples.'
		},
		peas: 'spam-filter'
	},
	{
		id: 'taxi',
		name: 'Autonomous taxi',
		source: 'site',
		appears: [{ deck: 'agents', slide: 7 }],
		profile: {
			observable: 'partially',
			deterministic: 'stochastic',
			episodic: 'sequential',
			static: 'dynamic',
			discrete: 'continuous',
			agents: 'multi',
			known: 'known'
		},
		reasons: {
			observable: 'Cameras and LIDAR cannot see around corners or into other drivers’ plans.',
			deterministic: 'Traffic, pedestrians, and customers make outcomes uncertain.',
			episodic: 'Each maneuver changes the rest of the trip.',
			static: 'Traffic keeps moving while the taxi decides.',
			discrete: 'Positions, speeds, and steering angles are real-valued; time is continuous.',
			agents: 'Other drivers, pedestrians, and customers act too.',
			known: 'How the controls work and the rules of the road are known in advance.'
		},
		peas: 'taxi'
	}
];

/** Ids of the four slide 17 examples, in the slide's column order. */
export const SLIDE_17_IDS: readonly string[] = ENVIRONMENT_EXAMPLES.filter(
	(e) => e.source === 'slide'
).map((e) => e.id);

/** The example with this id. */
export function environmentExample(id: string): EnvironmentExample | undefined {
	return ENVIRONMENT_EXAMPLES.find((e) => e.id === id);
}

// ---------------------------------------------------------------------------
// Preview of the course (slide 18)
// ---------------------------------------------------------------------------

export type CourseRowId =
	| 'deterministic'
	| 'games'
	| 'stochastic-episodic'
	| 'stochastic-sequential-known'
	| 'stochastic-sequential-unknown';

/** A condition of a course row: the dimension must have one of these values. */
export interface CourseCondition {
	dimension: Dimension;
	values: readonly DimensionValue[];
}

export interface CourseRow {
	id: CourseRowId;
	/** The environments as written on slide 18: "Deterministic environments", "Episodic". */
	environments: string;
	/** The top-level bullet a sub-row belongs to ("Stochastic environments"). */
	group?: string;
	/** The methods as written on slide 18. */
	methods: string;
	/** The row's sub-bullet on the slide. */
	note?: string;
	/** Every condition must hold for the row to apply. */
	conditions: readonly CourseCondition[];
}

export const COURSE_PREVIEW_CITE: Citation = { deck: 'agents', slide: 18 };

/**
 * The rows of "Preview of the course" (slide 18) with the conditions each
 * one puts on an environment's type:
 *
 * - Deterministic environments: Deterministic = deterministic. The slide adds
 *   "can be sequential or episodic", so Episodic is not a condition.
 * - Multi-agent, strategic environments: Single agent = multi and
 *   Deterministic = strategic or stochastic. The slide adds "can also be
 *   stochastic, partially observable" (Scrabble in the slide 17 table), so a
 *   multi-agent stochastic environment qualifies; observability does not matter.
 * - Stochastic environments, episodic: Deterministic = stochastic and
 *   Episodic = episodic.
 * - Stochastic, sequential, known: stochastic, sequential, Known = known.
 * - Stochastic, sequential, unknown: stochastic, sequential, Known = unknown.
 *
 * Observable, Static, and Discrete are not conditions of any row.
 */
export const COURSE_PREVIEW: readonly CourseRow[] = [
	{
		id: 'deterministic',
		environments: 'Deterministic environments',
		methods: 'search, constraint satisfaction, classical planning',
		note: 'Can be sequential or episodic',
		conditions: [{ dimension: 'deterministic', values: ['deterministic'] }]
	},
	{
		id: 'games',
		environments: 'Multi-agent, strategic environments',
		methods: 'minimax search, games',
		note: 'Can also be stochastic, partially observable',
		conditions: [
			{ dimension: 'agents', values: ['multi'] },
			{ dimension: 'deterministic', values: ['strategic', 'stochastic'] }
		]
	},
	{
		id: 'stochastic-episodic',
		environments: 'Episodic',
		group: 'Stochastic environments',
		methods: 'Bayesian networks, pattern classifiers',
		conditions: [
			{ dimension: 'deterministic', values: ['stochastic'] },
			{ dimension: 'episodic', values: ['episodic'] }
		]
	},
	{
		id: 'stochastic-sequential-known',
		environments: 'Sequential, known',
		group: 'Stochastic environments',
		methods: 'Markov decision processes',
		conditions: [
			{ dimension: 'deterministic', values: ['stochastic'] },
			{ dimension: 'episodic', values: ['sequential'] },
			{ dimension: 'known', values: ['known'] }
		]
	},
	{
		id: 'stochastic-sequential-unknown',
		environments: 'Sequential, unknown',
		group: 'Stochastic environments',
		methods: 'reinforcement learning',
		conditions: [
			{ dimension: 'deterministic', values: ['stochastic'] },
			{ dimension: 'episodic', values: ['sequential'] },
			{ dimension: 'known', values: ['unknown'] }
		]
	}
];

/** The row's environments with its group: "Stochastic environments: episodic". */
export function courseRowTitle(row: CourseRow): string {
	return row.group ? `${row.group}: ${row.environments.toLowerCase()}` : row.environments;
}

/**
 * How a course row relates to a profile:
 * - 'applies': every condition holds;
 * - 'depends': no condition fails, at least one holds, and the others are on
 *   dimensions the profile leaves unset (listed in `missing`);
 * - 'no': a condition fails, or no condition is decided yet.
 */
export type CourseStatus = 'applies' | 'depends' | 'no';

export interface CourseRowMatch {
	row: CourseRow;
	status: CourseStatus;
	/** Dimensions a 'depends' row still needs, in slide order. */
	missing: Dimension[];
	/** One sentence: why the row applies, what it still needs, or why it does not. */
	reason: string;
}

/** Lower-case value name for use inside a sentence: "multi-agent", "stochastic". */
function phrase(d: Dimension, v: DimensionValue): string {
	const info = valueInfo(d, v);
	return (info?.name ?? v).toLowerCase();
}

/** "a", "a and b", "a, b, and c". */
function listText(items: readonly string[], joiner = 'and'): string {
	if (items.length <= 1) return items.join('');
	if (items.length === 2) return `${items[0]} ${joiner} ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, ${joiner} ${items[items.length - 1]}`;
}

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Whether a course row applies to a profile, and why (see CourseStatus). */
export function matchCourseRow(row: CourseRow, profile: EnvironmentProfile): CourseRowMatch {
	const held: string[] = [];
	const needed: string[] = [];
	const missing: Dimension[] = [];
	for (const c of row.conditions) {
		const v = profile[c.dimension];
		const wanted = listText(
			c.values.map((w) => phrase(c.dimension, w)),
			'or'
		);
		if (v === undefined) {
			missing.push(c.dimension);
			needed.push(wanted);
		} else if (c.values.includes(v)) {
			held.push(phrase(c.dimension, v));
		} else {
			return {
				row,
				status: 'no',
				missing: [],
				reason: `Needs ${wanted}; this environment is ${phrase(c.dimension, v)}.`
			};
		}
	}
	if (held.length === 0) {
		return {
			row,
			status: 'no',
			missing: [],
			reason: `Needs ${listText(needed)} (not set).`
		};
	}
	const order = (d: Dimension) => DIMENSION_IDS.indexOf(d);
	missing.sort((a, b) => order(a) - order(b));
	const heldText = capitalize(listText(held));
	if (missing.length > 0) {
		return {
			row,
			status: 'depends',
			missing,
			reason: `${heldText}; applies if it is also ${listText(needed)}.`
		};
	}
	const viaNote = row.id === 'games' && profile.deterministic === 'stochastic';
	return {
		row,
		status: 'applies',
		missing: [],
		reason: viaNote
			? `${heldText}; the slide notes these environments can also be stochastic.`
			: `${heldText}.`
	};
}

/**
 * The rows of "Preview of the course" (slide 18) that apply to an environment
 * (status 'applies') or would apply once more dimensions are set ('depends'),
 * in slide order. Partial profiles are allowed: an empty profile gives [].
 */
export function courseMethods(profile: EnvironmentProfile): CourseRowMatch[] {
	return COURSE_PREVIEW.map((row) => matchCourseRow(row, profile)).filter((m) => m.status !== 'no');
}

// ---------------------------------------------------------------------------
// The setting of the search lectures
// ---------------------------------------------------------------------------

/**
 * "We will consider the problem of designing goal-based agents in fully
 * observable, deterministic, discrete, known environments" (Solving Problems
 * by Searching, slides 3–4).
 */
export const SEARCH_SETTING: EnvironmentProfile = {
	observable: 'fully',
	deterministic: 'deterministic',
	discrete: 'discrete',
	known: 'known'
};

export const SEARCH_SETTING_CITE: Citation = { deck: 'search', slide: [3, 4] };

export interface ProfileComparison {
	/** Every dimension `required` sets is set to the same value in `profile`. */
	matches: boolean;
	/** Dimensions set to a different value. */
	differs: Dimension[];
	/** Dimensions `required` sets that `profile` leaves unset. */
	missing: Dimension[];
}

/** Compares a profile with the values `required` asks for (dimensions in slide order). */
export function compareProfile(
	profile: EnvironmentProfile,
	required: EnvironmentProfile
): ProfileComparison {
	const differs: Dimension[] = [];
	const missing: Dimension[] = [];
	for (const d of DIMENSION_IDS) {
		const want = required[d];
		if (want === undefined) continue;
		const have = profile[d];
		if (have === undefined) missing.push(d);
		else if (have !== want) differs.push(d);
	}
	return { matches: differs.length === 0 && missing.length === 0, differs, missing };
}
