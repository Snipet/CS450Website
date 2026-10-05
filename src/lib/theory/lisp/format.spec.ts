import { describe, expect, it } from 'vitest';
import { formatControl } from './format';
import { int } from './numbers';
import { intern, list, lispString } from './types';

describe('formatControl', () => {
	it('handles ~A ~S ~D ~% ~& ~~', () => {
		expect(formatControl('~a/~s/~d', [lispString('x'), lispString('x'), int(5)], true)).toBe(
			'x/"x"/5'
		);
		expect(formatControl('a~%b~~', [], true)).toBe('a\nb~');
		expect(formatControl('~&x~&~&y', [], false)).toBe('\nx\ny');
		expect(formatControl('~&x', [], true)).toBe('x');
		expect(formatControl('~A', [list([intern('A'), lispString('b')])], true)).toBe('(A b)');
	});

	it('takes minimum widths and skips a tilde-newline', () => {
		expect(formatControl('[~5d][~4a]', [int(42), intern('AB')], true)).toBe('[   42][AB  ]');
		expect(formatControl('a~\n    b', [], true)).toBe('ab');
		expect(formatControl('~2%', [], true)).toBe('\n\n');
	});

	it('ignores extra arguments and rejects missing ones and unknown directives', () => {
		expect(formatControl('x', [int(1)], true)).toBe('x');
		expect(() => formatControl('~a', [], true)).toThrow(/no more arguments/);
		expect(() => formatControl('~q', [], true)).toThrow(/~q is not supported/);
		expect(() => formatControl('~', [], true)).toThrow(/ends with a ~/);
	});
});
