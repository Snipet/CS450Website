/**
 * Content of the "Approaches to AI" page, taken from the Introduction to AI
 * deck (slides 2–18). Wording follows the slides; the page only lays it out.
 */
import type { Citation } from '$lib/lectures';

const cite = (slide: number | readonly [number, number]): Citation => ({ deck: 'intro', slide });

// ---------------------------------------------------------------------------
// What is intelligence? (slide 2)
// ---------------------------------------------------------------------------

export const INTELLIGENCE = {
	prompt: 'Let’s brainstorm characteristics and components of intelligence.',
	usual: [
		'Decision making',
		'Learning',
		'Recall/memory',
		'Logic or rationality',
		'Communication/language',
		'Humor',
		'Creativity'
	],
	note: 'This starting point skews our definition of artificial intelligence…',
	cite: cite(2)
} as const;

// ---------------------------------------------------------------------------
// Dimensions of AI definitions (slide 3)
// ---------------------------------------------------------------------------

export type ApproachId =
	'acting-humanly' | 'acting-rationally' | 'thinking-humanly' | 'thinking-rationally';

/** Rows of the table: what is measured. */
export type Dimension = 'behavior' | 'thought';
/** Columns of the table: measured against what. */
export type Standard = 'human' | 'rational';

export const DIMENSIONS: readonly { id: Dimension; label: string }[] = [
	{ id: 'behavior', label: 'Behavior' },
	{ id: 'thought', label: 'Thought' }
];

export const STANDARDS: readonly { id: Standard; label: string }[] = [
	{ id: 'human', label: 'Human' },
	{ id: 'rational', label: 'Rational (ideal)' }
];

export const GRID_CITE = cite(3);

export interface Approach {
	id: ApproachId;
	title: string;
	/** The slide's name for the approach. */
	approach: string;
	dimension: Dimension;
	standard: Standard;
	/** One line under the title in the table. */
	gist: string;
	/** Categorical palette index (`--tok-N`), fixed per approach. */
	tone: number;
	cites: readonly Citation[];
}

/** The four cells, row by row as on the slide. */
export const APPROACHES: readonly Approach[] = [
	{
		id: 'acting-humanly',
		title: 'Acting humanly',
		approach: 'The Turing test approach',
		dimension: 'behavior',
		standard: 'human',
		gist: 'Behave so that an interrogator cannot tell machine from human',
		tone: 0,
		cites: [cite([5, 11])]
	},
	{
		id: 'acting-rationally',
		title: 'Acting rationally',
		approach: 'The rational agent approach',
		dimension: 'behavior',
		standard: 'rational',
		gist: 'Act to achieve the best (expected) outcome',
		tone: 1,
		cites: [cite(17)]
	},
	{
		id: 'thinking-humanly',
		title: 'Thinking humanly',
		approach: 'The cognitive modeling approach',
		dimension: 'thought',
		standard: 'human',
		gist: 'Model how humans think',
		tone: 2,
		cites: [cite(13)]
	},
	{
		id: 'thinking-rationally',
		title: 'Thinking rationally',
		approach: 'The “laws of thought” approach',
		dimension: 'thought',
		standard: 'rational',
		gist: 'Codify “right thinking” with logic',
		tone: 3,
		cites: [cite(15)]
	}
];

export const APPROACH_IDS: readonly ApproachId[] = APPROACHES.map((a) => a.id);

export function approachById(id: ApproachId): Approach {
	const a = APPROACHES.find((x) => x.id === id);
	if (!a) throw new Error(`Unknown approach: ${id}`);
	return a;
}

/** The approach in a cell of the table. */
export function approachAt(dimension: Dimension, standard: Standard): Approach {
	const a = APPROACHES.find((x) => x.dimension === dimension && x.standard === standard);
	if (!a) throw new Error(`No approach at ${dimension}/${standard}`);
	return a;
}

export const isApproachId = (v: unknown): v is ApproachId =>
	typeof v === 'string' && (APPROACH_IDS as readonly string[]).includes(v);

/** "Behavior · Human" */
export function cellLabel(a: Approach): string {
	const d = DIMENSIONS.find((x) => x.id === a.dimension)!;
	const s = STANDARDS.find((x) => x.id === a.standard)!;
	return `${d.label} · ${s.label}`;
}

// ---------------------------------------------------------------------------
// Acting humanly (slides 5–11)
// ---------------------------------------------------------------------------

export const TURING_TEST = {
	by: 'Alan Turing',
	year: 1950,
	pass: 'A machine “passes” the test if a human interrogator cannot tell machine from human.',
	/** What the original test with written questions and answers would require (at least). */
	written: [
		'Natural language processing',
		'Knowledge representation',
		'Automated reasoning',
		'Machine learning'
	],
	cite: cite(5)
} as const;

export const TOTAL_TURING_TEST = {
	adds: 'Adds interaction with people and objects.',
	/** What the robot would need on top of the written test, as the slide lists it. */
	robot: ['Computer vision and speech recognition/generation', 'Robotic manipulations'],
	cite: cite(6)
} as const;

export const WINOGRAD = {
	paper: 'On Our Best Behavior',
	author: 'Levesque',
	venue: 'IJCAI 2013',
	definition:
		'Multiple choice questions that can be easily answered by people but cannot be answered by computers using “cheap tricks”.',
	cite: cite(7)
} as const;

export interface WinogradSchema {
	id: string;
	sentence: string;
	/** A word highlighted on the slide (in the sentence and the question). */
	highlight?: string;
	question: string;
	options: readonly [string, string];
	/** Index of the correct option. */
	answer: 0 | 1;
	cite: Citation;
}

export const WINOGRAD_SCHEMAS: readonly WinogradSchema[] = [
	{
		id: 'trophy',
		sentence: 'The trophy would not fit in the brown suitcase because it was so large.',
		question: 'What was so large?',
		options: ['The trophy', 'The brown suitcase'],
		answer: 0,
		cite: cite(7)
	},
	{
		id: 'potatoes',
		sentence:
			'The sack of potatoes had been placed below the bag of flour, so it had to be moved first.',
		highlight: 'below',
		question: 'What had to be moved first?',
		options: ['The sack of potatoes', 'The bag of flour'],
		answer: 1,
		cite: cite(8)
	},
	{
		id: 'ball',
		sentence: 'The large ball crashed right through the table because it was made of steel.',
		highlight: 'steel',
		question: 'What was made of steel?',
		options: ['The large ball', 'The table'],
		answer: 0,
		cite: cite(9)
	}
];

export type WinogradResult = 'correct' | 'incorrect';

/** Grades a choice (an option index), or null when nothing is chosen. */
export function gradeWinograd(
	schema: WinogradSchema,
	choice: number | null
): WinogradResult | null {
	if (choice === null) return null;
	return choice === schema.answer ? 'correct' : 'incorrect';
}

export interface TextSegment {
	text: string;
	mark: boolean;
}

/**
 * Splits `text` into runs, marking whole-word occurrences of `word` (any
 * case). Without a word, the whole text is one unmarked run.
 */
export function highlightSegments(text: string, word?: string): TextSegment[] {
	if (!word) return [{ text, mark: false }];
	const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`\\b${escaped}\\b`, 'gi');
	const out: TextSegment[] = [];
	let last = 0;
	for (const m of text.matchAll(re)) {
		const at = m.index ?? 0;
		if (at > last) out.push({ text: text.slice(last, at), mark: false });
		out.push({ text: m[0], mark: true });
		last = at + m[0].length;
	}
	if (last < text.length) out.push({ text: text.slice(last), mark: false });
	return out.length ? out : [{ text, mark: false }];
}

export const WINOGRAD_VS_TURING = {
	advantages: [
		'Test can be administered and graded by machine',
		'Does not depend on human subjectivity',
		'Does not require ability to generate English sentences',
		'Questions cannot be evaded using verbal dodges',
		'Questions can be made “Google-proof” (at least for now…)'
	],
	challenge: {
		held: 'Held at the IJCAI conference in July 2016',
		entries: 6,
		questions: 60,
		bestPercent: 58,
		humanPercent: 90
	},
	cite: cite(10)
} as const;

export const STRONG_WEAK = {
	weak: 'Computer is limited to being a tool for studying intelligence and developing useful technology.',
	strong:
		'Computer could (in principle) be programmed to actually BE a mind, to be intelligent, to understand, perceive, have beliefs, and exhibit other cognitive states normally ascribed to human beings.',
	chineseRoom: {
		by: 'John Searle',
		year: 1980,
		/**
		 * Widely known outline of the thought experiment. The slide names it
		 * only, so the page marks this text as not from the slide.
		 */
		outline:
			'A person who does not understand Chinese follows written rules to answer questions written in Chinese; the answers can look fluent with no understanding of Chinese behind them.'
	},
	cite: cite(11)
} as const;

// ---------------------------------------------------------------------------
// Thinking humanly (slide 13)
// ---------------------------------------------------------------------------

export const COGNITIVE_MODELING = {
	need: 'To take this approach, we need to know how humans think:',
	methods: ['Introspection', 'Psychological experiments', 'Brain imaging'],
	science: {
		name: 'Cognitive science',
		from: ['Computer models from AI', 'Experimental techniques from psychology']
	},
	cite: cite(13)
} as const;

// ---------------------------------------------------------------------------
// Thinking rationally (slide 15)
// ---------------------------------------------------------------------------

/** Slide 15's points, in slide order. */
export const LAWS_OF_THOUGHT: readonly { title: string; text: string }[] = [
	{
		title: 'Aristotle',
		text: 'One of the first to attempt to codify “right thinking”.'
	},
	{
		title: 'Logic',
		text: 'This gave rise to the field of logic. Logic conveniently assumes certainty.'
	},
	{
		title: 'Probability',
		text: 'Can fill the gap when we don’t have certainty, to allow rigorous reasoning with uncertain information.'
	},
	{
		title: 'Systems',
		text: 'Theorem proving systems, logical programming languages.'
	}
];

export const LAWS_OF_THOUGHT_CITE = cite(15);

// ---------------------------------------------------------------------------
// Acting rationally (slide 17)
// ---------------------------------------------------------------------------

export const RATIONAL_AGENT = {
	expected: [
		'Operate autonomously',
		'Perceive their environment',
		'Persist over a prolonged time period',
		'Adapt to change',
		'Create and pursue goals'
	],
	definition:
		'A rational agent is one that acts to achieve the best outcome (or the best expected outcome).',
	prevailing: 'This is the prevailing approach to AI.',
	cite: cite(17)
} as const;

// ---------------------------------------------------------------------------
// The problem dictates the approach (slide 18)
// ---------------------------------------------------------------------------

export const BOARD_CITE = cite(18);
