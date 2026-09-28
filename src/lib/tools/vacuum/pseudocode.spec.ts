import { describe, expect, it } from 'vitest';
import { PROGRAM_IDS, agentProgram } from '$lib/theory/agents/vacuum';
import { PROGRAM_CODE, firedLine, tokenizeCode } from './pseudocode';

describe('program pseudocode', () => {
	it('writes the reflex program exactly as slide 3', () => {
		expect(PROGRAM_CODE.reflex.map((l) => '  '.repeat(l.indent) + l.text).join('\n')).toBe(
			[
				'function Vacuum-Agent([location, status]) returns an action',
				'  if status = Dirty then return Suck',
				'  else if location = A then return Right',
				'  else if location = B then return Left'
			].join('\n')
		);
	});

	it('has a returning line for every rule of every program', () => {
		for (const id of PROGRAM_IDS) {
			const program = agentProgram(id);
			program.rules.forEach((_, rule) => expect(firedLine(id, rule)).toBeGreaterThan(0));
		}
		// The rule-based programs return from their own rule lines.
		expect(PROGRAM_CODE.reflex[firedLine('reflex', 1)].text).toBe(agentProgram('reflex').rules[1]);
		for (let r = 0; r < 4; r++) {
			expect(PROGRAM_CODE['reflex-state'][firedLine('reflex-state', r)].text).toBe(
				agentProgram('reflex-state').rules[r]
			);
		}
		expect(firedLine('table', 3)).toBe(2);
		expect(firedLine('random', 2)).toBe(1);
		expect(firedLine('reflex', 7)).toBe(-1);
	});
});

describe('tokenizeCode', () => {
	it('colors keywords, the function name, variables, and actions', () => {
		expect(tokenizeCode('function Vacuum-Agent([location, status]) returns an action')).toEqual([
			{ text: 'function', kind: 'keyword' },
			{ text: ' ', kind: 'text' },
			{ text: 'Vacuum-Agent', kind: 'function' },
			{ text: '([', kind: 'text' },
			{ text: 'location', kind: 'variable' },
			{ text: ', ', kind: 'text' },
			{ text: 'status', kind: 'variable' },
			{ text: ']) ', kind: 'text' },
			{ text: 'returns', kind: 'keyword' },
			{ text: ' an ', kind: 'text' },
			{ text: 'action', kind: 'action' }
		]);
		expect(tokenizeCode('else if location = A then return Right').map((t) => t.kind)).toEqual([
			'keyword',
			'text',
			'keyword',
			'text',
			'variable',
			'text',
			'variable',
			'text',
			'keyword',
			'text',
			'keyword',
			'text',
			'action'
		]);
	});

	it('keeps the text intact', () => {
		for (const id of PROGRAM_IDS) {
			for (const line of PROGRAM_CODE[id]) {
				expect(
					tokenizeCode(line.text)
						.map((t) => t.text)
						.join('')
				).toBe(line.text);
			}
		}
	});
});
