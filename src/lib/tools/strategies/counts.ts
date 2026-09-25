/**
 * Node counts behind the complexity classes (Uninformed Search, slides 31,
 * 32, 38, 44): the sums written out with b and d substituted, their values in
 * exact BigInt arithmetic, and the Towers of Hanoi note (Informed Search,
 * slide 43).
 */
import {
	dfsSpace,
	formatCount,
	formatLarge,
	hanoiMoves,
	idsNodes,
	superscript,
	treeNodes
} from '$lib/theory/search';

/** Largest exponent counted exactly (b^1000 with b ≤ 1000 has at most 3,001 digits). */
export const MAX_EXPONENT = 1000;

/** Terms written out before a sum is elided: the first three, "…", the last two. */
export const MAX_TERMS = 7;

export interface Series {
	/** The sum in symbols, as on the slides: "1 + b + b² + … + bᵈ". */
	symbolic: string;
	/** With b substituted: "1 + 10 + 10² + 10³ + 10⁴ + 10⁵". */
	powers: string;
	/** Each term's value: "1 + 10 + 100 + 1,000 + 10,000 + 100,000". */
	values: string;
	total: bigint;
}

interface Term {
	coef: number;
	power: number;
}

/** Keeps the first three and last two terms of a long sum, with null for "…". */
function elide<T>(items: readonly T[]): (T | null)[] {
	if (items.length <= MAX_TERMS) return [...items];
	return [...items.slice(0, 3), null, ...items.slice(-2)];
}

function pow(b: number, e: number): bigint {
	return BigInt(b) ** BigInt(e);
}

/** "10⁵"; b¹ as "10" and b⁰ as "1" in plain sums (`plain`), as the slides write 1 + b + b². */
function powerText(b: number, e: number, plain: boolean): string {
	if (plain && e === 0) return '1';
	if (plain && e === 1) return String(b);
	return `${b}${superscript(e)}`;
}

function termText(b: number, t: Term, plain: boolean): string {
	const p = powerText(b, t.power, plain);
	return t.coef === 1 ? p : `${t.coef}·${p}`;
}

function series(
	symbolic: string,
	b: number,
	terms: readonly Term[],
	plain: boolean,
	total: bigint
): Series {
	const shown = elide(terms);
	const powers = shown.map((t) => (t ? termText(b, t, plain) : '…')).join(' + ');
	const values = shown
		.map((t) => (t ? formatLarge(BigInt(t.coef) * pow(b, t.power)) : '…'))
		.join(' + ');
	return { symbolic, powers, values, total };
}

function checkExponent(name: string, e: number): void {
	if (!Number.isInteger(e) || e < 0 || e > MAX_EXPONENT) {
		throw new RangeError(`${name} must be an integer from 0 to ${MAX_EXPONENT}`);
	}
}

/** Exponent symbols of the sums: d (BFS, IDS), m (DFS), k = ⌊C* ∕ ε⌋ (UCS). */
export type ExponentSymbol = 'd' | 'm' | 'k';

const SUPERSCRIPT_SYMBOL: Record<ExponentSymbol, string> = { d: 'ᵈ', m: 'ᵐ', k: 'ᵏ' };

/** Nodes in a b-ary tree of depth d: 1 + b + b² + … + bᵈ (BFS time, slide 31). */
export function treeSeries(b: number, depth: number, symbol: ExponentSymbol = 'd'): Series {
	checkExponent(symbol, depth);
	const terms = Array.from({ length: depth + 1 }, (_, i) => ({ coef: 1, power: i }));
	const symbolic = `1 + b + b² + … + b${SUPERSCRIPT_SYMBOL[symbol]}`;
	return series(symbolic, b, terms, true, treeNodes(b, depth));
}

/** Nodes IDS generates: (d+1)b⁰ + d b¹ + (d−1)b² + … + bᵈ (slide 38). */
export function idsSeries(b: number, d: number): Series {
	checkExponent('d', d);
	const terms = Array.from({ length: d + 1 }, (_, i) => ({ coef: d + 1 - i, power: i }));
	const symbolic = '(d+1)b⁰ + d b¹ + (d−1)b² + … + bᵈ';
	return series(symbolic, b, terms, false, idsNodes(b, d));
}

/** `num / den` as a float, computed on BigInts so huge counts keep their precision. */
export function ratioOf(num: bigint, den: bigint): number {
	if (den === 0n) return Infinity;
	const scale = 1_000_000n;
	return Number((num * scale) / den) / Number(scale);
}

/** "1.11"; "1.5"; "12"; "1,234". */
export function formatRatio(x: number): string {
	if (!Number.isFinite(x)) return '∞';
	if (x >= 1000) return formatCount(Math.round(x));
	const digits = x >= 100 ? 0 : x >= 10 ? 1 : 2;
	return String(Number(x.toFixed(digits)));
}

/** `num / den` for display: "1.11", "100,000", "1.11 × 10²⁰" (any size, no overflow). */
export function formatQuotient(num: bigint, den: bigint): string {
	if (den === 0n) return '∞';
	const q = num / den;
	if (q >= 1000n) return formatLarge(q);
	return formatRatio(ratioOf(num, den));
}

/**
 * ⌊C* ∕ ε⌋: the most steps on a path of cost at most C* when every step costs
 * at least ε. Guards against float error (0.3 / 0.1 is 2.9999…).
 */
export function ucsDepth(cStar: number, eps: number): number {
	if (!(eps > 0) || !(cStar >= 0)) throw new RangeError('C* must be ≥ 0 and ε > 0');
	return Math.floor(cStar / eps + 1e-9);
}

export interface UcsBound extends Series {
	/** ⌊C* ∕ ε⌋. */
	depth: number;
	/** Whether `depth` was above MAX_EXPONENT and the counts use MAX_EXPONENT instead. */
	capped: boolean;
}

/**
 * The UCS bound O(b^(C* ∕ ε)) as a count: every node with g(n) ≤ C* is at depth
 * ⌊C* ∕ ε⌋ or less, so there are at most 1 + b + … + b^⌊C* ∕ ε⌋ of them.
 */
export function ucsSeries(b: number, cStar: number, eps: number): UcsBound {
	const depth = ucsDepth(cStar, eps);
	const capped = depth > MAX_EXPONENT;
	return { ...treeSeries(b, capped ? MAX_EXPONENT : depth, 'k'), depth, capped };
}

export interface CountInputs {
	b: number;
	d: number;
	m: number;
	cStar: number;
	eps: number;
}

export interface NodeCounts {
	/** Time (nodes generated). */
	bfs: Series;
	ids: Series;
	dfs: Series;
	ucs: UcsBound;
	/** IDS nodes over BFS nodes (at most (d + 2)/2). */
	idsOverBfs: number;
	/** Space (nodes in memory): BFS bᵈ, IDS b·d + 1, DFS b·m + 1, UCS b^⌊C* ∕ ε⌋. */
	space: { bfs: bigint; ids: bigint; dfs: bigint; ucs: bigint };
}

/** Every count the node-count panel shows. */
export function nodeCounts({ b, d, m, cStar, eps }: CountInputs): NodeCounts {
	const bfs = treeSeries(b, d);
	const ids = idsSeries(b, d);
	const dfs = treeSeries(b, m, 'm');
	const ucs = ucsSeries(b, cStar, eps);
	const k = ucs.capped ? MAX_EXPONENT : ucs.depth;
	return {
		bfs,
		ids,
		dfs,
		ucs,
		idsOverBfs: ratioOf(ids.total, bfs.total),
		space: {
			bfs: pow(b, d),
			ids: dfsSpace(b, d),
			dfs: dfsSpace(b, m),
			ucs: pow(b, k)
		}
	};
}

/** "more" or "fewer" for a ratio compared to 1, as a percentage: "11% more". */
export function percentMore(ratio: number): string {
	if (!Number.isFinite(ratio)) return 'infinitely more';
	const pct = (ratio - 1) * 100;
	if (Math.abs(pct) < 0.5) return 'about as many';
	const n = Math.abs(pct);
	const text =
		n >= 1000 ? `${formatCount(Math.round(n))}%` : `${Number(n.toFixed(n < 10 ? 1 : 0))}%`;
	return `${text} ${pct > 0 ? 'more' : 'fewer'}`;
}

// ---------------------------------------------------------------------------
// Towers of Hanoi (Informed Search, slide 43)
// ---------------------------------------------------------------------------

/** At most three moves are legal in any Towers of Hanoi state (three pegs). */
export const HANOI_BRANCHING = 3;

/** bᵈ is computed exactly up to this depth; beyond it only its number of digits is estimated. */
export const HANOI_EXACT_DEPTH = 20_000n;

export interface HanoiFacts {
	disks: number;
	/** 2ⁿ − 1: moves in the shortest solution, the depth d of the solution. */
	moves: bigint;
	/** 3ᵈ when d ≤ HANOI_EXACT_DEPTH, else null. */
	power: bigint | null;
	/** Digits of 3ᵈ (exact when `power` is set, else estimated). */
	digits: number;
}

/** Moves for n disks and the size of a search tree of that depth with b = 3. */
export function hanoiFacts(disks: number): HanoiFacts {
	const moves = hanoiMoves(disks);
	if (moves <= HANOI_EXACT_DEPTH) {
		const power = BigInt(HANOI_BRANCHING) ** moves;
		return { disks, moves, power, digits: power.toString().length };
	}
	const digits = Math.floor(Number(moves) * Math.log10(HANOI_BRANCHING)) + 1;
	return { disks, moves, power: null, digits };
}

export interface HanoiText {
	/** "2⁵ − 1". */
	movesFormula: string;
	/** "31". */
	moves: string;
	/** "3³¹", or "3^(2⁶⁴ − 1)" when the exponent is too long to write out. */
	power: string;
	/** "617,673,396,283,947" or "≈ 1.2 × 10⁴⁸⁸"; null when only the digits are estimated. */
	value: string | null;
	/** "15 digits", "about 5.5 × 10¹⁸ digits". */
	digits: string;
}

/** The Hanoi facts as the panel writes them. */
export function hanoiText(f: HanoiFacts): HanoiText {
	const movesFormula = `2${superscript(f.disks)} − 1`;
	const b = HANOI_BRANCHING;
	const power =
		f.moves <= 1_000_000n ? `${b}${superscript(Number(f.moves))}` : `${b}^(${movesFormula})`;
	const value =
		f.power === null
			? null
			: f.power.toString().length <= 15
				? formatCount(f.power)
				: `≈ ${formatLarge(f.power)}`;
	const count = f.digits < 1e15 ? formatCount(f.digits) : formatLarge(BigInt(Math.round(f.digits)));
	const digits = `${f.power === null ? 'about ' : ''}${count} ${f.digits === 1 ? 'digit' : 'digits'}`;
	return { movesFormula, moves: formatCount(f.moves), power, value, digits };
}
