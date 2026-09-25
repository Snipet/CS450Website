<!--
@component
A small drawing of one element of the search diagrams (docs/ARCHITECTURE.md
§3.2), styled like StateGraph (form "graph") and SearchTree (form "tree")
with the same color tokens. Decorative: the legend text next to it names it.
-->
<script lang="ts" module>
	export type GraphGlyph =
		| 'state'
		| 'map'
		| 'start'
		| 'goal'
		| 'edge'
		| 'directed'
		| 'heuristic'
		| 'current'
		| 'frontier'
		| 'explored'
		| 'dropped'
		| 'path';

	export type TreeGlyph =
		| 'node'
		| 'annotation'
		| 'current'
		| 'frontier'
		| 'expanded'
		| 'goal'
		| 'path'
		| 'dropped'
		| 'cutoff'
		| 'replaced';

	/** Statuses drawn both as a circle and as a Romania-map square. */
	const WITH_SQUARE = new Set<string>(['current', 'frontier', 'explored', 'dropped']);
</script>

<script lang="ts">
	import { arrowHead } from '$lib/components/search/geometry';

	interface Props {
		/** StateGraph (circles, map squares) or SearchTree (pills). */
		form: 'graph' | 'tree';
		kind: GraphGlyph | TreeGlyph;
		/** State name drawn in the glyph. */
		label?: string;
		/** Cost, h value, or annotation text. */
		note?: string;
	}

	let { form, kind, label, note }: Props = $props();

	const R = 16;
	const PILL_H = 26;

	/** Pill around (cx, cy) for a label, grown by `g`. */
	function pill(cx: number, cy: number, text: string, g = 0) {
		const w = Math.max(40, text.length * 7.6 + 22);
		return {
			x: cx - w / 2 - g,
			y: cy - PILL_H / 2 - g,
			width: w + 2 * g,
			height: PILL_H + 2 * g,
			rx: PILL_H / 2 + g
		};
	}
	const halfW = (text: string) => Math.max(40, text.length * 7.6 + 22) / 2;
	/** The triangle the slides put left of the current node. */
	function marker(cx: number, cy: number, text: string) {
		const x = cx - halfW(text) - 3;
		return `M${x - 6} ${cy - 5}L${x} ${cy}L${x - 6} ${cy + 5}Z`;
	}
	function cross(cx: number, cy: number, text: string) {
		const dx = Math.min(halfW(text) - 4, 16);
		const dy = PILL_H / 2 - 5;
		return `M${cx - dx} ${cy - dy}L${cx + dx} ${cy + dy}M${cx + dx} ${cy - dy}L${cx - dx} ${cy + dy}`;
	}

	const START_HEAD = arrowHead({ x: 60.5, y: 30 }, 0);
	const EDGE_HEAD = arrowHead({ x: 82.5, y: 30 }, 0);
</script>

{#if form === 'graph'}
	{@const square = WITH_SQUARE.has(kind)}
	{@const cx = square ? 24 : 60}
	{@const name = label ?? (kind === 'goal' ? 'G' : 'A')}
	<svg class="glyph graph" viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">
		{#if kind === 'start'}
			<path class="line" d="M32 30L54.5 30" />
			<path class="head" d={START_HEAD} />
			<text class="start-label" x="28" y="30">start</text>
			<circle class="shape" cx="78" cy="30" r={R} />
			<text class="name" x="78" y="30">S</text>
		{:else if kind === 'edge' || kind === 'directed'}
			<path class="line" d={kind === 'edge' ? 'M36 30L84 30' : 'M36 30L76 30'} />
			{#if kind === 'directed'}<path class="head" d={EDGE_HEAD} />{/if}
			<text class="cost" x="58" y="30">{note ?? '5'}</text>
			<circle class="shape" cx="20" cy="30" r={R} />
			<text class="name" x="20" y="30">{label ?? 'A'}</text>
			<circle class="shape" cx="100" cy="30" r={R} />
			<text class="name" x="100" y="30">B</text>
		{:else if kind === 'path'}
			<path class="line on-path" d="M36 30L84 30" />
			<g class="node path">
				<circle class="shape" cx="20" cy="30" r={R} />
				<text class="name" x="20" y="30">A</text>
				<circle class="shape" cx="100" cy="30" r={R} />
				<text class="name" x="100" y="30">G</text>
			</g>
		{:else if kind === 'heuristic'}
			<circle class="shape" cx="30" cy="30" r={R} />
			<text class="name" x="30" y="30">{name}</text>
			<text class="h" x="52" y="30">h={note ?? '366'}</text>
		{:else if kind === 'map'}
			<rect class="shape" x="19" y="25" width="10" height="10" />
			<text class="name outside" x="36" y="30">{label ?? 'Arad'}</text>
		{:else}
			<!-- A status, drawn on a circle and on a map square. -->
			<g class={['node', kind]}>
				{#if kind === 'dropped'}<circle class="drop-ring" {cx} cy="30" r={R + 4} />{/if}
				{#if kind === 'goal'}<circle class="goal-ring" {cx} cy="30" r={R + 4} />{/if}
				<circle class="shape" {cx} cy="30" r={R} />
				<text class="name" x={cx} y="30">{name}</text>
			</g>
			{#if square}
				<g class={['node', 'square', kind]}>
					{#if kind === 'dropped'}<rect
							class="drop-ring"
							x="63"
							y="22"
							width="16"
							height="16"
						/>{/if}
					<rect class="shape" x="66" y="25" width="10" height="10" />
					<text class="name outside" x="84" y="30">Arad</text>
				</g>
			{/if}
		{/if}
	</svg>
{:else}
	{@const name = label ?? 'Sibiu'}
	<svg class="glyph tree" viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">
		{#if kind === 'path'}
			<path class="edge on-path" d="M34 25.5C34 38 88 26 88 34.5" />
			<g class="node on-path">
				<rect class="shape" {...pill(34, 14, 'Arad')} />
				<text class="name" x="34" y="14">Arad</text>
			</g>
			<g class="node on-path">
				<rect class="shape" {...pill(88, 46, 'Sibiu')} />
				<text class="name" x="88" y="46">Sibiu</text>
			</g>
		{:else}
			{@const cy = kind === 'annotation' ? 20 : 30}
			<g class={['node', kind]}>
				{#if kind === 'goal'}<rect class="goal-ring" {...pill(62, cy, name, 3.5)} />{/if}
				<rect class="shape" {...pill(62, cy, name)} />
				{#if kind === 'dropped'}<path class="cross" d={cross(62, cy, name)} />{/if}
				<text class="name" x="62" y={cy}>{name}</text>
				{#if kind === 'annotation'}<text class="note" x="62" y="45">{note ?? '393=140+253'}</text
					>{/if}
				{#if kind === 'current' || kind === 'goal'}<path
						class="marker"
						d={marker(62, cy, name)}
					/>{/if}
			</g>
		{/if}
	</svg>
{/if}

<style>
	.glyph {
		display: block;
		flex: none;
		overflow: visible;
	}

	/* ---------- shared text ---------- */
	.name {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 500;
		fill: var(--text);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.name.outside {
		font-size: 12.5px;
		text-anchor: start;
	}

	/* ---------- state-space graph (StateGraph) ---------- */
	.graph .shape {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.5;
	}
	.graph .line {
		fill: none;
		stroke: var(--edge);
		stroke-width: 1.4;
		stroke-linecap: round;
	}
	.graph .line.on-path {
		stroke: var(--accept);
		stroke-width: 3.5;
	}
	.graph .head {
		fill: var(--edge);
	}
	.start-label {
		font-family: var(--font-sans);
		font-size: 11.5px;
		font-style: italic;
		fill: var(--text-3);
		text-anchor: end;
		dominant-baseline: central;
	}
	.cost {
		font-family: var(--font-sans);
		font-size: 12px;
		fill: var(--text-2);
		text-anchor: middle;
		dominant-baseline: central;
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 5px;
		stroke-linejoin: round;
	}
	.h {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: 12px;
		font-weight: 500;
		fill: var(--heuristic);
		dominant-baseline: central;
	}
	.graph .goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.5;
	}
	.graph .drop-ring {
		fill: none;
		stroke: var(--reject);
		stroke-width: 1.6;
		stroke-dasharray: 4 3;
	}
	.graph .explored .shape {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.graph .frontier .shape {
		stroke: var(--info);
		stroke-width: 2.5;
	}
	.graph .current .shape {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.75;
	}
	.graph .current .name {
		font-weight: 650;
	}
	.graph .path .shape {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 2.5;
	}
	/* Map squares: solid status fills. */
	.graph .square.explored .shape {
		fill: var(--explored);
	}
	.graph .square.frontier .shape {
		fill: var(--info-soft);
		stroke-width: 2.2;
	}
	.graph .square.current .shape {
		fill: var(--active);
	}
	.graph .square.current .name {
		fill: color-mix(in srgb, var(--active) 55%, var(--text));
	}

	/* ---------- search tree (SearchTree) ---------- */
	.tree .edge {
		fill: none;
		stroke: var(--edge);
		stroke-width: 1.3;
		stroke-linecap: round;
	}
	.tree .edge.on-path {
		stroke: var(--accept);
		stroke-width: 2.75;
	}
	.tree .shape {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.3;
	}
	.tree .note {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: 11px;
		fill: var(--text-2);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.tree .goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.3;
	}
	.tree .marker {
		fill: var(--active);
	}
	.tree .cross {
		fill: none;
		stroke: var(--reject);
		stroke-width: 1.5;
		stroke-linecap: round;
		opacity: 0.8;
	}
	.tree .frontier .shape {
		stroke: var(--info);
		stroke-width: 2.25;
	}
	.tree .expanded .shape {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.tree .current .shape {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.5;
	}
	.tree .current .name,
	.tree .goal .name {
		font-weight: 650;
	}
	.tree .cutoff .shape {
		fill: var(--reject-soft);
		stroke: var(--reject);
		stroke-dasharray: 4 3;
	}
	.tree .dropped .shape {
		fill: var(--node-fill);
		stroke: var(--reject);
		stroke-dasharray: 4 3;
	}
	.tree .dropped .name {
		fill: var(--text-3);
		paint-order: stroke;
		stroke: var(--node-fill);
		stroke-width: 3px;
		stroke-linejoin: round;
	}
	.tree .replaced {
		opacity: 0.55;
	}
	.tree .replaced .shape {
		stroke: var(--dead);
		stroke-dasharray: 4 3;
	}
	.tree .replaced .name {
		text-decoration: line-through;
	}
	.tree .on-path .shape,
	.tree .goal .shape {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 2.25;
	}
	.tree .goal .marker {
		fill: var(--accept);
	}
</style>
