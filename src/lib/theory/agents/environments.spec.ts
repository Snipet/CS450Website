import { describe, expect, it } from 'vitest';
import { decks, formatCitation } from '$lib/lectures';
import {
	COURSE_PREVIEW,
	COURSE_PREVIEW_CITE,
	DIMENSIONS,
	DIMENSIONS_CITE,
	DIMENSION_IDS,
	ENVIRONMENT_EXAMPLES,
	PEAS_CITE,
	PEAS_EXAMPLES,
	PEAS_PARTS,
	SEARCH_SETTING,
	SEARCH_SETTING_CITE,
	SLIDE_17,
	SLIDE_17_IDS,
	compareProfile,
	courseMethods,
	courseRowTitle,
	dimension,
	emptyPeas,
	environmentExample,
	isDimension,
	isDimensionValue,
	isEnvironmentProfile,
	matchCourseRow,
	normalizeProfile,
	peasExample,
	profileDiagnostics,
	sameProfile,
	valueIndex,
	valueInfo,
	type CourseRowId,
	type Dimension,
	type EnvironmentProfile
} from './environments';

const ids = (profile: EnvironmentProfile) => courseMethods(profile).map((m) => m.row.id);
const statuses = (profile: EnvironmentProfile) =>
	Object.fromEntries(courseMethods(profile).map((m) => [m.row.id, m.status]));
const example = (id: string) => {
	const e = environmentExample(id);
	if (!e) throw new Error(`no example ${id}`);
	return e;
};
const row = (id: CourseRowId) => COURSE_PREVIEW.find((r) => r.id === id)!;

describe('dimensions', () => {
	it('lists the seven environment types in slide order (slides 9, 20)', () => {
		expect(DIMENSION_IDS).toEqual([
			'observable',
			'deterministic',
			'episodic',
			'static',
			'discrete',
			'agents',
			'known'
		]);
		expect(DIMENSIONS.map((d) => d.id)).toEqual(DIMENSION_IDS);
		expect(DIMENSIONS_CITE).toEqual({ deck: 'agents', slide: 9 });
	});

	it('uses the slide titles and cites slides 10–16 in order', () => {
		expect(DIMENSIONS.map((d) => d.title)).toEqual([
			'Fully observable vs. partially observable',
			'Deterministic vs. stochastic',
			'Episodic vs. sequential',
			'Static vs. dynamic',
			'Discrete vs. continuous',
			'Single-agent vs. multiagent',
			'Known vs. unknown'
		]);
		expect(DIMENSIONS.map((d) => d.cite)).toEqual(
			[10, 11, 12, 13, 14, 15, 16].map((slide) => ({ deck: 'agents', slide }))
		);
	});

	it('labels the rows as the slide 17 table does, plus Known', () => {
		expect(DIMENSIONS.map((d) => d.label)).toEqual([
			'Observable',
			'Deterministic',
			'Episodic',
			'Static',
			'Discrete',
			'Single agent',
			'Known'
		]);
	});

	it('has the value names of ARCHITECTURE §3.5 (short slide 17 labels)', () => {
		expect(DIMENSIONS.map((d) => d.values.map((v) => v.label))).toEqual([
			['Fully', 'Partially'],
			['Deterministic', 'Stochastic', 'Strategic'],
			['Episodic', 'Sequential'],
			['Static', 'Dynamic', 'Semidynamic'],
			['Discrete', 'Continuous'],
			['Single', 'Multi'],
			['Known', 'Unknown']
		]);
		expect(DIMENSIONS.map((d) => d.values.map((v) => v.name))).toEqual([
			['Fully observable', 'Partially observable'],
			['Deterministic', 'Stochastic', 'Strategic'],
			['Episodic', 'Sequential'],
			['Static', 'Dynamic', 'Semidynamic'],
			['Discrete', 'Continuous'],
			['Single agent', 'Multi-agent'],
			['Known', 'Unknown']
		]);
	});

	it('quotes the slide questions', () => {
		expect(DIMENSIONS.map((d) => d.question)).toEqual([
			"Do the agent's sensors give it access to the complete state of the environment?",
			'Is the next state of the environment completely determined by the current state and the agent’s action?',
			'Is the agent’s experience divided into unconnected single decisions/actions, or is it a coherent sequence of observations and actions in which the world evolves according to the transition model?',
			'Is the world changing while the agent is thinking?',
			'Does the environment provide a fixed number of distinct percepts, actions, and environment states?',
			'Is an agent operating by itself in the environment?',
			'Are the rules of the environment (transition model and rewards associated with states) known to the agent?'
		]);
	});

	it('defines strategic, semidynamic, and known vs. unknown as the slides do', () => {
		expect(valueInfo('deterministic', 'strategic')?.definition).toBe(
			'The environment is deterministic except for the actions of other agents.'
		);
		expect(valueInfo('static', 'semidynamic')?.definition).toBe(
			"The environment does not change with the passage of time, but the agent's performance score does."
		);
		expect(dimension('known').details).toEqual([
			'Strictly speaking, not a property of the environment, but of the agent’s state of knowledge'
		]);
		for (const d of DIMENSIONS) for (const v of d.values) expect(v.definition).toMatch(/\.$/);
	});

	it('looks dimensions and values up', () => {
		expect(dimension('agents').label).toBe('Single agent');
		expect(isDimension('static')).toBe(true);
		expect(isDimension('agent')).toBe(false);
		expect(isDimension(3)).toBe(false);
		expect(isDimensionValue('deterministic', 'strategic')).toBe(true);
		expect(isDimensionValue('static', 'strategic')).toBe(false);
		expect(isDimensionValue('agents', undefined)).toBe(false);
		expect(valueInfo('agents', 'multi')?.name).toBe('Multi-agent');
		expect(valueInfo('agents', undefined)).toBeUndefined();
	});

	it('numbers values within their dimension in slide order', () => {
		expect(valueIndex('observable', 'fully')).toBe(0);
		expect(valueIndex('observable', 'partially')).toBe(1);
		expect(valueIndex('deterministic', 'strategic')).toBe(2);
		expect(valueIndex('static', 'semidynamic')).toBe(2);
		expect(valueIndex('known', undefined)).toBe(-1);
	});
});

describe('profiles', () => {
	it('validates profiles', () => {
		expect(isEnvironmentProfile({})).toBe(true);
		expect(isEnvironmentProfile({ agents: 'multi', known: 'unknown' })).toBe(true);
		expect(isEnvironmentProfile({ agents: undefined })).toBe(true);
		for (const bad of [
			null,
			[],
			'fully',
			{ agents: 'many' },
			{ observable: 'multi' },
			{ colour: 'red' },
			{ known: 1 }
		]) {
			expect(isEnvironmentProfile(bad)).toBe(false);
		}
	});

	it('normalizes to slide order without unset dimensions', () => {
		const n = normalizeProfile({ known: 'known', observable: 'fully', agents: undefined });
		expect(n).toEqual({ observable: 'fully', known: 'known' });
		expect(Object.keys(n)).toEqual(['observable', 'known']);
	});

	it('compares profiles dimension by dimension', () => {
		expect(sameProfile({ agents: 'multi' }, { agents: 'multi', known: undefined })).toBe(true);
		expect(sameProfile({ agents: 'multi' }, { agents: 'single' })).toBe(false);
		expect(sameProfile({}, { known: 'known' })).toBe(false);
	});

	it('warns about a strategic single-agent environment', () => {
		expect(profileDiagnostics({ deterministic: 'strategic', agents: 'single' })).toEqual([
			{
				severity: 'warning',
				message:
					'Strategic means deterministic except for the actions of other agents, but this environment is single agent.'
			}
		]);
		expect(profileDiagnostics({ deterministic: 'strategic', agents: 'multi' })).toEqual([]);
		expect(profileDiagnostics({ deterministic: 'strategic' })).toEqual([]);
		for (const e of ENVIRONMENT_EXAMPLES) expect(profileDiagnostics(e.profile)).toEqual([]);
	});
});

describe('examples of different environments (slide 17)', () => {
	it('reproduces the slide 17 table column by column', () => {
		const table = SLIDE_17_IDS.map((id) => {
			const e = example(id);
			return [e.name, ...DIMENSION_IDS.slice(0, 6).map((d) => valueInfo(d, e.profile[d])?.label)];
		});
		expect(table).toEqual([
			['Word jumble solver', 'Fully', 'Deterministic', 'Episodic', 'Static', 'Discrete', 'Single'],
			[
				'Chess with a clock',
				'Fully',
				'Strategic',
				'Sequential',
				'Semidynamic',
				'Discrete',
				'Multi'
			],
			['Scrabble', 'Partially', 'Stochastic', 'Sequential', 'Static', 'Discrete', 'Multi'],
			[
				'Autonomous driving',
				'Partially',
				'Stochastic',
				'Sequential',
				'Dynamic',
				'Continuous',
				'Multi'
			]
		]);
	});

	it('cites slide 17 and leaves Known unset (the table has no such row)', () => {
		expect(SLIDE_17).toEqual({ deck: 'agents', slide: 17 });
		for (const id of SLIDE_17_IDS) {
			const e = example(id);
			expect(e.source).toBe('slide');
			expect(e.cite).toEqual(SLIDE_17);
			expect(e.profile.known).toBeUndefined();
		}
	});

	it('marks the other examples as classified on this site, with a reason per dimension', () => {
		const site = ENVIRONMENT_EXAMPLES.filter((e) => e.source === 'site');
		expect(site.map((e) => e.id)).toEqual([
			'vacuum',
			'romania',
			'eight-puzzle',
			'spam-filter',
			'taxi'
		]);
		for (const e of site) {
			expect(e.cite).toBeUndefined();
			expect(e.appears.length).toBeGreaterThan(0);
			expect(Object.keys(e.profile)).toEqual(DIMENSION_IDS);
			expect(Object.keys(e.reasons)).toEqual(DIMENSION_IDS);
		}
	});

	it('gives every example valid values and a reason for each value it sets', () => {
		expect(new Set(ENVIRONMENT_EXAMPLES.map((e) => e.id)).size).toBe(ENVIRONMENT_EXAMPLES.length);
		for (const e of ENVIRONMENT_EXAMPLES) {
			expect(isEnvironmentProfile(e.profile)).toBe(true);
			for (const d of DIMENSION_IDS) {
				if (e.profile[d] !== undefined) expect(e.reasons[d]).toMatch(/\.$/);
			}
			for (const c of e.appears) {
				const slide = typeof c.slide === 'number' ? c.slide : (c.slide?.[1] ?? 0);
				expect(slide).toBeLessThanOrEqual(decks[c.deck].slides);
			}
			if (e.peas) expect(peasExample(e.peas)).toBeDefined();
		}
	});

	it('classifies the search examples in the setting of the search lectures (slides 3–4)', () => {
		expect(SEARCH_SETTING).toEqual({
			observable: 'fully',
			deterministic: 'deterministic',
			discrete: 'discrete',
			known: 'known'
		});
		expect(formatCitation(SEARCH_SETTING_CITE)).toBe('Solving Problems by Searching · slides 3–4');
		expect(compareProfile(example('romania').profile, SEARCH_SETTING).matches).toBe(true);
		expect(compareProfile(example('eight-puzzle').profile, SEARCH_SETTING).matches).toBe(true);
		// The slide 3 vacuum agent perceives only its own square.
		expect(compareProfile(example('vacuum').profile, SEARCH_SETTING)).toEqual({
			matches: false,
			differs: ['observable'],
			missing: []
		});
	});

	it('looks examples up by id', () => {
		expect(environmentExample('scrabble')?.name).toBe('Scrabble');
		expect(environmentExample('poker')).toBeUndefined();
		expect(SLIDE_17_IDS).toEqual(['word-jumble', 'chess-clock', 'scrabble', 'autonomous-driving']);
	});
});

describe('PEAS', () => {
	it('names the parts in order (slide 6)', () => {
		expect(PEAS_CITE).toEqual({ deck: 'agents', slide: 6 });
		expect(PEAS_PARTS.map((p) => `${p.letter}: ${p.name}`)).toEqual([
			'P: Performance measure',
			'E: Environment',
			'A: Actuators',
			'S: Sensors'
		]);
		expect(PEAS_PARTS.map((p) => p.definition)).toEqual([
			'A function the agent is maximizing (or minimizing)',
			'A formal representation for world states',
			'Actions that change the state according to a transition model',
			'Observations that allow the agent to infer the world state'
		]);
		expect(emptyPeas()).toEqual({ performance: '', environment: '', actuators: '', sensors: '' });
	});

	it('quotes the autonomous taxi (slide 7)', () => {
		const taxi = peasExample('taxi')!;
		expect(taxi.name).toBe('Autonomous taxi');
		expect(taxi.peas).toEqual({
			performance: 'Safe, fast, legal, comfortable trip, maximize profits',
			environment: 'Roads, other traffic, pedestrians, customers',
			actuators: 'Steering wheel, accelerator, brake, signal, horn',
			sensors: 'Cameras, LIDAR, speedometer, GPS, odometer, engine sensors, keyboard'
		});
		for (const p of PEAS_PARTS) expect(taxi.sources[p.id]).toEqual({ deck: 'agents', slide: 7 });
	});

	it('quotes the spam filter (slide 8)', () => {
		const spam = peasExample('spam-filter')!;
		expect(spam.peas).toEqual({
			performance: 'Minimizing false positives, false negatives',
			environment: 'A user’s email account, email server',
			actuators: 'Mark as spam, delete, etc.',
			sensors: 'Incoming messages, other information about user’s account'
		});
		for (const p of PEAS_PARTS) expect(spam.sources[p.id]).toEqual({ deck: 'agents', slide: 8 });
	});

	it('takes the vacuum world’s actions and percepts from slide 3 and marks the rest as a site example', () => {
		const vacuum = peasExample('vacuum')!;
		expect(vacuum.peas.actuators).toBe('Left, Right, Suck, NoOp');
		expect(vacuum.peas.sensors).toBe('Location and status, e.g., [A, Dirty]');
		expect(vacuum.sources).toEqual({
			performance: null,
			environment: null,
			actuators: { deck: 'agents', slide: 3 },
			sensors: { deck: 'agents', slide: 3 }
		});
		expect(peasExample('chess')).toBeUndefined();
		expect(PEAS_EXAMPLES.map((p) => p.id)).toEqual(['taxi', 'spam-filter', 'vacuum']);
	});
});

describe('preview of the course (slide 18)', () => {
	it('lists the slide 18 rows as written', () => {
		expect(COURSE_PREVIEW_CITE).toEqual({ deck: 'agents', slide: 18 });
		expect(COURSE_PREVIEW.map((r) => [courseRowTitle(r), r.methods, r.note ?? null])).toEqual([
			[
				'Deterministic environments',
				'search, constraint satisfaction, classical planning',
				'Can be sequential or episodic'
			],
			[
				'Multi-agent, strategic environments',
				'minimax search, games',
				'Can also be stochastic, partially observable'
			],
			['Stochastic environments: episodic', 'Bayesian networks, pattern classifiers', null],
			['Stochastic environments: sequential, known', 'Markov decision processes', null],
			['Stochastic environments: sequential, unknown', 'reinforcement learning', null]
		]);
	});

	it('matches every example', () => {
		const got = Object.fromEntries(ENVIRONMENT_EXAMPLES.map((e) => [e.id, statuses(e.profile)]));
		expect(got).toEqual({
			'word-jumble': { deterministic: 'applies' },
			'chess-clock': { games: 'applies' },
			scrabble: {
				games: 'applies',
				'stochastic-sequential-known': 'depends',
				'stochastic-sequential-unknown': 'depends'
			},
			'autonomous-driving': {
				games: 'applies',
				'stochastic-sequential-known': 'depends',
				'stochastic-sequential-unknown': 'depends'
			},
			vacuum: { deterministic: 'applies' },
			romania: { deterministic: 'applies' },
			'eight-puzzle': { deterministic: 'applies' },
			'spam-filter': { 'stochastic-episodic': 'applies' },
			taxi: { games: 'applies', 'stochastic-sequential-known': 'applies' }
		});
	});

	it('explains each match', () => {
		const reasons = (id: string) =>
			Object.fromEntries(courseMethods(example(id).profile).map((m) => [m.row.id, m.reason]));
		expect(reasons('word-jumble')).toEqual({ deterministic: 'Deterministic.' });
		expect(reasons('chess-clock')).toEqual({ games: 'Multi-agent and strategic.' });
		expect(reasons('scrabble')).toEqual({
			games:
				'Multi-agent and stochastic; the slide notes these environments can also be stochastic.',
			'stochastic-sequential-known': 'Stochastic and sequential; applies if it is also known.',
			'stochastic-sequential-unknown': 'Stochastic and sequential; applies if it is also unknown.'
		});
		expect(reasons('spam-filter')).toEqual({ 'stochastic-episodic': 'Stochastic and episodic.' });
		expect(reasons('taxi')['stochastic-sequential-known']).toBe(
			'Stochastic, sequential, and known.'
		);
		const scrabble = courseMethods(example('scrabble').profile);
		expect(scrabble.map((m) => m.missing)).toEqual([[], ['known'], ['known']]);
	});

	it('picks MDPs or reinforcement learning by Known once it is set', () => {
		const driving = example('autonomous-driving').profile;
		expect(ids({ ...driving, known: 'known' })).toEqual(['games', 'stochastic-sequential-known']);
		expect(ids({ ...driving, known: 'unknown' })).toEqual([
			'games',
			'stochastic-sequential-unknown'
		]);
		expect(ids({ ...driving, agents: 'single', known: 'unknown' })).toEqual([
			'stochastic-sequential-unknown'
		]);
	});

	it('gives nothing for an empty profile and "depends" rows for partial ones', () => {
		expect(courseMethods({})).toEqual([]);
		expect(statuses({ deterministic: 'stochastic' })).toEqual({
			games: 'depends',
			'stochastic-episodic': 'depends',
			'stochastic-sequential-known': 'depends',
			'stochastic-sequential-unknown': 'depends'
		});
		const games = matchCourseRow(row('games'), { deterministic: 'stochastic' });
		expect(games.missing).toEqual(['agents']);
		expect(games.reason).toBe('Stochastic; applies if it is also multi-agent.');
		const mdp = matchCourseRow(row('stochastic-sequential-known'), { deterministic: 'stochastic' });
		expect(mdp.missing).toEqual(['episodic', 'known']);
		expect(mdp.reason).toBe('Stochastic; applies if it is also sequential and known.');
		expect(statuses({ agents: 'multi' })).toEqual({ games: 'depends' });
		expect(matchCourseRow(row('games'), { agents: 'multi' }).reason).toBe(
			'Multi-agent; applies if it is also strategic or stochastic.'
		);
		expect(statuses({ episodic: 'sequential', known: 'unknown' })).toEqual({
			'stochastic-sequential-unknown': 'depends'
		});
	});

	it('does not count strategic as stochastic, or a single agent as a game', () => {
		expect(ids({ deterministic: 'strategic', agents: 'multi', episodic: 'sequential' })).toEqual([
			'games'
		]);
		expect(ids({ deterministic: 'strategic', agents: 'single' })).toEqual([]);
		expect(ids({ deterministic: 'deterministic', agents: 'multi' })).toEqual(['deterministic']);
	});

	it('ignores observability, dynamics, and discreteness', () => {
		const base: EnvironmentProfile = {
			deterministic: 'stochastic',
			episodic: 'episodic',
			agents: 'single'
		};
		const others: [Dimension, string[]][] = [
			['observable', ['fully', 'partially']],
			['static', ['static', 'dynamic', 'semidynamic']],
			['discrete', ['discrete', 'continuous']]
		];
		for (const [d, values] of others) {
			for (const v of values) {
				expect(ids({ ...base, [d]: v })).toEqual(['stochastic-episodic']);
			}
		}
	});

	it('explains rows that do not apply', () => {
		expect(matchCourseRow(row('deterministic'), example('scrabble').profile)).toEqual({
			row: row('deterministic'),
			status: 'no',
			missing: [],
			reason: 'Needs deterministic; this environment is stochastic.'
		});
		expect(matchCourseRow(row('games'), example('word-jumble').profile).reason).toBe(
			'Needs multi-agent; this environment is single agent.'
		);
		expect(matchCourseRow(row('stochastic-episodic'), {}).reason).toBe(
			'Needs stochastic and episodic (not set).'
		);
		expect(
			matchCourseRow(row('games'), { agents: 'multi', deterministic: 'deterministic' })
		).toMatchObject({
			status: 'no',
			reason: 'Needs strategic or stochastic; this environment is deterministic.'
		});
	});
});

describe('compareProfile', () => {
	it('lists differing and missing dimensions in slide order', () => {
		expect(compareProfile({}, SEARCH_SETTING)).toEqual({
			matches: false,
			differs: [],
			missing: ['observable', 'deterministic', 'discrete', 'known']
		});
		expect(compareProfile(example('autonomous-driving').profile, SEARCH_SETTING)).toEqual({
			matches: false,
			differs: ['observable', 'deterministic', 'discrete'],
			missing: ['known']
		});
		expect(compareProfile({ agents: 'multi' }, {})).toEqual({
			matches: true,
			differs: [],
			missing: []
		});
	});
});
