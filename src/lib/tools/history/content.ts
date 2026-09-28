/**
 * Content of the "AI history" page, taken from the Introduction to AI deck
 * (slides 19–27). Wording follows the slides; the page only lays it out.
 */
import type { Citation } from '$lib/lectures';

const cite = (slide: number | readonly [number, number]): Citation => ({ deck: 'intro', slide });

// ---------------------------------------------------------------------------
// Foundations (slide 19)
// ---------------------------------------------------------------------------

export const FOUNDATIONS_CITE = cite(19);

/** The fields AI draws on, in slide order. */
export const FOUNDATIONS: readonly string[] = [
	'Philosophy',
	'Mathematics',
	'Economics',
	'Neuroscience',
	'Psychology',
	'Computer engineering',
	'Control theory & cybernetics',
	'Linguistics'
];

// ---------------------------------------------------------------------------
// Timeline (slide 20)
// ---------------------------------------------------------------------------

export type EraId =
	| 'inception'
	| 'early-enthusiasm'
	| 'dose-of-reality'
	| 'expert-systems'
	| 'neural-networks'
	| 'probabilistic'
	| 'big-data'
	| 'deep-learning';

export interface Era {
	id: EraId;
	label: string;
	start: number;
	/** Last year, or null for "present". */
	end: number | null;
}

export const TIMELINE_CITE = cite(20);

/** "A Brief History of Artificial Intelligence", in slide order (by start year). */
export const ERAS: readonly Era[] = [
	{ id: 'inception', label: 'Inception', start: 1943, end: 1956 },
	{ id: 'early-enthusiasm', label: 'Early enthusiasm & expectations', start: 1952, end: 1969 },
	{ id: 'dose-of-reality', label: 'A dose of reality', start: 1966, end: 1973 },
	{ id: 'expert-systems', label: 'Expert systems', start: 1969, end: 1986 },
	{ id: 'neural-networks', label: 'Return of neural networks', start: 1986, end: null },
	{
		id: 'probabilistic',
		label: 'Probabilistic reasoning and machine learning',
		start: 1987,
		end: null
	},
	{ id: 'big-data', label: 'Big data', start: 2001, end: null },
	{ id: 'deep-learning', label: 'Deep learning', start: 2011, end: null }
];

/**
 * Where the chart draws "present". Pages are prerendered, so this is a fixed
 * year rather than today's date; bars that run to the present end here with
 * an arrow and are labelled "present", never with this year.
 */
export const TIMELINE_END = 2025;

/** First year on the chart's axis. */
export const TIMELINE_START = 1940;

export interface HistoryEvent {
	id: string;
	year: number;
	/** What happened, in the slides' words where they have them. */
	label: string;
	cite: Citation;
}

/** Dated items that appear elsewhere in the deck, in year order. */
export const EVENTS: readonly HistoryEvent[] = [
	{
		id: 'turing-test',
		year: 1950,
		label: 'Alan Turing proposes the Turing test',
		cite: cite(5)
	},
	{
		id: 'simon',
		year: 1957,
		label: 'Herbert Simon: “within 10 years a computer would be chess champion”',
		cite: cite(21)
	},
	{
		id: 'perceptron',
		year: 1958,
		label: 'The New York Times on the perceptron: “New Navy Device Learns by Doing”',
		cite: cite(22)
	},
	{
		id: 'lighthill',
		year: 1973,
		label:
			'The Lighthill Report evaluates the state of AI for the British Science Research Council',
		cite: cite(23)
	},
	{
		id: 'chinese-room',
		year: 1980,
		label: 'John Searle’s Chinese Room thought experiment',
		cite: cite(11)
	},
	{
		id: 'discussion',
		year: 2009,
		label: 'Discussion of AI in The New York Times takes off',
		cite: cite(25)
	},
	{
		id: 'winograd',
		year: 2013,
		label:
			'Levesque, “On Our Best Behavior” (IJCAI 2013): Winograd schemas as a better Turing test',
		cite: cite(7)
	},
	{
		id: 'winograd-challenge',
		year: 2016,
		label: 'Winograd schema challenge at IJCAI: best system 58%, humans 90%',
		cite: cite(10)
	}
];

// ---------------------------------------------------------------------------
// Predictions (slides 21–22)
// ---------------------------------------------------------------------------

export const SIMON_QUOTE = {
	lead: 'It is not my aim to surprise or shock you – but … there are now in the world machines that think, that learn and that create. Moreover, their ability to do these things is going to increase rapidly until – in a visible future – the range of problems they can handle will be coextensive with the range to which human mind has been applied.',
	/** Set in bold on the slide. */
	emphasis:
		'More precisely: within 10 years a computer would be chess champion, and an important new mathematical theorem would be proved by a computer.',
	author: 'Herbert Simon',
	year: 1957,
	predictedYears: 10,
	actualYears: 40,
	outcome: 'Prediction came true – but 40 years later instead of 10',
	cite: cite(21)
} as const;

/** The newspaper clipping on slide 22. */
export const PERCEPTRON_ARTICLE = {
	paper: 'The New York Times',
	year: 1958,
	headline: 'New Navy Device Learns by Doing',
	subhead: 'Psychologist Shows Embryo of Computer Designed to Read and Grow Wiser',
	excerpt:
		'The embryo—the Weather Bureau’s $2,000,000 “704” computer—learned to differentiate between right and left after fifty attempts in the Navy’s demonstration for newsmen.',
	cite: cite(22)
} as const;

// ---------------------------------------------------------------------------
// AI winters (slide 23)
// ---------------------------------------------------------------------------

export interface Winter {
	id: 'first' | 'second';
	label: string;
	/** The period as the slide gives it. */
	period: string;
	/**
	 * Years the chart shades for `period`, with soft edges. The slide names
	 * decades, not years, so the page never prints these numbers.
	 */
	band: readonly [number, number];
	points: readonly string[];
	cite: Citation;
}

export const WINTERS: readonly Winter[] = [
	{
		id: 'first',
		label: 'First AI winter',
		period: 'Late 1970s',
		band: [1975, 1980],
		points: [
			'Machine translation deemed a failure',
			'Fall of connectionism (perceptron limitations)',
			'Lighthill Report (published in 1973) was an evaluation of the current state of AI at that time written for the British Science Research Council'
		],
		cite: cite(23)
	},
	{
		id: 'second',
		label: 'Second AI winter',
		period: 'Late 1980s–early 1990s',
		band: [1987, 1993],
		points: [
			'At the heart of the commercialization of AI were expert systems. These systems were handcrafted by surveying experts and creating “if-then” rule sets accordingly.'
		],
		cite: cite(23)
	}
];

// ---------------------------------------------------------------------------
// Historical themes (slide 24)
// ---------------------------------------------------------------------------

export interface Theme {
	id: string;
	title: string;
	/** Plain text, or a quote with its source. */
	body: readonly (
		| { kind: 'text'; text: string }
		| { kind: 'term'; term: string; text: string }
		| { kind: 'quote'; text: string; source: string }
	)[];
}

export const THEMES_CITE = cite(24);

export const THEMES: readonly Theme[] = [
	{
		id: 'boom-bust',
		title: 'Boom and bust cycles',
		body: [
			{
				kind: 'text',
				text: 'Periods of (unjustified) optimism followed by periods of disillusionment and reduced funding'
			}
		]
	},
	{
		id: 'silver-bulletism',
		title: 'Silver bulletism',
		body: [
			{
				kind: 'quote',
				text: 'The tendency to believe in a silver bullet for AI, coupled with the belief that previous beliefs about silver bullets were hopelessly naïve',
				source: 'Levesque, 2013'
			}
		]
	},
	{
		id: 'image-problems',
		title: 'Image problems',
		body: [
			{
				kind: 'term',
				term: 'AI effect',
				text: 'As soon as a machine gets good at performing some task, the task is no longer considered to require much intelligence'
			},
			{ kind: 'text', text: 'AI as a threat?' }
		]
	}
];

// ---------------------------------------------------------------------------
// Current AI boom (slides 25–26)
// ---------------------------------------------------------------------------

export const AI_BOOM = {
	authors: 'E. Fast and E. Horowitz',
	title: 'Long-Term Trends in the Public Perception of AI',
	venue: 'AAAI 2017',
	/** Slide 25's chart. */
	overview: {
		/** The chart's title as printed. */
		title: 'Percentage of Articles in the NYT about AI',
		years: [1986, 2016] as const,
		/** Legend order on the slide. */
		series: ['pessimistic', 'optimistic', 'total'] as const,
		takeoff: 2009,
		cite: cite(25)
	},
	/** Slide 26's small charts, one per theme (A–P). */
	themes: [
		'Singularity (positive)',
		'Singularity (negative)',
		'Decision making',
		'Education',
		'Work (positive)',
		'Work (negative)',
		'Healthcare',
		'Military applications',
		'Cyborg (positive)',
		'Cyborg (negative)',
		'Entertainment',
		'Ethical concerns for AI',
		'Loss of control',
		'AI in fiction',
		'Transportation',
		'Lack of progress'
	] as const,
	themesCite: cite(26)
} as const;

// ---------------------------------------------------------------------------
// State of the art (slide 27)
// ---------------------------------------------------------------------------

export const STATE_OF_THE_ART_CITE = cite(27);

/** Application areas, in slide order. The approaches board starts with these. */
export const STATE_OF_THE_ART: readonly string[] = [
	'Autonomous vehicles',
	'Legged locomotion',
	'Autonomous planning and scheduling',
	'Machine translation',
	'Speech recognition',
	'Recommendations',
	'Game playing',
	'Image understanding',
	'Medicine',
	'Climate science'
];
