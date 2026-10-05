import { describe, expect, it } from 'vitest';
import { highlightLisp } from './highlight';

const classes = (text: string) =>
	highlightLisp(text).map((t) => `${text.slice(t.from, t.to)}:${t.className.replace('hl-', '')}`);

describe('highlightLisp', () => {
	it('colors special forms, definitions, built-ins, literals, numbers, strings, comments', () => {
		expect(
			classes(`(defun f (x &optional y) ; c\n  (if (null x) nil (car '(1 "s" :k t))))`)
		).toEqual([
			'(:paren',
			'defun:keyword',
			'f:name',
			'(:paren',
			'&optional:keyword',
			'):paren',
			'; c:comment',
			'(:paren',
			'if:keyword',
			'(:paren',
			'null:special',
			'):paren',
			'nil:literal',
			'(:paren',
			'car:special',
			"':operator",
			'(:paren',
			'1:number',
			'"s":string',
			':k:literal',
			't:literal',
			'):paren',
			'):paren',
			'):paren',
			'):paren'
		]);
	});

	it('colors #’ and the function after it, and not symbols in other positions', () => {
		expect(classes("(mapcar #'car x)")).toEqual([
			'(:paren',
			'mapcar:special',
			"#':operator",
			'car:special',
			'):paren'
		]);
		expect(classes('(list car if)')).toEqual(['(:paren', 'list:special', '):paren']);
	});
});
