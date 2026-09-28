<!--
@component
A state-space graph (docs/ARCHITECTURE.md §3.2, §5.3): states as circles (or
small squares with the name beside them, as on the Romania map), step costs
on edges, arrows on directed edges, an arrow from nowhere labelled "start",
double outlines on goal states, optional h values, and search status colors.

With `edgeLabel`, every edge is drawn with its own label (actions instead of
costs); parallel edges bend apart and self-loops go to different sides
(`loopSide`). With `nodeBox`, states are boxes and `nodePicture` draws inside
each one (e.g. a vacuum-world state).

Zoom with the buttons, +/− keys, or Ctrl/⌘ + wheel; drag to pan. The view
refits when the graph changes (not when only the highlight changes).
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { GraphEdge, WeightedGraph } from '$lib/theory/graphs';
	import { formatNumber } from './describe';
	import { panBy, zoomAbout, type Camera, type Point } from './geometry';
	import {
		edgeKey,
		fitGraph,
		pathEdgeKeys,
		prepareGraph,
		sceneAt,
		type LoopSide,
		type NodeFrame,
		type NodeShape,
		type SceneLabel,
		type SceneNode
	} from './graph-scene';
	import {
		graphLegend,
		statusWord,
		type GraphHighlight,
		type GraphStatusKey,
		type LegendKey
	} from './legend';
	import StatusLegend from './StatusLegend.svelte';

	interface Props {
		graph: WeightedGraph;
		start?: string;
		goals?: readonly string[];
		/** h(n) by state name, drawn as "h=366" next to each state. */
		heuristic?: Readonly<Record<string, number>>;
		/** Search status by state name; `path` lists states in order. */
		highlight?: GraphHighlight;
		nodeShape?: NodeShape;
		showCosts?: boolean;
		/** Makes states keyboard-focusable buttons. */
		onnodeclick?: (id: string) => void;
		/** A state drawn with a selection ring. */
		selected?: string | null;
		/** Accessible description of the figure (default: a generated summary). */
		ariaLabel?: string;
		/** Height of the drawing in px (the maximum when `autoHeight` is on). */
		height?: number;
		/**
		 * Shrink the drawing to the graph's height when the graph is wider than the
		 * box (narrow screens), instead of leaving empty bands above and below.
		 */
		autoHeight?: boolean;
		/** Show a legend of the status colors in use under the drawing. */
		legend?: boolean;
		/**
		 * Label of each edge (`index` into `graph.edges`), drawn instead of the cost;
		 * null draws none. Every edge is then drawn separately.
		 */
		edgeLabel?: (edge: GraphEdge, index: number) => string | null;
		/** Side of each self-loop (with `edgeLabel`); null picks a free side. */
		loopSide?: (edge: GraphEdge, index: number) => LoopSide | null;
		/** Draw states as boxes of this size in px (smaller when crowded) instead of `nodeShape`. */
		nodeBox?: { width: number; height: number };
		/** Content of each box (with `nodeBox`), drawn in SVG; the state name otherwise. */
		nodePicture?: Snippet<[NodeFrame]>;
		/**
		 * Accessible name of a state (default: its name, h, and `status`, the words
		 * for its highlight such as "being expanded" or "goal state").
		 */
		describeNode?: (id: string, status: readonly string[]) => string;
		/**
		 * The page's own words for statuses, e.g. `{ dropped: 'Overestimates h*' }`
		 * when `highlight.dropped` marks something else than repeated states. They
		 * caption the legend and, with a leading capital lowered, name the states
		 * ("Arad, h = 366, overestimates h*"). Unset keys keep the defaults.
		 */
		statusText?: Partial<Record<LegendKey, string>>;
		class?: string;
	}

	let {
		graph,
		start,
		goals = [],
		heuristic,
		highlight,
		nodeShape = 'circle',
		showCosts = true,
		onnodeclick,
		selected = null,
		ariaLabel,
		height = 420,
		autoHeight = true,
		legend = false,
		edgeLabel,
		loopSide,
		nodeBox,
		nodePicture,
		describeNode,
		statusText,
		class: className
	}: Props = $props();

	const ZOOM_STEP = 1.3;

	const PAD = 12;
	const MIN_HEIGHT = 200;

	let measured = $state(0);
	const width = $derived(measured > 0 ? measured : 640);

	const prep = $derived(
		prepareGraph({
			graph,
			start,
			goals,
			heuristic,
			nodeShape,
			showCosts,
			edgeLabel,
			loopSide,
			nodeBox
		})
	);
	const fitted = $derived(fitGraph(prep, { width, height }));
	const fittedScene = $derived(sceneAt(prep, fitted.k));
	/** Height of the fitted drawing, labels included. */
	const needed = $derived.by(() => {
		let y0 = Infinity;
		let y1 = -Infinity;
		for (const n of fittedScene.nodes) {
			y0 = Math.min(y0, n.y - n.ext.top);
			y1 = Math.max(y1, n.y + n.ext.bottom);
		}
		return y1 > y0 ? y1 - y0 + 2 * PAD : height;
	});
	const canvasHeight = $derived(
		autoHeight ? Math.min(height, Math.max(MIN_HEIGHT, Math.ceil(needed))) : height
	);
	const vp = $derived({ width, height: canvasHeight });

	/** The user's pan/zoom, kept while the graph's structure stays the same. */
	let user = $state<{ signature: string; cam: Camera } | null>(null);
	const cam = $derived(user && user.signature === prep.signature ? user.cam : fitted);
	const k = $derived(cam.k);
	const scene = $derived(k === fitted.k ? fittedScene : sceneAt(prep, k));
	const tx = $derived(Math.round((width / 2 - cam.cx * k) * 100) / 100);
	const ty = $derived(Math.round((canvasHeight / 2 - cam.cy * k) * 100) / 100);
	const zoomed = $derived(user !== null && user.signature === prep.signature);
	const minK = $derived(fitted.k * 0.5);
	const maxK = $derived(Math.max(fitted.k * 6, 2.5));

	const hl = $derived.by(() => {
		const h = highlight ?? {};
		const path = h.path ?? [];
		return {
			current: h.current ?? null,
			frontier: new Set(h.frontier ?? []),
			explored: new Set(h.explored ?? []),
			path: new Set(path),
			dropped: new Set(h.dropped ?? []),
			cutoff: new Set(h.cutoff ?? []),
			pathEdges: pathEdgeKeys(path, graph.directed)
		};
	});
	const goalSet = $derived(new Set(goals));
	const onPath = (from: string, to: string) => hl.pathEdges.has(edgeKey(from, to));
	const plainEdges = $derived(scene.edges.filter((e) => !onPath(e.from, e.to)));
	const pathEdges = $derived(scene.edges.filter((e) => onPath(e.from, e.to)));

	function statusWords(id: string): string[] {
		const words: string[] = [];
		const word = (key: GraphStatusKey) => statusWord(key, statusText);
		if (hl.current === id) words.push(word('current'));
		if (hl.path.has(id)) words.push(word('path'));
		if (hl.frontier.has(id)) words.push(word('frontier'));
		if (hl.explored.has(id)) words.push(word('explored'));
		if (hl.dropped.has(id)) words.push(word('dropped'));
		if (hl.cutoff.has(id)) words.push(word('cutoff'));
		if (goalSet.has(id)) words.push(word('goal'));
		if (prep.start === id) words.push('start state');
		return words;
	}

	function nodeLabel(id: string): string {
		const h = heuristic?.[id];
		if (describeNode) return describeNode(id, statusWords(id));
		return [id, h !== undefined ? `h = ${formatNumber(h)}` : null, ...statusWords(id)]
			.filter(Boolean)
			.join(', ');
	}

	const summary = $derived.by(() => {
		const n = graph.nodes.length;
		const m = prep.edges.length;
		const parts = [
			`State graph with ${n} ${n === 1 ? 'state' : 'states'} and ${m} ${graph.directed ? 'directed ' : ''}${m === 1 ? 'edge' : 'edges'}`
		];
		if (prep.start) parts.push(`start ${prep.start}`);
		if (goals.length) parts.push(`${goals.length === 1 ? 'goal' : 'goals'} ${goals.join(', ')}`);
		if (hl.current) parts.push(`being expanded: ${hl.current}`);
		if (highlight?.path?.length) parts.push(`solution path ${highlight.path.join(' → ')}`);
		return `${parts.join('; ')}.`;
	});

	const legendItems = $derived(
		legend
			? graphLegend(highlight, { goals, heuristic: heuristic !== undefined && scene.showH })
			: []
	);

	// ---------------------------------------------------------------------
	// Zoom and pan
	// ---------------------------------------------------------------------

	function setCamera(next: Camera) {
		user = { signature: prep.signature, cam: next };
	}

	function zoomAt(factor: number, about: Point = { x: width / 2, y: canvasHeight / 2 }) {
		const target = Math.min(maxK, Math.max(minK, k * factor));
		if (Math.abs(target - k) < 1e-9) return;
		setCamera(zoomAbout(cam, vp, target / k, about));
	}

	function fit() {
		user = null;
	}

	// A different graph starts from "fit"; coming back to this one later does too.
	$effect(() => {
		const signature = prep.signature;
		untrack(() => {
			if (user && user.signature !== signature) user = null;
		});
	});

	let svgEl = $state<SVGSVGElement>();
	let panning = $state(false);
	let drag: { id: number; x: number; y: number; moved: boolean } | null = null;
	let pinch: { dist: number; k: number } | null = null;
	// Active pointers by id (plain bookkeeping for pinch gestures, not rendered).
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const pointers = new Map<number, Point>();

	function localPoint(clientX: number, clientY: number): Point {
		const r = svgEl?.getBoundingClientRect();
		if (!r || r.width === 0) return { x: width / 2, y: canvasHeight / 2 };
		return {
			x: ((clientX - r.left) * width) / r.width,
			y: ((clientY - r.top) * canvasHeight) / r.height
		};
	}

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), k };
			drag = null;
			panning = false;
			return;
		}
		if (pointers.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
	}

	function onPointerMove(e: PointerEvent) {
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinch && pointers.size >= 2) {
			const [a, b] = [...pointers.values()];
			const d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
			const mid = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
			zoomAt((pinch.k * (d / pinch.dist)) / k, mid);
			e.preventDefault();
			return;
		}
		if (!drag || drag.id !== e.pointerId) return;
		const dx = e.clientX - drag.x;
		const dy = e.clientY - drag.y;
		if (!drag.moved) {
			if (Math.hypot(dx, dy) < (e.pointerType === 'touch' ? 8 : 4)) return;
			drag.moved = true;
			panning = true;
			svgEl?.setPointerCapture(e.pointerId);
		}
		const r = svgEl?.getBoundingClientRect();
		const scale = r && r.width > 0 ? width / r.width : 1;
		setCamera(panBy(cam, dx * scale, dy * scale));
		drag.x = e.clientX;
		drag.y = e.clientY;
	}

	function onPointerEnd(e: PointerEvent) {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinch = null;
		if (drag && drag.id === e.pointerId) {
			drag = null;
			panning = false;
		}
	}

	function onWheel(e: WheelEvent) {
		if (!(e.ctrlKey || e.metaKey)) return;
		e.preventDefault();
		const unitPx = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
		// Trackpad pinches arrive as small ctrl+wheel deltas; mouse notches are ~100.
		const raw = Math.exp(-e.deltaY * unitPx * (e.ctrlKey ? 0.01 : 0.002));
		zoomAt(Math.min(Math.max(raw, 0.8), 1.25), localPoint(e.clientX, e.clientY));
	}

	$effect(() => {
		const el = svgEl;
		if (!el) return;
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	function onKeyDown(e: KeyboardEvent) {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		switch (e.key) {
			case '+':
			case '=':
				zoomAt(ZOOM_STEP);
				break;
			case '-':
			case '_':
				zoomAt(1 / ZOOM_STEP);
				break;
			case '0':
				fit();
				break;
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				const step = e.shiftKey ? 120 : 40;
				const dx = e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0;
				const dy = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
				setCamera(panBy(cam, dx, dy));
				break;
			}
			default:
				return;
		}
		e.preventDefault();
	}

	/**
	 * The keys above, as a native listener on the component: it runs before a
	 * page's own shortcuts on an ancestor (Svelte delegates `onkeydown` to the
	 * document root, which would run it after them), and a handled key is
	 * marked with preventDefault so those shortcuts skip it.
	 */
	const ownKeys: Attachment<HTMLElement> = (node) => {
		node.addEventListener('keydown', onKeyDown);
		return () => node.removeEventListener('keydown', onKeyDown);
	};

	function activate(id: string) {
		onnodeclick?.(id);
	}

	function onNodeKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			activate(id);
		}
	}

	// ---------------------------------------------------------------------
	// Drawing helpers
	// ---------------------------------------------------------------------

	function nodeClasses(id: string) {
		return {
			square: nodeShape === 'square' && !nodeBox,
			box: nodeBox !== undefined,
			current: hl.current === id,
			path: hl.path.has(id),
			frontier: hl.frontier.has(id),
			explored: hl.explored.has(id),
			dropped: hl.dropped.has(id),
			cutoff: hl.cutoff.has(id),
			goal: goalSet.has(id),
			selected: selected === id
		};
	}

	/** Outline rectangle of a node grown by `g` px (circles and pills use rx; squares are sharp). */
	function rectOf(n: SceneNode, g = 0) {
		const o = n.outline;
		if (o.kind === 'rect') {
			return {
				x: n.x - o.halfW - g,
				y: n.y - o.halfH - g,
				width: 2 * (o.halfW + g),
				height: 2 * (o.halfH + g),
				rx: 2 + g / 2
			};
		}
		if (o.kind === 'square') {
			const h = o.half + g;
			return { x: n.x - h, y: n.y - h, width: 2 * h, height: 2 * h, rx: g > 0 ? 1.5 : 0.5 };
		}
		return {
			x: n.x - o.halfW - g,
			y: n.y - o.r - g,
			width: 2 * (o.halfW + g),
			height: 2 * (o.r + g),
			rx: o.r + g
		};
	}

	/** Squares grow a little when they carry a status, so the color reads at map scale. */
	function markerGrow(id: string): number {
		if (nodeShape !== 'square' || nodeBox) return 0;
		return hl.current === id || hl.path.has(id) || hl.frontier.has(id) ? 1.5 : 0;
	}
</script>

{#snippet nodeBody(n: SceneNode)}
	{@const grow = markerGrow(n.id)}
	{@const ringGap = n.outline.kind === 'square' ? 3 + grow : 4}
	{@const ringed = hl.dropped.has(n.id) || hl.cutoff.has(n.id)}
	{@const focusGap = ringGap + (goalSet.has(n.id) ? 4 : 3) + (ringed ? 3 : 0)}
	<rect class="focus-ring" {...rectOf(n, focusGap)} />
	{#if selected === n.id}<rect class="select-ring" {...rectOf(n, focusGap)} />{/if}
	{#if ringed}
		<!-- A dashed ring: the state's node was not added, or was cut off at the depth limit. -->
		<rect class="drop-ring" {...rectOf(n, ringGap + (goalSet.has(n.id) ? 3.5 : 0))} />
	{/if}
	{#if goalSet.has(n.id)}<rect class="goal-ring" {...rectOf(n, ringGap)} />{/if}
	<rect class="shape" {...rectOf(n, grow)} />
	{#if onnodeclick && n.outline.kind === 'square' && !n.label.hidden}
		<!-- The name beside a small marker is part of the click target. -->
		<rect class="hit" {...n.label.box} />
	{/if}
	{#if n.outline.kind === 'rect' && nodePicture}
		{@const o = n.outline}
		<g class="picture">
			{@render nodePicture({
				id: n.id,
				x: n.x - o.halfW,
				y: n.y - o.halfH,
				width: 2 * o.halfW,
				height: 2 * o.halfH
			})}
		</g>
	{:else if n.outline.kind !== 'square'}{@render labelText(n, n.label)}{/if}
{/snippet}

{#snippet labelText(n: SceneNode, label: SceneLabel)}
	{#each label.lines as line, i (i)}
		<text
			class={['label', line.kind, { outside: n.outline.kind === 'square' || line.kind === 'h' }]}
			x={line.x}
			y={line.y}
			text-anchor={label.anchor}
			font-size={line.kind === 'name' ? n.fontSize : scene.fonts.h}>{line.text}</text
		>
	{/each}
{/snippet}

<div class={['state-graph', className]} {@attach ownKeys}>
	<div class="canvas" style:height="{canvasHeight}px" bind:clientWidth={measured}>
		<svg
			bind:this={svgEl}
			class={['drawing', { panning, zoomed }]}
			viewBox="0 0 {width} {canvasHeight}"
			width="100%"
			height={canvasHeight}
			role={onnodeclick ? 'group' : 'img'}
			aria-label={ariaLabel ?? summary}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerEnd}
			onpointercancel={onPointerEnd}
			onlostpointercapture={onPointerEnd}
		>
			<g transform="translate({tx} {ty})">
				<g class="edges" aria-hidden="true">
					{#each plainEdges as e (e.key)}
						<g class="edge">
							<path class="line" d={e.d} />
							{#if e.head}<path class="head" d={e.head} />{/if}
						</g>
					{/each}
					{#each pathEdges as e (e.key)}
						<g class="edge on-path">
							<path class="line" d={e.d} />
							{#if e.headBold}<path class="head" d={e.headBold} />{/if}
						</g>
					{/each}
				</g>
				{#if scene.start}
					<g class="start" aria-hidden="true">
						<path class="line" d={scene.start.d} />
						<path class="head" d={scene.start.head} />
						<text
							class="start-label"
							x={scene.start.label.x}
							y={scene.start.label.y}
							text-anchor={scene.start.label.anchor}>start</text
						>
					</g>
				{/if}
				<g class={['costs', { actions: edgeLabel !== undefined }]} aria-hidden="true">
					{#each scene.edges as e (e.key)}
						{#if e.label}
							<rect
								class="cost-bg"
								x={e.label.x - e.label.width / 2}
								y={e.label.y - scene.fonts.cost * 0.62}
								width={e.label.width}
								height={scene.fonts.cost * 1.24}
								rx="3"
							/>
							<text
								class={['cost', { 'on-path': onPath(e.from, e.to) }]}
								x={e.label.x}
								y={e.label.y}
								font-size={scene.fonts.cost}>{e.label.text}</text
							>
						{/if}
					{/each}
				</g>
				<g class="nodes">
					{#each scene.nodes as n (n.id)}
						{#if onnodeclick}
							<g
								class={['node', 'interactive', nodeClasses(n.id)]}
								role="button"
								tabindex="0"
								aria-label={nodeLabel(n.id)}
								aria-pressed={selected !== null ? selected === n.id : undefined}
								onclick={() => activate(n.id)}
								onkeydown={(e) => onNodeKey(e, n.id)}
							>
								{@render nodeBody(n)}
							</g>
						{:else}
							<g class={['node', nodeClasses(n.id)]} aria-hidden="true">
								{@render nodeBody(n)}
							</g>
						{/if}
					{/each}
				</g>
				<!-- Names beside markers and h values sit above every marker. Names left out
				     for lack of room are still drawn for the states in focus. -->
				<g class="labels" aria-hidden="true">
					{#each scene.nodes as n (n.id)}
						{@const outside = n.outline.kind === 'square'}
						{@const focus =
							hl.current === n.id || hl.path.has(n.id) || hl.cutoff.has(n.id) || selected === n.id}
						{#if (outside && (!n.label.hidden || focus)) || (n.h && !n.h.hidden)}
							<g class={['node', nodeClasses(n.id)]}>
								{#if outside && (!n.label.hidden || focus)}{@render labelText(n, n.label)}{/if}
								{#if n.h && !n.h.hidden}{@render labelText(n, n.h)}{/if}
							</g>
						{/if}
					{/each}
				</g>
			</g>
		</svg>
	</div>
	<div class="toolbar">
		{#if legendItems.length}
			<StatusLegend
				class="graph-legend"
				items={legendItems}
				labels={statusText}
				shape={nodeShape === 'square' && !nodeBox ? 'square' : 'circle'}
			/>
		{/if}
		<div class="zoombar" role="group" aria-label="Zoom (arrow keys pan)">
			<IconButton
				icon="plus"
				size="sm"
				label="Zoom in"
				shortcut="+"
				aria-keyshortcuts="+"
				aria-disabled={k >= maxK - 1e-9}
				onclick={() => zoomAt(ZOOM_STEP)}
			/>
			<IconButton
				icon="minus"
				size="sm"
				label="Zoom out"
				shortcut="−"
				aria-keyshortcuts="-"
				aria-disabled={k <= minK + 1e-9}
				onclick={() => zoomAt(1 / ZOOM_STEP)}
			/>
			<IconButton
				icon="fit"
				size="sm"
				label="Fit to view"
				shortcut="0"
				aria-keyshortcuts="0"
				aria-disabled={!zoomed}
				onclick={fit}
			/>
		</div>
	</div>
</div>

<style>
	.state-graph {
		--graph-bg: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.canvas {
		position: relative;
		width: 100%;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--graph-bg);
	}
	.drawing {
		display: block;
		width: 100%;
		cursor: grab;
		touch-action: pan-y;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.drawing.zoomed {
		touch-action: none;
	}
	.drawing.panning {
		cursor: grabbing;
	}

	/* ---------- edges ---------- */
	.edge .line,
	.start .line {
		fill: none;
		stroke: var(--edge);
		stroke-width: 1.4;
		stroke-linecap: round;
		transition:
			stroke var(--duration) var(--ease),
			stroke-width var(--duration) var(--ease);
	}
	.edge .head,
	.start .head {
		fill: var(--edge);
	}
	.edge.on-path .line {
		stroke: var(--accept);
		stroke-width: 3.5;
	}
	.edge.on-path .head {
		fill: var(--accept);
	}

	/* ---------- text ---------- */
	.cost,
	.start-label,
	.label.outside {
		paint-order: stroke;
		stroke: var(--graph-bg);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.cost-bg {
		fill: var(--graph-bg);
	}
	.cost {
		font-family: var(--font-sans);
		fill: var(--text-2);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.cost.on-path {
		fill: var(--accept);
		font-weight: 600;
	}
	.actions .cost {
		fill: var(--text);
		font-weight: 600;
	}
	.start-label {
		font-family: var(--font-sans);
		font-size: 11.5px;
		font-style: italic;
		fill: var(--text-3);
		dominant-baseline: central;
	}
	.label {
		font-family: var(--font-sans);
		font-weight: 500;
		fill: var(--text);
		dominant-baseline: central;
		pointer-events: none;
	}
	.label.name:not(.outside) {
		text-anchor: middle;
	}
	.label.h {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-weight: 500;
		fill: var(--heuristic);
	}

	/* ---------- nodes ---------- */
	.node .shape {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.5;
		transition:
			fill var(--duration) var(--ease),
			stroke var(--duration) var(--ease),
			stroke-width var(--duration) var(--ease);
	}
	.node .goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.5;
	}
	.node .drop-ring {
		fill: none;
		stroke: var(--reject);
		stroke-width: 1.6;
		stroke-dasharray: 4 3;
	}
	.node .hit {
		fill: transparent;
	}
	.node .focus-ring,
	.node .select-ring {
		fill: none;
		stroke-width: 2;
	}
	.node .focus-ring {
		stroke: var(--focus);
		opacity: 0;
	}
	.node .select-ring {
		stroke: var(--accent);
		stroke-dasharray: 5 3;
	}
	.node.explored .shape {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.node.frontier .shape {
		stroke: var(--info);
		stroke-width: 2.5;
	}
	.node.current .shape {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.75;
	}
	.node.current .label.name {
		font-weight: 650;
	}
	.node.current .label.name.outside {
		fill: color-mix(in srgb, var(--active) 55%, var(--text));
	}
	/* The solution path wins over "current": at the goal step the goal is both. */
	.node.path .shape {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 2.5;
	}
	.node.path .label.name.outside {
		fill: var(--accept);
		font-weight: 650;
	}

	/* Romania-map markers are small: solid status fills. */
	.node.square.explored .shape {
		fill: var(--explored);
	}
	.node.square.frontier .shape {
		fill: var(--info-soft);
		stroke-width: 2.2;
	}
	/* Tree search: a state can be expanded and on the frontier again. */
	.node.square.frontier.explored .shape {
		fill: var(--explored);
	}
	.node.square.current .shape {
		fill: var(--active);
	}
	.node.square.path .shape {
		fill: var(--accept);
	}

	.node.interactive {
		cursor: pointer;
		outline: none;
	}
	.node.interactive:hover .shape {
		stroke-width: 2.5;
	}
	.node.interactive:focus-visible .focus-ring {
		opacity: 1;
	}

	/* ---------- toolbar ---------- */
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		min-width: 0;
	}
	.zoombar {
		display: flex;
		gap: 1px;
		margin-left: auto;
		padding: 1px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.state-graph :global(.graph-legend) {
		flex: 1 1 16rem;
		padding: 0 2px;
	}
</style>
