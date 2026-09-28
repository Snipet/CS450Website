/**
 * Pure layout and queries for the history timeline (Introduction to AI,
 * slide 20): one row per era on a shared year axis, AI winters as shaded
 * bands, and numbered markers for the dates mentioned elsewhere in the deck.
 * The Svelte component only draws what `layoutTimeline` returns.
 */
import type { Era, HistoryEvent, Winter } from './content';

export const PRESENT_LABEL = 'present';

// ---------------------------------------------------------------------------
// Eras
// ---------------------------------------------------------------------------

/** Last year of an era, with "present" drawn at `present`. */
export function eraEnd(era: Era, present: number): number {
	return era.end ?? present;
}

/** "1943–1956", "1986–present". */
export function formatEraYears(era: Era): string {
	return `${era.start}–${era.end ?? PRESENT_LABEL}`;
}

/** "13 years", "since 1986". */
export function formatEraLength(era: Era): string {
	if (era.end === null) return `since ${era.start}`;
	const n = era.end - era.start;
	return n === 1 ? '1 year' : `${n} years`;
}

export interface Overlap {
	era: Era;
	/** First shared year. */
	from: number;
	/** Last shared year, or null when both eras run to the present. */
	to: number | null;
}

/**
 * The other eras that share more than a single boundary year with `era`
 * (1969–1986 and 1986–present meet at 1986 but do not overlap), in list order.
 */
export function overlappingEras(era: Era, eras: readonly Era[]): Overlap[] {
	const out: Overlap[] = [];
	for (const other of eras) {
		if (other.id === era.id) continue;
		const from = Math.max(era.start, other.start);
		const to =
			era.end === null && other.end === null
				? null
				: Math.min(era.end ?? Infinity, other.end ?? Infinity);
		if (to === null || from < to) out.push({ era: other, from, to });
	}
	return out;
}

/** "1969–1973", "since 2011". */
export function formatOverlap(o: Overlap): string {
	return o.to === null ? `since ${o.from}` : `${o.from}–${o.to}`;
}

/** Events whose year falls within the era (both ends included). */
export function eventsDuring<E extends HistoryEvent>(era: Era, events: readonly E[]): E[] {
	return events.filter((e) => e.year >= era.start && (era.end === null || e.year <= era.end));
}

/** Winters whose shaded band lies inside the era's span. */
export function wintersDuring<W extends Winter>(era: Era, winters: readonly W[]): W[] {
	return winters.filter(
		(w) => w.band[0] >= era.start && (era.end === null || w.band[1] <= era.end)
	);
}

/** The accessible name of the chart. */
export function describeTimeline(eras: readonly Era[], selected: Era | null = null): string {
	if (eras.length === 0) return 'Timeline of AI eras: none.';
	const first = Math.min(...eras.map((e) => e.start));
	const ongoing = eras.some((e) => e.end === null);
	const last = ongoing ? PRESENT_LABEL : String(Math.max(...eras.map((e) => e.end ?? 0)));
	const list = eras.map((e) => `${e.label}, ${formatEraYears(e)}`).join('; ');
	const head = `Timeline of ${eras.length} overlapping eras of AI from ${first} to the ${ongoing ? '' : 'year '}${last}: ${list}.`;
	return selected ? `${head} Highlighted: ${selected.label}.` : head;
}

// ---------------------------------------------------------------------------
// Text metrics (estimates; the page is laid out before fonts are measured)
// ---------------------------------------------------------------------------

/** Average advance of the UI font, as a fraction of the font size. */
const CHAR_WIDTH = 0.56;

/** Estimated rendered width of `text` at `fontSize` px. */
export function estimateTextWidth(text: string, fontSize: number): number {
	return text.length * fontSize * CHAR_WIDTH;
}

/**
 * Greedy word wrap to `maxWidth` px. A single word longer than the line is
 * kept whole on its own line.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (line && estimateTextWidth(next, fontSize) > maxWidth) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines;
}

// ---------------------------------------------------------------------------
// Axis and markers
// ---------------------------------------------------------------------------

/** Decade ticks (every 10 years, or 20 when decades would be closer than `minGap` px). */
export function yearTicks(start: number, end: number, innerWidth: number, minGap = 44): number[] {
	if (end <= start || innerWidth <= 0) return [];
	const perYear = innerWidth / (end - start);
	const step = perYear * 10 >= minGap ? 10 : 20;
	const ticks: number[] = [];
	for (let y = Math.ceil(start / step) * step; y <= end; y += step) ticks.push(y);
	return ticks;
}

/**
 * Stacks markers into lanes so markers in the same lane are at least
 * `minGap` apart. `xs` need not be sorted; returns the lane of each x.
 */
export function assignLanes(xs: readonly number[], minGap: number): number[] {
	const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x || a.i - b.i);
	const lastX: number[] = [];
	const lanes = new Array<number>(xs.length).fill(0);
	for (const { x, i } of order) {
		let lane = lastX.findIndex((last) => x - last >= minGap);
		if (lane === -1) lane = lastX.length;
		lastX[lane] = x;
		lanes[i] = lane;
	}
	return lanes;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const TIMELINE_METRICS = {
	padLeft: 16,
	padRight: 16,
	/** Room above the first row for the "present" and winter labels. */
	padTop: 26,
	labelSize: 13,
	yearsSize: 12,
	lineHeight: 16,
	/** Gap between an era's name and its years on the same line. */
	yearsGap: 8,
	barHeight: 10,
	labelGap: 4,
	rowGap: 12,
	markerRadius: 9,
	laneGap: 4,
	tickLength: 5,
	axisLabelSize: 11,
	bandLabelSize: 11
} as const;

export interface EraRow {
	era: Era;
	/** Top of the row (label) and bottom (bar). */
	top: number;
	bottom: number;
	barY: number;
	x1: number;
	x2: number;
	toPresent: boolean;
	/** Label lines; `years` goes on the last line when `yearsInline`, else on a line of its own. */
	label: { x: number; firstBaseline: number; lines: string[]; years: string; yearsInline: boolean };
}

export interface Marker<E extends HistoryEvent = HistoryEvent> {
	event: E;
	/** 1-based, in year order. */
	number: number;
	x: number;
	y: number;
	lane: number;
}

export interface Band<W extends Winter = Winter> {
	winter: W;
	x1: number;
	x2: number;
	/** Label drawn above the chart, or null where labels would collide. */
	label: string | null;
	labelX: number;
}

export interface TimelineLayout<E extends HistoryEvent = HistoryEvent, W extends Winter = Winter> {
	width: number;
	height: number;
	left: number;
	right: number;
	start: number;
	end: number;
	/** Top of the plotted area (below the "present" label). */
	plotTop: number;
	axisY: number;
	rows: EraRow[];
	markers: Marker<E>[];
	bands: Band<W>[];
	ticks: { year: number; x: number }[];
	present: { x: number; labelY: number };
}

export interface TimelineOptions<E extends HistoryEvent, W extends Winter> {
	width: number;
	eras: readonly Era[];
	events?: readonly E[];
	winters?: readonly W[];
	start: number;
	/** The year drawn as "present". */
	end: number;
}

/** Positions every mark of the timeline for a chart `width` px wide. */
export function layoutTimeline<E extends HistoryEvent, W extends Winter>(
	options: TimelineOptions<E, W>
): TimelineLayout<E, W> {
	const M = TIMELINE_METRICS;
	const { eras, start, end } = options;
	const events = options.events ?? [];
	const winters = options.winters ?? [];
	const width = Math.max(200, Math.round(options.width));
	const left = M.padLeft;
	const right = width - M.padRight;
	const inner = right - left;
	const x = (year: number) => left + ((year - start) / (end - start)) * inner;

	let y = M.padTop;
	const plotTop = y - 8;
	const rows: EraRow[] = eras.map((era) => {
		const years = formatEraYears(era);
		const nameWidth = estimateTextWidth(era.label, M.labelSize);
		const yearsWidth = estimateTextWidth(years, M.yearsSize);
		let lines: string[];
		let yearsInline: boolean;
		let labelWidth: number;
		if (nameWidth + M.yearsGap + yearsWidth <= inner) {
			lines = [era.label];
			yearsInline = true;
			labelWidth = nameWidth + M.yearsGap + yearsWidth;
		} else {
			lines = wrapText(era.label, inner, M.labelSize);
			const lastWidth = estimateTextWidth(lines[lines.length - 1], M.labelSize);
			yearsInline = lastWidth + M.yearsGap + yearsWidth <= inner;
			labelWidth = Math.max(
				...lines.map((l) => estimateTextWidth(l, M.labelSize)),
				yearsInline ? lastWidth + M.yearsGap + yearsWidth : yearsWidth
			);
		}
		const x1 = x(era.start);
		const x2 = x(eraEnd(era, end));
		const labelX = Math.max(left, Math.min(x1, right - labelWidth));
		const lineCount = lines.length + (yearsInline ? 0 : 1);
		const top = y;
		const barY = top + lineCount * M.lineHeight + M.labelGap;
		const bottom = barY + M.barHeight;
		y = bottom + M.rowGap;
		return {
			era,
			top,
			bottom,
			barY,
			x1,
			x2,
			toPresent: era.end === null,
			label: { x: labelX, firstBaseline: top + 12, lines, years, yearsInline }
		};
	});

	const sorted = [...events].sort((a, b) => a.year - b.year);
	const markerXs = sorted.map((e) => x(e.year));
	const lanes = assignLanes(markerXs, 2 * M.markerRadius + 3);
	const laneCount = lanes.length ? Math.max(...lanes) + 1 : 0;
	const laneStep = 2 * M.markerRadius + M.laneGap;
	const markerTop = y;
	const markers: Marker<E>[] = sorted.map((event, i) => ({
		event,
		number: i + 1,
		x: markerXs[i],
		y: markerTop + M.markerRadius + lanes[i] * laneStep,
		lane: lanes[i]
	}));
	if (laneCount) y = markerTop + laneCount * laneStep + 2;

	const axisY = y;
	const height = axisY + M.tickLength + M.axisLabelSize + 8;

	const ticks = yearTicks(start, end, inner).map((year) => ({ year, x: x(year) }));

	// Winter bands, labelled only when their labels fit side by side.
	const bandLabel = 'AI winter';
	const bandLabelWidth = estimateTextWidth(bandLabel, M.bandLabelSize);
	const presentLabelLeft = x(end) - estimateTextWidth(PRESENT_LABEL, M.axisLabelSize) - 4;
	const centers = winters.map((w) => (x(w.band[0]) + x(w.band[1])) / 2);
	const labelsFit = centers.every(
		(c, i) =>
			c - bandLabelWidth / 2 >= left - M.padLeft &&
			c + bandLabelWidth / 2 <= presentLabelLeft &&
			(i === 0 || c - centers[i - 1] >= bandLabelWidth + 8)
	);
	const bands: Band<W>[] = winters.map((winter, i) => ({
		winter,
		x1: x(winter.band[0]),
		x2: x(winter.band[1]),
		label: labelsFit ? bandLabel : null,
		labelX: centers[i]
	}));

	return {
		width,
		height,
		left,
		right,
		start,
		end,
		plotTop,
		axisY,
		rows,
		markers,
		bands,
		ticks,
		present: { x: x(end), labelY: 12 }
	};
}
