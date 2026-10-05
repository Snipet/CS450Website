import { describe, expect, it } from 'vitest';
import { printValue } from './printer';
import { atomValue, createSpanTable, readAll, readOne, tokenize } from './reader';
import { NIL, intern, type LispCons } from './types';

const read = (text: string) => readAll(text).forms.map((f) => printValue(f.datum));
const errors = (text: string) =>
	readAll(text).diagnostics.map((d) => [d.message, d.span!.start, d.span!.end]);

describe('tokenize', () => {
	it('splits parentheses, quotes, strings, atoms and comments', () => {
		expect(tokenize(`(a 'b #'c "d e") ; note\n#| block |# 12`).map((t) => t.kind)).toEqual([
			'lparen',
			'atom',
			'quote',
			'atom',
			'function',
			'atom',
			'string',
			'rparen',
			'comment',
			'comment',
			'atom'
		]);
	});

	it('resolves string escapes and nests block comments', () => {
		expect(tokenize('"a\\"b\\\\"')[0].text).toBe('a"b\\');
		const t = tokenize('#| a #| b |# c |# x');
		expect(t.map((k) => k.kind)).toEqual(['comment', 'atom']);
		expect(t[1].text).toBe('x');
	});

	it('flags unterminated strings and comments and unsupported syntax', () => {
		expect(tokenize('"abc')[0].error).toBe('Unterminated string: missing the closing ".');
		expect(tokenize('#| abc')[0].error).toBe('Unterminated #| comment: missing |#.');
		expect(tokenize('#\\a')[0].error).toBe(
			'Characters (#\\a) are not supported; use strings or symbols.'
		);
		expect(tokenize('`(a)')[0].error).toMatch(/Backquote/);
		expect(tokenize('|Foo|')[0].error).toBe('Escaped symbol names (|Foo|) are not supported.');
	});
});

describe('readAll', () => {
	it('reads atoms: symbols upper case, numbers, strings, keywords', () => {
		expect(read('foo Bar 42 -7 42. 1/2 4/2 3.14 .5 1e3 -2.5e-3 "Hi" :test nil ()')).toEqual([
			'FOO',
			'BAR',
			'42',
			'-7',
			'42',
			'1/2',
			'2',
			'3.14',
			'0.5',
			'1000.0',
			'-0.0025',
			'"Hi"',
			':TEST',
			'NIL',
			'NIL'
		]);
		expect(read('1+ - +5 a.b')).toEqual(['1+', '-', '5', 'A.B']);
	});

	it('interns symbols case-insensitively', () => {
		const [a, b] = readAll('foo FOO').forms;
		expect(a.datum).toBe(b.datum);
		expect(a.datum).toBe(intern('FOO'));
	});

	it('reads lists, dotted pairs, quote and #’', () => {
		expect(read("(a (b c) . d) (1 . (2 3)) 'x '(1 2) #'car #'(lambda (x) x) ''a")).toEqual([
			'(A (B C) . D)',
			'(1 2 3)',
			"'X",
			"'(1 2)",
			"#'CAR",
			"#'(LAMBDA (X) X)",
			"''A"
		]);
		const q = readAll("'x").forms[0].datum as LispCons;
		expect(q.car).toBe(intern('QUOTE'));
	});

	it('skips comments', () => {
		expect(read('; one\n(a ; two\n b) #| three |# c')).toEqual(['(A B)', 'C']);
	});

	it('records spans for forms and list elements', () => {
		const text = "(+ x\n  (car 'y))";
		const spans = createSpanTable();
		const [form] = readAll(text, { spans, source: 'repl' }).forms;
		expect(form.span).toEqual({ start: 0, end: text.length, source: 'repl' });
		const top = form.datum as LispCons;
		expect(spans.form.get(top)).toEqual(form.span);
		const second = top.cdr as LispCons;
		expect(text.slice(spans.car.get(second)!.start, spans.car.get(second)!.end)).toBe('x');
		const third = second.cdr as LispCons;
		const inner = spans.car.get(third)!;
		expect(text.slice(inner.start, inner.end)).toBe("(car 'y)");
		const quoted = ((third.car as LispCons).cdr as LispCons).car as LispCons;
		const qs = spans.form.get(quoted)!;
		expect(text.slice(qs.start, qs.end)).toBe("'y");
	});

	it('reports an unclosed parenthesis at the parenthesis', () => {
		expect(errors('(defun f (x)\n  (+ x 1)')).toEqual([
			['This ( is never closed: one ) is missing.', 0, 1]
		]);
		expect(errors('((a')).toEqual([
			['This ( is never closed: 2 ) are missing (the last one opened at line 1).', 0, 1]
		]);
	});

	it('reports an unmatched close parenthesis and keeps reading', () => {
		const r = readAll('(a)) b');
		expect(r.diagnostics.map((d) => [d.message, d.span!.start])).toEqual([
			['Unmatched ): there is no ( for it to close.', 3]
		]);
		expect(r.forms.map((f) => printValue(f.datum))).toEqual(['(A)', 'B']);
	});

	it('reports misplaced dots and dangling quotes', () => {
		expect(errors('(. a)')[0][0]).toBe('Nothing appears before . in the list.');
		expect(errors('(a .)')[0][0]).toBe('Nothing appears after . in the list.');
		expect(errors('(a . b c)')[0][0]).toBe('More than one object follows . in a list.');
		expect(errors('(a . b . c)')[0][0]).toBe('More than one dot in a list.');
		expect(errors("(a ')")[0][0]).toBe("Nothing follows ' before the ).");
		expect(errors("'")[0][0]).toBe("Nothing follows '.");
		expect(errors('.')[0][0]).toBe('A dot can only appear inside a list, as in (A . B).');
	});

	it('reports unsupported atoms', () => {
		expect(errors('cl:car')[0][0]).toBe(
			'Package prefixes (cl:car) are not supported; write the symbol without one.'
		);
		expect(errors('1/0')[0][0]).toBe('The ratio 1/0 has a zero denominator.');
		expect(errors('1e50')[0][0]).toBe('The number 1e50 is too large for a float.');
	});
});

describe('atomValue', () => {
	it('reads numbers and symbols', () => {
		expect(atomValue('nil')).toBe(NIL);
		expect(atomValue('12')).toEqual({ kind: 'integer', value: 12n });
		expect(atomValue(':')).toEqual({ error: ': is not a valid keyword.' });
	});
});

describe('readOne', () => {
	it('reads exactly one datum', () => {
		expect(printValue(readOne(' (a  b) ').datum!)).toBe('(A B)');
		expect(readOne('').diagnostics[0].message).toBe('Nothing to read.');
		expect(readOne('a b').diagnostics[0].message).toBe(
			'Expected one object but read 2; wrap several in a list.'
		);
		expect(readOne('(a').datum).toBeNull();
	});
});
