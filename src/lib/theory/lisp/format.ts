/**
 * FORMAT control strings: `~A` (as PRINC), `~S` (as PRIN1), `~D` (decimal
 * integer), `~%` (newline), `~&` (newline unless at the start of a line),
 * `~~` (a tilde), and `~` followed by a newline (skipped with the next line's
 * indentation). `~A`, `~S` and `~D` take a minimum width: `~5D` pads on the
 * left, `~10A` on the right. Extra arguments are ignored, as in Common Lisp.
 */
import { LispError } from './errors';
import { printValue } from './printer';
import type { LispValue } from './types';

export const FORMAT_DIRECTIVES = ['~A', '~S', '~D', '~%', '~&', '~~'] as const;

/**
 * The text `control` produces with `args`. `atLineStart` says whether the
 * output is at the start of a line (for `~&`).
 */
export function formatControl(
	control: string,
	args: readonly LispValue[],
	atLineStart: boolean
): string {
	let out = '';
	let next = 0;
	const lineStart = () => (out.length ? out.endsWith('\n') : atLineStart);
	const take = (directive: string): LispValue => {
		if (next >= args.length)
			throw new LispError(
				'arguments',
				`FORMAT: no more arguments for ${directive} in the control string "${control}".`
			);
		return args[next++];
	};
	for (let i = 0; i < control.length; i++) {
		const c = control[i];
		if (c !== '~') {
			out += c;
			continue;
		}
		let j = i + 1;
		while (j < control.length && /\d/.test(control[j])) j++;
		const width = j > i + 1 ? Number(control.slice(i + 1, j)) : 0;
		const d = control[j];
		if (d === undefined)
			throw new LispError('syntax', `FORMAT: the control string "${control}" ends with a ~.`);
		const directive = `~${control.slice(i + 1, j)}${d}`;
		switch (d.toUpperCase()) {
			case 'A':
				out += printValue(take(directive), { escape: false }).padEnd(width);
				break;
			case 'S':
				out += printValue(take(directive)).padEnd(width);
				break;
			case 'D': {
				const v = take(directive);
				out += printValue(v, { escape: false }).padStart(width);
				break;
			}
			case '%':
				out += '\n'.repeat(Math.max(1, width));
				break;
			case '&':
				if (!lineStart()) out += '\n';
				break;
			case '~':
				out += '~';
				break;
			case '\n':
				while (j + 1 < control.length && /[ \t]/.test(control[j + 1])) j++;
				break;
			default:
				throw new LispError(
					'unsupported',
					`FORMAT: the directive ${directive} is not supported (supported: ${FORMAT_DIRECTIVES.join(' ')}).`
				);
		}
		i = j;
	}
	return out;
}
