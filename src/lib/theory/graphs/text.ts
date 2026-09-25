/**
 * The graph text format (docs/ARCHITECTURE.md §4.2.1): parse, format, and
 * highlight.
 *
 * ```
 * # h: Straight-line distance to Bucharest   ← first-line comment: the heuristic's label
 * undirected                 # or: directed. Default: undirected, unless some edge uses ->
 * start: Arad
 * goal: Bucharest            # several goals: "goal: G1, G2" (also "goals:")
 * Arad - Sibiu 140           # an undirected edge with its cost (cost defaults to 1)
 * S -> d 3                   # a directed edge; the graph becomes directed
 * Arad Sibiu 140             # no arrow: the graph's direction
 * h: Arad=366, Sibiu=253     # heuristic values; several h: lines allowed
 * at: Arad 26 233            # a drawing position (optional)
 * node: Lonely               # a state with no edges (a list declares several)
 * ```
 *
 * Details beyond the table in §4.2.1:
 * - Names are words of letters, digits, `_`, `'` and `.` (any script), or
 *   double-quoted strings where `\"` and `\\` are escapes.
 * - Edge operators: `-`, `--`, `->`, `→`, or none; a cost may follow a colon
 *   (`A - B: 5`). Directives are case-insensitive.
 * - Node order is the order in which states first appear on start, goal,
 *   node, edge and at lines (h lines never create states).
 * - A comment of the form `# h: <label>` on the first non-blank line sets
 *   `hLabel`; `formatGraphText` writes the label that way, so it round-trips.
 * - `node:` (or `nodes:`) takes a list like `goal:`. `formatGraphText` writes
 *   a `node:` list before `start:` when the order in which states would first
 *   appear differs from the graph's node order, so a parsed spec keeps it.
 */
import type { HighlightToken } from '$lib/components/ui/types';
import type { Diagnostic, Span } from '../diagnostics';
import type { GraphEdge, GraphNode, GraphProblemSpec } from './types';

/** Largest graph the text format accepts (it is parsed on every keystroke). */
export const MAX_STATES = 300;
export const MAX_EDGES = 3000;

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

type TokKind = 'word' | 'string' | 'arrow' | 'dash' | 'eq' | 'colon' | 'comma' | 'comment' | 'bad';

/** What a token is on its line; drives highlighting. */
type Role = 'keyword' | 'name' | 'number' | 'operator' | 'punct' | 'comment';

interface Tok {
	kind: TokKind;
	start: number;
	end: number;
	/** The token's source text. */
	text: string;
	/** A quoted name with its escapes resolved; otherwise the source text. */
	value: string;
	/** False for a quoted name without its closing quote. */
	closed: boolean;
	role?: Role;
}

const WORD = /[\p{L}\p{N}\p{M}_'.]+/uy;
const PLAIN_NAME = /^[\p{L}\p{N}\p{M}_'.]+$/u;
const NUMBER = /^(?:\d+\.?\d*|\.\d+)$/;
const WHITESPACE = /\s/;

/** Tokens of the line `text[start, end)` (no newline inside). */
function lexLine(text: string, start: number, end: number): Tok[] {
	const toks: Tok[] = [];
	const push = (kind: TokKind, from: number, to: number, value?: string, closed = true) => {
		const src = text.slice(from, to);
		toks.push({ kind, start: from, end: to, text: src, value: value ?? src, closed });
	};
	let i = start;
	while (i < end) {
		const c = text[i];
		if (c === ' ' || c === '\t' || c === '\r' || WHITESPACE.test(c)) {
			i++;
		} else if (c === '#') {
			push('comment', i, end);
			break;
		} else if (c === '"') {
			let j = i + 1;
			let value = '';
			let closed = false;
			while (j < end) {
				const d = text[j];
				if (d === '\\' && j + 1 < end && (text[j + 1] === '"' || text[j + 1] === '\\')) {
					value += text[j + 1];
					j += 2;
				} else if (d === '"') {
					closed = true;
					j++;
					break;
				} else {
					value += d;
					j++;
				}
			}
			push('string', i, j, value, closed);
			i = j;
		} else if (c === '-') {
			const next = i + 1 < end ? text[i + 1] : '';
			const len = next === '>' || next === '-' ? 2 : 1;
			push(next === '>' ? 'arrow' : 'dash', i, i + len);
			i += len;
		} else if (c === '→') {
			push('arrow', i, i + 1);
			i++;
		} else if (c === '=' || c === ':' || c === ',') {
			push(c === '=' ? 'eq' : c === ':' ? 'colon' : 'comma', i, i + 1);
			i++;
		} else {
			WORD.lastIndex = i;
			const m = WORD.exec(text);
			if (m) {
				push('word', i, i + m[0].length);
				i += m[0].length;
			} else {
				// One code point; runs of unexpected characters form one token.
				const len = (text.codePointAt(i) ?? 0) > 0xffff ? 2 : 1;
				const prev = toks[toks.length - 1];
				if (prev?.kind === 'bad' && prev.end === i) {
					prev.end = i + len;
					prev.text = prev.value = text.slice(prev.start, prev.end);
				} else {
					push('bad', i, i + len);
				}
				i += len;
			}
		}
	}
	return toks;
}

function forEachLine(text: string, fn: (start: number, end: number, line: number) => void) {
	let start = 0;
	for (let line = 1; ; line++) {
		const nl = text.indexOf('\n', start);
		fn(start, nl === -1 ? text.length : nl, line);
		if (nl === -1) return;
		start = nl + 1;
	}
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

interface NameRef {
	name: string;
	span: Span;
}

type Stmt =
	| { kind: 'directed' | 'undirected'; span: Span }
	| { kind: 'start' | 'goal' | 'node'; names: NameRef[] }
	| { kind: 'h'; entries: { ref: NameRef; value: number; span: Span }[] }
	| { kind: 'at'; ref: NameRef; x: number; y: number }
	| {
			kind: 'edge';
			from: NameRef;
			to: NameRef;
			/** The arrow token, when the edge has one. */
			arrow: Tok | null;
			cost: number;
			span: Span;
	  };

const DIRECTIVES = new Set([
	'start',
	'goal',
	'goals',
	'h',
	'at',
	'node',
	'nodes',
	'directed',
	'undirected'
]);

/** Directive words that cannot start an arrowless edge (a missing colon is likelier). */
const NEEDS_COLON = new Set(['start', 'goal', 'goals', 'at', 'node', 'nodes']);

const EXPECTED_DIRECTIVES = 'Expected start:, goal:, h:, at:, node:, directed, or undirected.';

const span = (start: number, end: number): Span => ({ start, end, source: null });
const spanOf = (t: Tok): Span => span(t.start, t.end);
type NameTok = Tok & { kind: 'word' | 'string' };
const isName = (t: Tok | undefined): t is NameTok => t?.kind === 'word' || t?.kind === 'string';
const nameOf = (t: Tok) => (t.kind === 'string' ? t.value : t.text);

/** Reads one line's tokens into a statement, marking token roles and reporting problems. */
class LineReader {
	/** Tokens without the comment and unexpected characters. */
	private toks: Tok[];
	/** Whether the line has anything besides a comment. */
	readonly content: boolean;

	constructor(
		all: Tok[],
		private diagnostics: Diagnostic[]
	) {
		const toks: Tok[] = [];
		for (const t of all) {
			if (t.kind === 'comment') {
				t.role = 'comment';
			} else if (t.kind === 'bad') {
				this.error(`Unexpected character "${t.text}".`, spanOf(t));
			} else {
				if (t.kind === 'string') {
					if (!t.closed) this.error('This quoted name has no closing quote (").', spanOf(t));
					else if (!t.value) this.error('Empty state name.', spanOf(t));
				}
				toks.push(t);
			}
		}
		this.toks = toks;
		this.content = all.some((t) => t.kind !== 'comment');
	}

	private report(severity: Diagnostic['severity'], message: string, where: Span) {
		this.diagnostics.push({ severity, message, span: where });
	}
	private error(message: string, where: Span) {
		this.report('error', message, where);
	}
	/** Span from token `i` to the end of the line's tokens. */
	private rest(i: number): Span {
		return span(this.toks[i].start, this.toks[this.toks.length - 1].end);
	}
	private ref(t: Tok): NameRef {
		t.role = 'name';
		return { name: nameOf(t), span: spanOf(t) };
	}
	/** A number, optionally negative, at `i`: its value and the index after it. */
	private number(i: number): { value: number; neg: boolean; next: number; span: Span } | null {
		const toks = this.toks;
		const signed = toks[i]?.kind === 'dash' && toks[i + 1]?.kind === 'word';
		const t = toks[signed ? i + 1 : i];
		if (t?.kind !== 'word' || !NUMBER.test(t.text)) return null;
		const value = Number(t.text);
		if (!Number.isFinite(value)) return null;
		t.role = 'number';
		if (signed) toks[i].role = 'number';
		return {
			value: signed ? -value : value,
			neg: signed,
			next: signed ? i + 2 : i + 1,
			span: span(toks[i].start, t.end)
		};
	}

	read(): Stmt | null {
		const toks = this.toks;
		if (!toks.length) return null;
		const t0 = toks[0];
		const t1 = toks[1];
		if (t0.kind === 'word') {
			const kw = t0.text.toLowerCase();
			if (t1?.kind === 'colon') {
				if (!DIRECTIVES.has(kw)) {
					this.error(
						`Unknown directive "${t0.text}:". ${EXPECTED_DIRECTIVES}`,
						span(t0.start, t1.end)
					);
					return null;
				}
				t0.role = 'keyword';
				t1.role = 'punct';
				return this.directive(kw, t0, 2);
			}
			if (
				(kw === 'directed' || kw === 'undirected') &&
				t1?.kind !== 'arrow' &&
				t1?.kind !== 'dash'
			) {
				t0.role = 'keyword';
				return this.directive(kw, t0, 1);
			}
		}
		return this.edge();
	}

	private directive(kw: string, head: Tok, i: number): Stmt | null {
		const toks = this.toks;
		const where = span(head.start, toks[i - 1].end);
		switch (kw) {
			case 'directed':
			case 'undirected':
				if (i < toks.length) this.error(`Unexpected "${toks[i].text}" after ${kw}.`, this.rest(i));
				return { kind: kw, span: where };
			case 'start': {
				const names = this.names(i);
				if (!names.length) {
					this.error('start: needs a state name.', where);
					return null;
				}
				if (names.length > 1) {
					const extra = names[names.length - 1].span;
					this.error(
						`More than one start state: ${names[0].name} and ${names[1].name}.`,
						span(names[1].span.start, extra.end)
					);
				}
				return { kind: 'start', names: [names[0]] };
			}
			case 'goal':
			case 'goals':
			case 'node':
			case 'nodes': {
				const names = this.names(i);
				if (!names.length) {
					this.error(`${head.text.toLowerCase()}: needs a state name.`, where);
					return null;
				}
				return { kind: kw.startsWith('goal') ? 'goal' : 'node', names };
			}
			case 'h':
				return this.heuristic(i, where);
			default:
				return this.position(i, where);
		}
	}

	/** State names separated by commas or spaces. */
	private names(i: number): NameRef[] {
		const out: NameRef[] = [];
		for (const t of this.toks.slice(i)) {
			if (t.kind === 'comma') t.role = 'punct';
			else if (isName(t)) out.push(this.ref(t));
			else this.error(`Unexpected "${t.text}". Separate state names with commas.`, spanOf(t));
		}
		return out;
	}

	/** `h: A=1, B=2` */
	private heuristic(i: number, where: Span): Stmt | null {
		const toks = this.toks;
		const entries: { ref: NameRef; value: number; span: Span }[] = [];
		let problems = false;
		const skip = (k: number) => {
			problems = true;
			while (k < toks.length && toks[k].kind !== 'comma') k++;
			return k;
		};
		while (i < toks.length) {
			const t = toks[i];
			if (t.kind === 'comma') {
				t.role = 'punct';
				i++;
				continue;
			}
			if (!isName(t)) {
				this.error(`Expected a state name in h:, found "${t.text}".`, spanOf(t));
				i = skip(i + 1);
				continue;
			}
			const ref = this.ref(t);
			const eq = toks[i + 1];
			if (eq?.kind !== 'eq') {
				this.error(`Expected "=" after ${t.text} (write ${t.text}=5).`, spanOf(t));
				i = skip(i + 1);
				continue;
			}
			eq.role = 'operator';
			const num = this.number(i + 2);
			const v = toks[i + 2];
			if (!num) {
				if (!v || v.kind === 'comma')
					this.error(`h(${ref.name}) needs a value after "=".`, spanOf(eq));
				else this.error(`h(${ref.name}) must be a number, found "${v.text}".`, spanOf(v));
				i = skip(i + 2);
				continue;
			}
			if (num.neg && num.value !== 0) {
				this.error(
					`h(${ref.name}) = ${formatNumber(num.value)} is negative. Heuristic values must be ≥ 0.`,
					num.span
				);
				problems = true;
			} else {
				entries.push({ ref, value: Math.abs(num.value), span: span(t.start, num.span.end) });
			}
			i = num.next;
		}
		if (!entries.length && !problems) this.error('h: needs values like A=5.', where);
		return { kind: 'h', entries };
	}

	/** `at: A 10 20` */
	private position(i: number, where: Span): Stmt | null {
		const toks = this.toks;
		const t = toks[i];
		if (!isName(t)) {
			this.error(
				'at: needs a state name and a position, like "at: A 10 20".',
				t ? spanOf(t) : where
			);
			return null;
		}
		const ref = this.ref(t);
		const xy: number[] = [];
		let k = i + 1;
		while (xy.length < 2) {
			if (toks[k]?.kind === 'comma') toks[k++].role = 'punct';
			const num = this.number(k);
			if (!num) {
				const bad = toks[k];
				if (bad) {
					this.error(
						`Expected a number for the position of ${ref.name}, found "${bad.text}".`,
						spanOf(bad)
					);
				} else {
					this.error(
						`at: needs a position for ${ref.name}, like "at: ${t.text} 10 20".`,
						span(where.start, toks[k - 1].end)
					);
				}
				return null;
			}
			xy.push(num.value);
			k = num.next;
		}
		if (k < toks.length) {
			this.error(`Unexpected "${toks[k].text}" after the position.`, this.rest(k));
			return null;
		}
		return { kind: 'at', ref, x: xy[0], y: xy[1] };
	}

	/** `A - B 5`, `A -> B 5`, `A B 5`, `A - B: 5`. */
	private edge(): Stmt | null {
		const toks = this.toks;
		const t0 = toks[0];
		if (!isName(t0)) {
			this.error(`Expected a state name, found "${t0.text}".`, spanOf(t0));
			return null;
		}
		const op = toks[1]?.kind === 'arrow' || toks[1]?.kind === 'dash' ? toks[1] : null;
		if (!op && t0.kind === 'word') {
			const kw = t0.text.toLowerCase();
			if (NEEDS_COLON.has(kw)) {
				this.error(`Missing ":" after ${t0.text}.`, spanOf(t0));
				return null;
			}
		}
		let i = op ? 2 : 1;
		const t = toks[i];
		if (!isName(t)) {
			if (t) this.error(`Expected a state name, found "${t.text}".`, spanOf(t));
			else if (op) this.error(`Expected a state after "${op.text}".`, spanOf(op));
			else
				this.error(
					`"${t0.text}" is not an edge or a directive. Write edges like "A - B 5".`,
					spanOf(t0)
				);
			return null;
		}
		const from = this.ref(t0);
		if (op) op.role = 'operator';
		const to = this.ref(t);
		i++;
		let colon: Tok | null = null;
		if (toks[i]?.kind === 'colon') {
			colon = toks[i++];
			colon.role = 'punct';
		}
		let cost = 1;
		let ok = true;
		const num = this.number(i);
		if (num) {
			if (num.neg && num.value !== 0) {
				this.error(`Negative cost ${formatNumber(num.value)}. Step costs must be ≥ 0.`, num.span);
				ok = false;
			} else {
				cost = Math.abs(num.value);
			}
			i = num.next;
		} else if (isName(toks[i])) {
			const c = toks[i];
			if (c.kind === 'word' && /^\p{L}/u.test(c.text)) {
				const joined = `${nameOf(t)} ${c.text}`;
				this.error(
					`Expected a cost after ${nameOf(t)}, found "${c.text}". Names with spaces need quotes, like "${joined}".`,
					spanOf(c)
				);
			} else {
				this.error(`Bad cost "${c.text}". Costs are numbers ≥ 0, like 5 or 2.5.`, spanOf(c));
			}
			return null;
		} else if (colon && (i >= toks.length || toks[i].kind === 'comma')) {
			this.error('Expected a cost after ":".', spanOf(colon));
			return null;
		}
		if (i < toks.length) {
			const extra = toks[i];
			const hint =
				!op && (extra.kind === 'arrow' || extra.kind === 'dash') && !colon && !num
					? ` Names with spaces need quotes, like "${nameOf(t0)} ${nameOf(t)}".`
					: '';
			this.error(`Unexpected "${extra.text}" after the edge.${hint}`, this.rest(i));
			return null;
		}
		if (!ok) return null;
		return {
			kind: 'edge',
			from,
			to,
			arrow: op?.kind === 'arrow' ? op : null,
			cost,
			span: span(t0.start, toks[toks.length - 1].end)
		};
	}
}

// ---------------------------------------------------------------------------
// parseGraphText
// ---------------------------------------------------------------------------

const H_LABEL = /^#\s*h\s*:\s*(.*?)\s*$/i;

/**
 * Parses the graph text format. Every problem becomes a diagnostic (spans are
 * offsets into `text`, source `null`); `spec` is null when there is an error.
 */
export function parseGraphText(text: string): {
	spec: GraphProblemSpec | null;
	diagnostics: Diagnostic[];
} {
	const diagnostics: Diagnostic[] = [];
	const report = (severity: Diagnostic['severity'], message: string, where?: Span) =>
		diagnostics.push(where ? { severity, message, span: where } : { severity, message });

	const stmts: { stmt: Stmt; line: number }[] = [];
	let content = false;
	let firstLine = true;
	let hLabel: string | undefined;
	forEachLine(text, (start, end, line) => {
		const toks = lexLine(text, start, end);
		if (!toks.length) return;
		if (firstLine && toks.length === 1 && toks[0].kind === 'comment') {
			const label = H_LABEL.exec(toks[0].text)?.[1];
			if (label) hLabel = label;
		}
		firstLine = false;
		const reader = new LineReader(toks, diagnostics);
		if (reader.content) content = true;
		const stmt = reader.read();
		if (stmt) stmts.push({ stmt, line });
	});

	if (!content) {
		return {
			spec: null,
			diagnostics: [
				{
					severity: 'error',
					message: 'The graph is empty. Write edges like "A - B 5", then start: and goal: lines.'
				}
			]
		};
	}

	// States in order of first appearance.
	const nodes = new Map<string, GraphNode>();
	const touch = (ref: NameRef) => {
		if (nodes.has(ref.name)) return;
		if (nodes.size === MAX_STATES) {
			report('error', `More than ${MAX_STATES} states. The limit is ${MAX_STATES}.`, ref.span);
		}
		nodes.set(ref.name, { id: ref.name });
	};

	let start: (NameRef & { line: number }) | null = null;
	const goals: NameRef[] = [];
	const goalSet = new Set<string>();
	let hSeen = false;
	const hValues = new Map<string, { value: number; span: Span }>();
	const positions = new Map<string, { x: number; y: number }>();
	const rawEdges: (Extract<Stmt, { kind: 'edge' }> & { line: number })[] = [];
	let directedAt: Span | null = null;
	let undirectedAt: Span | null = null;

	for (const { stmt, line } of stmts) {
		switch (stmt.kind) {
			case 'directed':
			case 'undirected': {
				const other = stmt.kind === 'directed' ? undirectedAt : directedAt;
				if (other)
					report('error', 'The graph is declared both directed and undirected.', stmt.span);
				if (stmt.kind === 'directed') directedAt ??= stmt.span;
				else undirectedAt ??= stmt.span;
				break;
			}
			case 'start':
				for (const ref of stmt.names) {
					touch(ref);
					if (!start) start = { ...ref, line };
					else if (start.name !== ref.name)
						report('error', `More than one start state: ${start.name} and ${ref.name}.`, ref.span);
					else
						report(
							'info',
							`The start state is already ${ref.name} (line ${start.line}).`,
							ref.span
						);
				}
				break;
			case 'goal':
				for (const ref of stmt.names) {
					touch(ref);
					if (goalSet.has(ref.name)) continue;
					goalSet.add(ref.name);
					goals.push(ref);
				}
				break;
			case 'node':
				stmt.names.forEach(touch);
				break;
			case 'h':
				hSeen = true;
				for (const { ref, value, span: where } of stmt.entries) {
					if (hValues.has(ref.name)) {
						report(
							'warning',
							`h(${ref.name}) is given twice; the later value ${formatNumber(value)} is used.`,
							where
						);
					}
					hValues.set(ref.name, { value, span: where });
				}
				break;
			case 'at':
				touch(stmt.ref);
				if (positions.has(stmt.ref.name)) {
					report(
						'warning',
						`The position of ${stmt.ref.name} is given twice; the later one is used.`,
						stmt.ref.span
					);
				}
				positions.set(stmt.ref.name, { x: stmt.x, y: stmt.y });
				break;
			case 'edge':
				touch(stmt.from);
				touch(stmt.to);
				rawEdges.push({ ...stmt, line });
				break;
		}
	}

	// Direction.
	if (undirectedAt) {
		for (const e of rawEdges) {
			if (!e.arrow) continue;
			report(
				'error',
				`"${e.arrow.text}" makes a directed edge, but the graph is declared undirected. Use "-" or remove "undirected".`,
				spanOf(e.arrow)
			);
		}
	}
	const directed = !!directedAt || (!undirectedAt && rawEdges.some((e) => e.arrow));

	// Edges; a later duplicate replaces the earlier one.
	const slots: (GraphEdge | null)[] = [];
	const slotLine: number[] = [];
	const slotOf = new Map<string, number>();
	let live = 0;
	let tooMany = false;
	const keyOf = (a: string, b: string) =>
		directed || a < b ? `${a.length}:${a}${b}` : `${b.length}:${b}${a}`;
	for (const e of rawEdges) {
		const a = e.from.name;
		const b = e.to.name;
		const loop = a === b;
		if (loop) report('info', `Self-loop on ${a}: this edge leads back to the same state.`, e.span);
		const pairs: [string, string][] =
			directed && !e.arrow && !loop
				? [
						[a, b],
						[b, a]
					]
				: [[a, b]];
		let replaced: number | null = null;
		for (const [from, to] of pairs) {
			const key = keyOf(from, to);
			const prev = slotOf.get(key);
			if (prev !== undefined) {
				slots[prev] = null;
				live--;
				replaced ??= slotLine[prev];
			}
			slotOf.set(key, slots.length);
			slots.push({ from, to, cost: e.cost });
			slotLine.push(e.line);
			if (++live > MAX_EDGES && !tooMany) {
				tooMany = true;
				report('error', `More than ${MAX_EDGES} edges. The limit is ${MAX_EDGES}.`, e.span);
			}
		}
		if (replaced !== null) {
			const op = e.arrow ? '->' : '-';
			report(
				'warning',
				`Edge ${a} ${op} ${b} is already listed on line ${replaced}; this line replaces it.`,
				e.span
			);
		}
	}
	const edges = slots.filter((e): e is GraphEdge => e !== null);

	// Start and goals.
	const incident = new Set<string>();
	for (const e of edges) incident.add(e.from).add(e.to);
	if (!start) report('error', 'No start state. Add a line like "start: A".');
	else if (!incident.has(start.name))
		report('warning', `Start state ${start.name} has no edges.`, start.span);
	if (!goals.length) report('error', 'No goal state. Add a line like "goal: G".');
	for (const g of goals) {
		if (!incident.has(g.name) && g.name !== start?.name)
			report('warning', `Goal state ${g.name} has no edges.`, g.span);
	}

	// Heuristic (Object.fromEntries keeps even "__proto__" as an own property).
	let h: Record<string, number> | undefined;
	if (hSeen) {
		const known: [string, number][] = [];
		for (const [name, { value, span: where }] of hValues) {
			if (nodes.has(name)) known.push([name, value]);
			else
				report(
					'warning',
					`h is given for ${name}, which is not a state of the graph; ignored.`,
					where
				);
		}
		h = Object.fromEntries(known);
	}

	for (const [name, { x, y }] of positions) {
		const node = nodes.get(name)!;
		node.x = x;
		node.y = y;
	}

	// Located problems in text order, then the rest.
	const sorted = diagnostics
		.map((d, i) => ({ d, i }))
		.sort((p, q) => (p.d.span?.start ?? Infinity) - (q.d.span?.start ?? Infinity) || p.i - q.i)
		.map((p) => p.d);

	if (sorted.some((d) => d.severity === 'error') || !start)
		return { spec: null, diagnostics: sorted };
	const spec: GraphProblemSpec = {
		graph: { directed, nodes: [...nodes.values()], edges },
		start: start.name,
		goals: goals.map((g) => g.name)
	};
	if (h) spec.h = h;
	if (hLabel) spec.hLabel = hLabel;
	return { spec, diagnostics: sorted };
}

// ---------------------------------------------------------------------------
// formatGraphText
// ---------------------------------------------------------------------------

/** Integers as-is; other numbers with up to 3 decimals, trailing zeros trimmed. */
function formatNumber(n: number): string {
	if (Number.isInteger(n) && Math.abs(n) < 1e21) return String(n === 0 ? 0 : n);
	if (!Number.isFinite(n) || Math.abs(n) >= 1e21) return String(n);
	const s = n.toFixed(3).replace(/\.?0+$/, '');
	return s === '-0' ? '0' : s;
}

/** A name as written in the text format: plain words as-is, anything else quoted. */
function quoteName(name: string): string {
	return PLAIN_NAME.test(name) ? name : `"${name.replace(/[\\"]/g, '\\$&')}"`;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

const PER_LINE = 6;

/**
 * The canonical text of a spec: an `# h: <hLabel>` comment (when there is a
 * label), the direction, a `node:` list when needed to keep the node order,
 * `start:`, `goal:`, the edges (costs always written), `node:` lines for
 * states without edges, `h:` lines (graph order, six entries per line), and,
 * with `positions`, `at:` lines for nodes that have x and y.
 * `parseGraphText(formatGraphText(spec, { positions: true })).spec` equals
 * `spec` when its numbers have at most three decimals.
 */
export function formatGraphText(
	spec: GraphProblemSpec,
	opts: { positions?: boolean } = {}
): string {
	const { graph } = spec;
	const lines: string[] = [];
	if (spec.hLabel?.trim()) lines.push(`# h: ${spec.hLabel.replace(/\s+/g, ' ').trim()}`);
	lines.push(graph.directed ? 'directed' : 'undirected');

	const ids = graph.nodes.map((n) => n.id);
	const idSet = new Set(ids);
	const seen = new Set<string>();
	const implicit: string[] = [];
	const see = (id: string) => {
		if (seen.has(id) || !idSet.has(id)) return;
		seen.add(id);
		implicit.push(id);
	};
	if (spec.start) see(spec.start);
	spec.goals.forEach(see);
	for (const e of graph.edges) {
		see(e.from);
		see(e.to);
	}
	const isolated = ids.filter((id) => !seen.has(id));
	implicit.push(...isolated);
	const declare = implicit.some((id, i) => id !== ids[i]);

	const nodeLines = (list: string[]) =>
		chunks(list, PER_LINE).forEach((c) => lines.push(`node: ${c.map(quoteName).join(', ')}`));
	if (declare) nodeLines(ids);
	if (spec.start) lines.push(`start: ${quoteName(spec.start)}`);
	if (spec.goals.length) lines.push(`goal: ${spec.goals.map(quoteName).join(', ')}`);
	const op = graph.directed ? '->' : '-';
	for (const e of graph.edges) {
		lines.push(`${quoteName(e.from)} ${op} ${quoteName(e.to)} ${formatNumber(e.cost)}`);
	}
	if (!declare) nodeLines(isolated);
	const h = spec.h;
	if (h) {
		const entries = ids
			.filter((id) => Object.hasOwn(h, id))
			.map((id) => `${quoteName(id)}=${formatNumber(h[id])}`);
		chunks(entries, PER_LINE).forEach((c) => lines.push(`h: ${c.join(', ')}`));
	}
	if (opts.positions) {
		for (const n of graph.nodes) {
			if (n.x === undefined || n.y === undefined) continue;
			if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
			lines.push(`at: ${quoteName(n.id)} ${formatNumber(n.x)} ${formatNumber(n.y)}`);
		}
	}
	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// highlightGraphText
// ---------------------------------------------------------------------------

const CLASS: Record<Role | 'string', string> = {
	keyword: 'hl-keyword',
	name: 'hl-name',
	number: 'hl-number',
	operator: 'hl-operator',
	punct: 'hl-punct',
	comment: 'hl-comment',
	string: 'hl-string'
};

/**
 * Highlight ranges for `CodeEditor`: directives `hl-keyword`, state names
 * `hl-name` (quoted ones `hl-string`), costs, h values and coordinates
 * `hl-number`, arrows, dashes and `=` `hl-operator`, `:` and `,` `hl-punct`,
 * comments `hl-comment`. Ranges are ascending and do not overlap.
 */
export function highlightGraphText(text: string): HighlightToken[] {
	const out: HighlightToken[] = [];
	const sink: Diagnostic[] = [];
	forEachLine(text, (start, end) => {
		const toks = lexLine(text, start, end);
		if (!toks.length) return;
		new LineReader(toks, sink).read();
		sink.length = 0;
		for (const t of toks) {
			if (!t.role) continue;
			const cls = t.role === 'name' && t.kind === 'string' ? 'string' : t.role;
			out.push({ from: t.start, to: t.end, className: CLASS[cls] });
		}
	});
	return out;
}
