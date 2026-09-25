import { describe, expect, it } from 'vitest';
import { decks, type Citation } from '$lib/lectures';
import {
	APPROACHES,
	APPROACH_IDS,
	BOARD_CITE,
	COGNITIVE_MODELING,
	DIMENSIONS,
	GRID_CITE,
	INTELLIGENCE,
	LAWS_OF_THOUGHT,
	LAWS_OF_THOUGHT_CITE,
	RATIONAL_AGENT,
	STANDARDS,
	STRONG_WEAK,
	TOTAL_TURING_TEST,
	TURING_TEST,
	WINOGRAD,
	WINOGRAD_SCHEMAS,
	WINOGRAD_VS_TURING,
	approachAt,
	approachById,
	cellLabel,
	gradeWinograd,
	highlightSegments,
	isApproachId
} from './content';

function expectValidCite(c: Citation) {
	expect(c.deck).toBe('intro');
	const n = decks[c.deck].slides;
	const [a, b] = typeof c.slide === 'number' ? [c.slide, c.slide] : (c.slide ?? [1, 1]);
	expect(a).toBeGreaterThanOrEqual(1);
	expect(b).toBeGreaterThanOrEqual(a);
	expect(b).toBeLessThanOrEqual(n);
}

describe('approaches content', () => {
	it('cites slides that exist in the Introduction deck', () => {
		const cites: Citation[] = [
			INTELLIGENCE.cite,
			GRID_CITE,
			BOARD_CITE,
			TURING_TEST.cite,
			TOTAL_TURING_TEST.cite,
			WINOGRAD.cite,
			WINOGRAD_VS_TURING.cite,
			STRONG_WEAK.cite,
			COGNITIVE_MODELING.cite,
			LAWS_OF_THOUGHT_CITE,
			RATIONAL_AGENT.cite,
			...APPROACHES.flatMap((a) => a.cites),
			...WINOGRAD_SCHEMAS.map((s) => s.cite)
		];
		for (const c of cites) expectValidCite(c);
	});

	it('fills the 2 × 2 table of slide 3 with four distinct approaches', () => {
		expect(new Set(APPROACH_IDS).size).toBe(4);
		expect(new Set(APPROACHES.map((a) => a.tone)).size).toBe(4);
		expect(DIMENSIONS.map((d) => d.label)).toEqual(['Behavior', 'Thought']);
		expect(STANDARDS.map((s) => s.label)).toEqual(['Human', 'Rational (ideal)']);
		expect(approachAt('behavior', 'human').title).toBe('Acting humanly');
		expect(approachAt('behavior', 'rational').title).toBe('Acting rationally');
		expect(approachAt('thought', 'human').title).toBe('Thinking humanly');
		expect(approachAt('thought', 'rational').title).toBe('Thinking rationally');
	});

	it('looks approaches up by id and labels their cell', () => {
		expect(approachById('thinking-rationally').approach).toBe('The “laws of thought” approach');
		expect(cellLabel(approachById('acting-rationally'))).toBe('Behavior · Rational (ideal)');
		expect(cellLabel(approachById('thinking-humanly'))).toBe('Thought · Human');
		expect(() => approachById('nope' as never)).toThrow();
		expect(() => approachAt('nope' as never, 'human')).toThrow();
	});

	it('recognizes approach ids', () => {
		for (const id of APPROACH_IDS) expect(isApproachId(id)).toBe(true);
		expect(isApproachId('acting')).toBe(false);
		expect(isApproachId(3)).toBe(false);
		expect(isApproachId(null)).toBe(false);
	});

	it('keeps the slide lists', () => {
		expect(INTELLIGENCE.usual).toHaveLength(7);
		expect(TURING_TEST.year).toBe(1950);
		expect(TURING_TEST.written).toEqual([
			'Natural language processing',
			'Knowledge representation',
			'Automated reasoning',
			'Machine learning'
		]);
		expect(TOTAL_TURING_TEST.robot).toHaveLength(3);
		expect(COGNITIVE_MODELING.methods).toEqual([
			'Introspection',
			'Psychological experiments',
			'Brain imaging'
		]);
		expect(LAWS_OF_THOUGHT.map((s) => s.title)).toEqual([
			'Aristotle',
			'Logic',
			'Probability',
			'Systems'
		]);
		expect(RATIONAL_AGENT.expected).toHaveLength(5);
		expect(WINOGRAD_VS_TURING.advantages).toHaveLength(5);
		expect(STRONG_WEAK.chineseRoom.year).toBe(1980);
	});

	it('reproduces the Winograd schema challenge numbers (slide 10)', () => {
		const c = WINOGRAD_VS_TURING.challenge;
		expect([c.entries, c.questions, c.bestPercent, c.humanPercent]).toEqual([6, 60, 58, 90]);
	});
});

describe('Winograd schemas (slides 7–9)', () => {
	it('have the slide answers', () => {
		const answers = WINOGRAD_SCHEMAS.map((s) => s.options[s.answer]);
		expect(answers).toEqual(['The trophy', 'The bag of flour', 'The large ball']);
		expect(WINOGRAD_SCHEMAS.map((s) => s.cite.slide)).toEqual([7, 8, 9]);
		expect(new Set(WINOGRAD_SCHEMAS.map((s) => s.id)).size).toBe(WINOGRAD_SCHEMAS.length);
	});

	it('highlight words that appear in the sentence', () => {
		for (const s of WINOGRAD_SCHEMAS) {
			if (!s.highlight) continue;
			expect(highlightSegments(s.sentence, s.highlight).some((x) => x.mark)).toBe(true);
		}
	});

	it('grades a choice', () => {
		const [trophy, potatoes] = WINOGRAD_SCHEMAS;
		expect(gradeWinograd(trophy, null)).toBeNull();
		expect(gradeWinograd(trophy, 0)).toBe('correct');
		expect(gradeWinograd(trophy, 1)).toBe('incorrect');
		expect(gradeWinograd(potatoes, 0)).toBe('incorrect');
		expect(gradeWinograd(potatoes, 1)).toBe('correct');
	});
});

describe('highlightSegments', () => {
	it('marks whole-word matches, any case', () => {
		expect(highlightSegments('What was made of steel?', 'steel')).toEqual([
			{ text: 'What was made of ', mark: false },
			{ text: 'steel', mark: true },
			{ text: '?', mark: false }
		]);
		expect(highlightSegments('Steel and steely steel', 'steel')).toEqual([
			{ text: 'Steel', mark: true },
			{ text: ' and steely ', mark: false },
			{ text: 'steel', mark: true }
		]);
	});

	it('returns one unmarked run without a word or a match', () => {
		expect(highlightSegments('abc')).toEqual([{ text: 'abc', mark: false }]);
		expect(highlightSegments('abc', 'x')).toEqual([{ text: 'abc', mark: false }]);
		expect(highlightSegments('', 'x')).toEqual([{ text: '', mark: false }]);
	});

	it('treats the word literally', () => {
		expect(highlightSegments('a.b axb', 'a.b')).toEqual([
			{ text: 'a.b', mark: true },
			{ text: ' axb', mark: false }
		]);
	});
});
