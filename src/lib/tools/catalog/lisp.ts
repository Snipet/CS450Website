import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'lisp',
	title: 'Lisp evaluator',
	summary:
		'Evaluates a subset of Common Lisp in the browser, traces calls to user-defined functions the way TRACE prints them, and checks exercises: predicting what expressions return and writing basic functions against test cases.',
	topic: 'lisp',
	order: 10,
	cites: [],
	keywords: [
		'Lisp',
		'Common Lisp',
		'REPL',
		'evaluator',
		'interpreter',
		'defun',
		'car',
		'cdr',
		'cons',
		'list',
		'append',
		'cond',
		'let',
		'let*',
		'lambda',
		'mapcar',
		'recursion',
		'trace',
		'closures',
		'exercises'
	]
};
