/**
 * The game tree text format: parse, format, highlight, and edit the header.
 *
 * ```
 * # The two-ply game of Games and Adversarial Search, slides 9–19
 * [[3 12 8] [2 4 6] [14 5 2]]
 *
 * min: [[3 12 8] [2 4 6]]          # MIN to move at the root (default max:)
 * [A1: [3 12] A2: [2 4]]           # action labels (default A1, A2, …; A11, A12, … below)
 * {5}[{6}[3 12 8] {2}[2 4 6]]      # evaluation values of internal nodes, for depth cutoffs
 * order: 1 3 2                     # multi-player: the player to move at each level, cycling
 * [[(1,2,6) (4,3,2)] [(6,1,2) (7,4,1)]]   # tuples: one utility per player
 * ```
 *
 * - A node is a number or a tuple (a terminal node and its utility), or a
 *   list of child nodes in brackets, left to right. Children may be
 *   separated by spaces or commas.
 * - A child may start with a label and a colon (`left: 3`). Labels are words
 *   (letters, digits, `_`, `'`, `.`, `-`, starting with a letter or `_`) or
 *   double-quoted strings. Unlabeled children get the default labels.
 * - `{v}` before a list gives that internal node an evaluation value; in a
 *   multi-player tree it is a tuple, `{1,2,3}`.
 * - Before the tree: `max:` or `min:` (the player at the root of a
 *   two-player tree) and `order:` (multi-player trees). Words are
 *   case-insensitive. `#` starts a comment.
 * - Numbers: integers or decimals, optionally signed, with an optional
 *   exponent (`-3`, `2.5`, `1e3`). Utilities are finite.
 * - Limits: depth ≤ MAX_DEPTH (10) and ≤ MAX_NODES (2,000) nodes.
 *
 * `formatGameTree` writes the canonical text (labels only where they differ
 * from the defaults), and `parseGameTree(formatGameTree(t)).tree` equals `t`.
 */
import type { HighlightToken } from '$lib/components/ui/types';
import type { Diagnostic, Span } from '../diagnostics';
import {
	MAX_DEPTH,
	MAX_NODES,
	buildGameTree,
	defaultActions,
	type GameTree,
	type NodeSpec,
	type Player,
	type Utility
} from './tree';

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

type TokKind =
	| 'lbrack'
	| 'rbrack'
	| 'lparen'
	| 'rparen'
	| 'lbrace'
	| 'rbrace'
	| 'comma'
	| 'colon'
	| 'number'
	| 'word'
	| 'string'
	| 'comment'
	| 'bad';

interface Tok {
	kind: TokKind;
	start: number;
	end: number;
	text: string;
	/** Numbers: the value. */
	num: number;
	/** Words and strings: the name (escapes resolved). */
	name: string;
	/** Strings: false when the closing quote is missing. */
	closed: boolean;
}

const NUMBER = /[+\-−]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-−]?\d+)?/y;
const WORD = /[\p{L}_][\p{L}\p{N}\p{M}_'.-]*/uy;
const PLAIN_LABEL = /^[\p{L}_][\p{L}\p{N}\p{M}_'.-]*$/u;
const PUNCT: Record<string, TokKind> = {
	'[': 'lbrack',
	']': 'rbrack',
	'(': 'lparen',
	')': 'rparen',
	'{': 'lbrace',
	'}': 'rbrace',
	',': 'comma',
	':': 'colon'
};

function lex(text: string): Tok[] {
	const toks: Tok[] = [];
	const push = (kind: TokKind, start: number, end: number, extra: Partial<Tok> = {}) =>
		toks.push({
			kind,
			start,
			end,
			text: text.slice(start, end),
			num: NaN,
			name: '',
			closed: true,
			...extra
		});
	let i = 0;
	while (i < text.length) {
		const c = text[i];
		if (/\s/.test(c)) {
			i++;
			continue;
		}
		if (c === '#') {
			let j = text.indexOf('\n', i);
			if (j < 0) j = text.length;
			push('comment', i, j);
			i = j;
			continue;
		}
		const kind = PUNCT[c];
		if (kind) {
			push(kind, i, i + 1);
			i++;
			continue;
		}
		NUMBER.lastIndex = i;
		const num = NUMBER.exec(text);
		if (num) {
			const src = num[0].replace(/−/g, '-').replace(/^\+/, '');
			const value = Number(src);
			push('number', i, i + num[0].length, { num: value === 0 ? 0 : value });
			i += num[0].length;
			continue;
		}
		WORD.lastIndex = i;
		const word = WORD.exec(text);
		if (word) {
			push('word', i, i + word[0].length, { name: word[0] });
			i += word[0].length;
			continue;
		}
		if (c === '"') {
			let j = i + 1;
			let name = '';
			let closed = false;
			while (j < text.length && text[j] !== '\n') {
				if (text[j] === '\\' && (text[j + 1] === '"' || text[j + 1] === '\\')) {
					name += text[j + 1];
					j += 2;
				} else if (text[j] === '"') {
					closed = true;
					j++;
					break;
				} else name += text[j++];
			}
			push('string', i, j, { name, closed });
			i = j;
			continue;
		}
		// One code point, so a surrogate pair is reported as one character.
		const cp = String.fromCodePoint(text.codePointAt(i)!);
		push('bad', i, i + cp.length);
		i += cp.length;
	}
	return toks;
}

const spanOf = (t: { start: number; end: number }): Span => ({
	start: t.start,
	end: t.end,
	source: null
});

const HEADER_WORDS = new Set(['max', 'min', 'order']);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface ParsedHeader {
	root: { player: Player; span: Span } | null;
	order: { players: { value: number; span: Span }[]; span: Span } | null;
}

interface Frame {
	spec: NodeSpec & { children: NodeSpec[] };
	open: Tok;
	depth: number;
}

class Parser {
	private toks: Tok[];
	private i = 0;
	readonly diagnostics: Diagnostic[] = [];
	private nodes = 0;
	private stopped = false;
	/** First terminal node: its kind and tuple length decide the tree's kind. */
	private firstLeaf: { tuple: number; span: Span } | null = null;
	private evals: { value: Utility; span: Span }[] = [];

	constructor(text: string) {
		this.toks = lex(text).filter((t) => t.kind !== 'comment');
	}

	private peek(k = 0): Tok | undefined {
		return this.toks[this.i + k];
	}

	private error(message: string, where?: Span) {
		this.diagnostics.push({ severity: 'error', message, ...(where ? { span: where } : {}) });
	}

	private warn(message: string, where: Span) {
		this.diagnostics.push({ severity: 'warning', message, span: where });
	}

	private describe(t: Tok): string {
		if (t.kind === 'string') return `"${t.name}"`;
		return `"${t.text}"`;
	}

	parse(): GameTree | null {
		const bad = this.toks.find((t) => t.kind === 'bad');
		if (bad) {
			this.error(`Unexpected character "${bad.text}".`, spanOf(bad));
			return null;
		}
		const open = this.toks.find((t) => t.kind === 'string' && !t.closed);
		if (open) {
			this.error('This quoted label has no closing quote (").', spanOf(open));
			return null;
		}
		if (!this.toks.length) {
			this.error('The tree is empty. Write nested brackets, like [[3 12 8] [2 4 6] [14 5 2]].');
			return null;
		}
		const header = this.header();
		if (this.stopped) return null;
		if (!this.peek()) {
			this.error(
				'The tree is missing after the header. Write nested brackets, like [[3 12] [2 4]].'
			);
			return null;
		}
		const root = this.tree();
		if (!root || this.stopped) return null;
		const extra = this.peek();
		if (extra) {
			this.error(
				`Unexpected ${this.describe(extra)} after the end of the tree. Put every node inside the outer brackets.`,
				spanOf(extra)
			);
			return null;
		}
		return this.finish(root, header);
	}

	/** `max:`, `min:` and `order: 1 3 2` before the tree. */
	private header(): ParsedHeader {
		const out: ParsedHeader = { root: null, order: null };
		for (;;) {
			const t = this.peek();
			const colon = this.peek(1);
			if (!t || t.kind !== 'word' || colon?.kind !== 'colon') return out;
			const word = t.name.toLowerCase();
			if (!HEADER_WORDS.has(word)) {
				const next = this.peek(2);
				const hint =
					next && (next.kind === 'lbrack' || next.kind === 'number' || next.kind === 'lparen')
						? ' The root has no action label.'
						: '';
				this.error(
					`Unknown directive "${t.name}:". Before the tree: max:, min:, or order:.${hint}`,
					spanOf(t)
				);
				this.stopped = true;
				return out;
			}
			this.i += 2;
			if (word === 'order') {
				const players: { value: number; span: Span }[] = [];
				let end = colon.end;
				for (;;) {
					const n = this.peek();
					if (n?.kind === 'number') {
						players.push({ value: n.num, span: spanOf(n) });
						end = n.end;
						this.i++;
					} else if (n?.kind === 'comma' && players.length) {
						this.i++;
					} else break;
				}
				const span: Span = { start: t.start, end, source: null };
				if (!players.length) {
					this.error('order: needs player numbers, like order: 1 3 2.', span);
					this.stopped = true;
					return out;
				}
				if (out.order) this.warn('order: is given twice; the last one is used.', span);
				out.order = { players, span };
			} else {
				const span: Span = { start: t.start, end: colon.end, source: null };
				const player: Player = word === 'min' ? 'min' : 'max';
				if (out.root && out.root.player !== player) {
					this.error('The root player is given twice: use either max: or min:.', span);
					this.stopped = true;
					return out;
				}
				out.root = { player, span };
			}
		}
	}

	/** A number list inside `(…)` or `{…}`; the opening token is current. */
	private numbers(
		close: 'rparen' | 'rbrace',
		what: string
	): { values: number[]; end: number } | null {
		const open = this.peek()!;
		this.i++;
		const values: number[] = [];
		let parens = 0;
		for (;;) {
			const t = this.peek();
			if (!t) {
				this.error(
					`Missing "${close === 'rparen' ? ')' : '}'}" to close this ${what}.`,
					spanOf(open)
				);
				return null;
			}
			if (t.kind === close && parens === 0) {
				this.i++;
				return { values, end: t.end };
			}
			if (close === 'rbrace' && t.kind === 'lparen' && parens === 0 && !values.length) {
				parens++;
				this.i++;
			} else if (close === 'rbrace' && t.kind === 'rparen' && parens === 1) {
				parens--;
				this.i++;
			} else if (t.kind === 'number') {
				if (!Number.isFinite(t.num)) {
					this.error(`${t.text} is too large. Values must be finite numbers.`, spanOf(t));
					return null;
				}
				values.push(t.num);
				this.i++;
			} else if (t.kind === 'comma' && values.length) {
				this.i++;
			} else {
				this.error(`Expected a number in this ${what}, found ${this.describe(t)}.`, spanOf(t));
				return null;
			}
		}
	}

	/** Reads one node's optional label and evaluation value, then the node itself. */
	private item(frames: Frame[]): { spec: NodeSpec; frame?: Frame } | null {
		let t = this.peek()!;
		const spec: NodeSpec = {};
		const depth = frames.length;
		if ((t.kind === 'word' || t.kind === 'string') && this.peek(1)?.kind === 'colon') {
			if (depth === 0) {
				this.error('The root has no action label.', spanOf(t));
				return null;
			}
			if (t.kind === 'string' && !t.name) {
				this.error('Empty label.', spanOf(t));
				return null;
			}
			spec.action = t.name;
			const labelTok = t;
			this.i += 2;
			t = this.peek()!;
			if (!t) {
				this.error(`Expected a node after the label ${labelTok.text}.`, spanOf(labelTok));
				return null;
			}
		} else if (t.kind === 'word' || t.kind === 'string') {
			const hint =
				t.kind === 'word' && HEADER_WORDS.has(t.name.toLowerCase()) && depth > 0
					? ` ${t.name.toLowerCase()}: goes before the tree.`
					: ` A label needs a colon (${t.kind === 'word' ? t.text : `"${t.name}"`}: 3).`;
			this.error(`Unexpected ${this.describe(t)}.${hint}`, spanOf(t));
			return null;
		}
		let evalSpan: Span | null = null;
		if (t.kind === 'lbrace') {
			const got = this.numbers('rbrace', 'evaluation value');
			if (!got) return null;
			evalSpan = { start: t.start, end: got.end, source: null };
			if (!got.values.length) {
				this.error('Empty evaluation value. Write a number, like {5}.', evalSpan);
				return null;
			}
			spec.eval = got.values.length === 1 ? got.values[0] : got.values;
			t = this.peek()!;
			if (!t) {
				this.error('Expected a node after the evaluation value.', evalSpan);
				return null;
			}
		}
		if (++this.nodes > MAX_NODES) {
			this.error(`More than ${MAX_NODES} nodes. The limit is ${MAX_NODES}.`, spanOf(t));
			return null;
		}
		if (depth > MAX_DEPTH) {
			this.error(
				`The tree is deeper than ${MAX_DEPTH} levels. The limit is ${MAX_DEPTH}.`,
				spanOf(t)
			);
			return null;
		}
		if (t.kind === 'lbrack') {
			this.i++;
			const frame: Frame = { spec: { ...spec, children: [] }, open: t, depth };
			if (evalSpan) this.evals.push({ value: spec.eval!, span: evalSpan });
			return { spec: frame.spec, frame };
		}
		let utility: Utility;
		let span: Span;
		if (t.kind === 'number') {
			if (!Number.isFinite(t.num)) {
				this.error(`${t.text} is too large. Utilities must be finite numbers.`, spanOf(t));
				return null;
			}
			utility = t.num;
			span = spanOf(t);
			this.i++;
		} else if (t.kind === 'lparen') {
			const got = this.numbers('rparen', 'tuple');
			if (!got) return null;
			span = { start: t.start, end: got.end, source: null };
			if (got.values.length < 2) {
				this.error(
					got.values.length
						? `A tuple needs a utility for each of at least two players; for one number write ${got.values[0]}.`
						: 'Empty tuple. Write one utility per player, like (4,3,2).',
					span
				);
				return null;
			}
			utility = got.values;
		} else {
			this.error(
				t.kind === 'rbrack'
					? depth === 0
						? 'Unexpected "]": there is no "[" to close.'
						: 'Expected a node after the label.'
					: `Expected a number, a tuple like (4,3,2), or "[", found ${this.describe(t)}.`,
				spanOf(t)
			);
			return null;
		}
		if (evalSpan)
			this.warn('A terminal node has a utility; its evaluation value is ignored.', evalSpan);
		const tuple = typeof utility === 'number' ? 0 : utility.length;
		if (!this.firstLeaf) this.firstLeaf = { tuple, span };
		else if (this.firstLeaf.tuple !== tuple) {
			const first = this.firstLeaf.tuple;
			this.error(
				first === 0
					? 'This utility is a tuple, but the first terminal node has a number. Use numbers throughout (two players) or tuples throughout.'
					: tuple === 0
						? `This utility is a number, but the first terminal node has a tuple of ${first}. Use tuples throughout (one utility per player).`
						: `This tuple has ${tuple} utilities, but the first terminal node has ${first}. Every tuple needs one utility per player.`,
				span
			);
			return null;
		}
		return { spec: { ...spec, utility } };
	}

	/** The root node and everything under it (iterative, so deep input cannot overflow). */
	private tree(): NodeSpec | null {
		const frames: Frame[] = [];
		let root: NodeSpec | null = null;
		const attach = (spec: NodeSpec) => {
			if (frames.length) frames[frames.length - 1].spec.children.push(spec);
			else root = spec;
		};
		for (;;) {
			const top = frames[frames.length - 1];
			if (top) {
				const t = this.peek();
				if (!t) {
					this.error('Missing "]" to close this "[".', spanOf(top.open));
					return null;
				}
				if (t.kind === 'rbrack') {
					this.i++;
					frames.pop();
					if (!top.spec.children.length) {
						this.error(
							'Empty brackets. An internal node needs at least one child; write a number for a terminal node.',
							{ start: top.open.start, end: t.end, source: null }
						);
						return null;
					}
					attach(top.spec);
					if (!frames.length) return root;
					this.separator();
					continue;
				}
				if (t.kind === 'comma') {
					this.error('Unexpected ",". Separate nodes with one comma or spaces.', spanOf(t));
					return null;
				}
			}
			const got = this.item(frames);
			if (!got) return null;
			if (got.frame) {
				frames.push(got.frame);
				continue;
			}
			attach(got.spec);
			if (!frames.length) return root;
			this.separator();
		}
	}

	/** An optional comma after a node inside brackets (a trailing one before "]" is fine). */
	private separator() {
		if (this.peek()?.kind === 'comma') this.i++;
	}

	private finish(root: NodeSpec, header: ParsedHeader): GameTree | null {
		const tuple = this.firstLeaf?.tuple ?? 0;
		let ok = true;
		for (const e of this.evals) {
			const n = typeof e.value === 'number' ? 0 : e.value.length;
			if (n !== tuple) {
				ok = false;
				this.error(
					tuple === 0
						? 'Evaluation values in a two-player tree are numbers, like {5}.'
						: `Evaluation values in this tree are tuples of ${tuple}, like {${Array.from({ length: tuple }, (_, i) => i + 1).join(',')}}.`,
					e.span
				);
			}
		}
		let order: number[] | null = null;
		if (tuple && header.order) {
			for (const p of header.order.players) {
				if (!Number.isInteger(p.value) || p.value < 1 || p.value > tuple) {
					ok = false;
					this.error(
						`Player ${p.value} does not exist: players are numbered 1 to ${tuple}, one per utility in a tuple.`,
						p.span
					);
				}
			}
			order = header.order.players.map((p) => p.value);
		} else if (header.order) {
			this.warn(
				'order: applies to trees whose utilities are tuples (more than two players); it is ignored.',
				header.order.span
			);
		}
		if (tuple && header.root) {
			this.warn(
				`${header.root.player}: applies to two-player trees; with tuples, players move in the order given by order:.`,
				header.root.span
			);
		}
		if (!ok) return null;
		return buildGameTree(root, {
			root: tuple ? 'max' : (header.root?.player ?? 'max'),
			order
		});
	}
}

/** Parses game tree text. `tree` is null when there is an error. */
export function parseGameTree(text: string): { tree: GameTree | null; diagnostics: Diagnostic[] } {
	const parser = new Parser(text);
	const tree = parser.parse();
	return { tree, diagnostics: parser.diagnostics };
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/** A number as written in the text (shortest round-tripping form). */
export const formatValue = (n: number): string => String(n === 0 ? 0 : n);

/** A tuple without parentheses: "4,3,2". */
export const formatTuple = (t: readonly number[]): string => t.map(formatValue).join(',');

export function formatUtility(u: Utility): string {
	return typeof u === 'number' ? formatValue(u) : `(${formatTuple(u)})`;
}

function formatLabel(label: string): string {
	if (PLAIN_LABEL.test(label)) return label;
	return `"${label.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export interface FormatOptions {
	/** Lines longer than this are broken, one child per line (default 64). */
	width?: number;
}

/**
 * The canonical text of a tree: the header (`min:` when MIN is at the root,
 * `order:` when a multi-player tree has one), then the nodes. Labels are
 * written only where they differ from the default labels.
 */
export function formatGameTree(tree: GameTree, options: FormatOptions = {}): string {
	const width = options.width ?? 64;
	const defaults = defaultActions(tree);
	const prefix = (id: number): string => {
		const n = tree.nodes[id];
		let s = '';
		if (n.parent !== null && n.action !== defaults[id]) s += `${formatLabel(n.action ?? '')}: `;
		if (n.children.length && n.eval !== null)
			s += `{${typeof n.eval === 'number' ? formatValue(n.eval) : formatTuple(n.eval)}}`;
		return s;
	};
	const oneLine: string[] = new Array(tree.nodes.length);
	for (let id = tree.nodes.length - 1; id >= 0; id--) {
		const n = tree.nodes[id];
		oneLine[id] = n.children.length
			? `${prefix(id)}[${n.children.map((c) => oneLine[c]).join(' ')}]`
			: `${prefix(id)}${formatUtility(n.utility ?? 0)}`;
	}
	const block = (id: number, indent: string): string => {
		const n = tree.nodes[id];
		if (!n.children.length || indent.length + oneLine[id].length <= width) return oneLine[id];
		const inner = `${indent}  `;
		const lines = n.children.map((c) => inner + block(c, inner));
		return `${prefix(id)}[\n${lines.join('\n')}\n${indent}]`;
	};
	const header = tree.tuples
		? tree.order
			? `order: ${tree.order.join(' ')}`
			: ''
		: tree.root === 'min'
			? 'min:'
			: '';
	const body = block(0, '');
	if (!header) return body;
	if (!tree.tuples && !body.includes('\n') && header.length + 1 + body.length <= width)
		return `${header} ${body}`;
	return `${header}\n${body}`;
}

// ---------------------------------------------------------------------------
// Highlighting
// ---------------------------------------------------------------------------

/**
 * Palette index (`--tok-N`) of each player's color, by player number − 1:
 * player 1 red, player 2 blue, player 3 green, as on slide 13.
 */
export const PLAYER_TONES: readonly number[] = [4, 0, 1, 2, 3, 5];

export const playerTone = (player: number): number =>
	PLAYER_TONES[(((player - 1) % PLAYER_TONES.length) + PLAYER_TONES.length) % PLAYER_TONES.length];

/** Token classes for `CodeEditor`: directives, labels, numbers, tuples by player, evaluation values. */
export function highlightGameTree(text: string): HighlightToken[] {
	const toks = lex(text);
	const out: HighlightToken[] = [];
	const add = (t: Tok, className: string) => out.push({ from: t.start, to: t.end, className });
	let inHeader = true;
	let group: 'tuple' | 'eval' | null = null;
	let position = 0;
	// The next token that is not a comment, for each token (a label is a word before a colon).
	const nextOf: (Tok | undefined)[] = new Array(toks.length);
	let following: Tok | undefined;
	for (let k = toks.length - 1; k >= 0; k--) {
		nextOf[k] = following;
		if (toks[k].kind !== 'comment') following = toks[k];
	}
	for (let k = 0; k < toks.length; k++) {
		const t = toks[k];
		const next = nextOf[k];
		switch (t.kind) {
			case 'comment':
				add(t, 'hl-comment');
				break;
			case 'word':
			case 'string':
				if (next?.kind === 'colon') {
					const directive = inHeader && t.kind === 'word' && HEADER_WORDS.has(t.name.toLowerCase());
					add(t, directive ? 'hl-keyword' : t.kind === 'string' ? 'hl-string' : 'hl-name');
				}
				break;
			case 'colon':
				add(t, 'hl-punct');
				break;
			case 'number':
				if (group === 'tuple') add(t, `hl-tok-${playerTone(++position)}`);
				else if (group === 'eval') add(t, 'hl-special');
				else add(t, 'hl-number');
				break;
			case 'lbrack':
			case 'rbrack':
				inHeader = false;
				add(t, 'hl-paren');
				break;
			case 'lparen':
				inHeader = false;
				if (group === null) {
					group = 'tuple';
					position = 0;
				}
				add(t, group === 'eval' ? 'hl-special' : 'hl-punct');
				break;
			case 'rparen':
				add(t, group === 'eval' ? 'hl-special' : 'hl-punct');
				if (group === 'tuple') group = null;
				break;
			case 'lbrace':
				inHeader = false;
				group = 'eval';
				add(t, 'hl-special');
				break;
			case 'rbrace':
				group = null;
				add(t, 'hl-special');
				break;
			case 'comma':
				add(t, 'hl-punct');
				break;
			default:
				break;
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// Header edits (the page's root player and player order controls)
// ---------------------------------------------------------------------------

interface HeaderInfo {
	root: { word: Tok; colon: Tok } | null;
	order: { start: number; end: number } | null;
	/** Offset of the first token of the tree (text length when there is none). */
	treeStart: number;
}

function scanHeader(text: string): HeaderInfo {
	const toks = lex(text).filter((t) => t.kind !== 'comment');
	const info: HeaderInfo = { root: null, order: null, treeStart: text.length };
	let i = 0;
	while (i < toks.length) {
		const t = toks[i];
		const colon = toks[i + 1];
		if (t.kind !== 'word' || colon?.kind !== 'colon' || !HEADER_WORDS.has(t.name.toLowerCase()))
			break;
		i += 2;
		if (t.name.toLowerCase() === 'order') {
			let end = colon.end;
			while (i < toks.length && (toks[i].kind === 'number' || toks[i].kind === 'comma')) {
				end = toks[i].end;
				i++;
			}
			info.order ??= { start: t.start, end };
		} else info.root ??= { word: t, colon };
	}
	if (i < toks.length) info.treeStart = toks[i].start;
	return info;
}

/**
 * Inserts a directive before the tree: on a line of its own when the tree
 * starts a line and spans several lines, else on the same line.
 */
function insertBeforeTree(text: string, at: number, directive: string): string {
	const lineStart = text.lastIndexOf('\n', at - 1) + 1;
	const ownLine =
		text.slice(lineStart, at).trim() === '' && text.slice(at).trimEnd().includes('\n');
	return ownLine
		? `${text.slice(0, at)}${directive}\n${text.slice(at)}`
		: `${text.slice(0, at)}${directive} ${text.slice(at)}`;
}

/**
 * The text with its root player set (`max:` or `min:`), keeping everything
 * else. An existing directive is rewritten; otherwise `min:` is inserted
 * before the tree (MAX is the default and needs no directive).
 */
export function withRootPlayer(text: string, player: Player): string {
	const h = scanHeader(text);
	if (h.root) return text.slice(0, h.root.word.start) + player + text.slice(h.root.word.end);
	if (player === 'max') return text;
	return insertBeforeTree(text, h.treeStart, 'min:');
}

/**
 * The text with its `order:` directive replaced, inserted before the tree, or
 * (for null) removed.
 */
export function withPlayerOrder(text: string, order: readonly number[] | null): string {
	const h = scanHeader(text);
	const directive = order ? `order: ${order.join(' ')}` : '';
	if (h.order) {
		if (directive) return text.slice(0, h.order.start) + directive + text.slice(h.order.end);
		const rest = text.slice(h.order.end).replace(/^[ \t]*\n?/, '');
		return text.slice(0, h.order.start) + rest;
	}
	if (!directive) return text;
	return insertBeforeTree(text, h.treeStart, directive);
}

/** Player numbers typed in a field ("1 3 2", "1,3,2"); null unless every entry is 1…players. */
export function parsePlayerOrder(text: string, players: number): number[] | null {
	const parts = text.split(/[\s,]+/).filter(Boolean);
	if (!parts.length) return null;
	const out: number[] = [];
	for (const p of parts) {
		if (!/^\d+$/.test(p)) return null;
		const n = Number(p);
		if (n < 1 || n > players) return null;
		out.push(n);
	}
	return out;
}
