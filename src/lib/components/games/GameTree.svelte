<!--
@component
A game tree drawn as on the slides (Games and Adversarial Search, slides
9–19): MAX nodes as up-pointing triangles, MIN nodes as down-pointing
triangles, terminal utilities underneath, action labels on the edges, MAX /
MIN level labels on the left, and values beside the nodes. Multi-player trees
(slide 13) draw squares in each player's color and tuple boxes. `display` says
what the search has done at the current step: statuses, values and bounds, α
and β, pruned edges, and the best action.

Wide trees scroll inside the component (drag, scroll, or the arrow keys when
focused) and zoom with the buttons, `+` / `-` / `0`, or Ctrl/⌘ + wheel; the
current node is kept in view.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { playerTone, type GameTree } from '$lib/theory/games';
	import {
		MAX_FIT_ZOOM,
		SIDE_FONT,
		crossPath,
		gameTreeScene,
		initialZoom,
		trianglePoints,
		type SceneEdge,
		type SceneNode
	} from './game-tree-scene';
	import { LEGEND_TEXT, hasBounds, legendItems, treeSummary } from './summary';
	import { formatBound, type GameTreeDisplay } from './types';

	interface Props {
		tree: GameTree;
		display: GameTreeDisplay;
		/** Multi-player trees: the player order. */
		order?: readonly number[];
		/** Action labels on the edges. */
		actions?: boolean;
		ariaLabel?: string;
		/** Height limit in px before the tree scrolls vertically. */
		maxHeight?: number;
		legend?: boolean;
		class?: string;
	}

	let {
		tree,
		display,
		order = [],
		actions = true,
		ariaLabel,
		maxHeight = 520,
		legend = true,
		class: className
	}: Props = $props();

	const ZOOM_STEP = 1.25;
	const MIN_ZOOM = 0.15;
	const MAX_ZOOM = 3;

	const scene = $derived(gameTreeScene(tree, { actions, order }));
	const summary = $derived(ariaLabel ?? treeSummary(tree, display, order));
	const items = $derived(legend ? legendItems(display) : []);
	const bounds = $derived(legend && hasBounds(display));

	const statusOf = (id: number) => display.status[id] ?? 'unvisited';

	function nodeClass(n: SceneNode) {
		return [
			'node',
			n.shape,
			statusOf(n.id),
			{
				terminal: n.terminal,
				current: n.id === display.current,
				best: n.id === display.best
			}
		];
	}

	function edgeClass(e: SceneEdge) {
		const st = statusOf(e.child);
		return [
			'edge',
			st,
			{
				emphasis: display.emphasis?.child === e.child,
				best: display.best === e.child
			}
		];
	}

	const tone = (player: number | null) => (player === null ? 0 : playerTone(player));

	// ---------------------------------------------------------------------
	// Zoom, scrolling, and keeping the current node in view
	// ---------------------------------------------------------------------

	let zoom = $state(1);
	let scroller = $state<HTMLDivElement>();
	let svgEl = $state<SVGSVGElement>();
	let viewWidth = $state(0);

	const svgWidth = $derived(Math.max(1, scene.width * zoom));
	const svgHeight = $derived(Math.max(1, scene.height * zoom));
	/** The zoom that fits the whole tree in view (at most MAX_FIT_ZOOM). */
	const fitZoom = $derived(
		scene.width > 0 && viewWidth > 0
			? Math.min(
					MAX_FIT_ZOOM,
					(viewWidth - 4) / (scene.width + scene.levelWidth),
					(maxHeight - 4) / scene.height
				)
			: 1
	);

	/** Set when the zoom buttons, keys, or wheel were used; a new tree clears it. */
	let manual = false;

	function setZoom(next: number, about?: { x: number; y: number }) {
		manual = true;
		const el = scroller;
		const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
		if (!el || Math.abs(z - zoom) < 1e-6) {
			zoom = z;
			return;
		}
		const ax = about?.x ?? el.clientWidth / 2;
		const ay = about?.y ?? el.clientHeight / 2;
		const f = z / zoom;
		const left = (el.scrollLeft + ax) * f - ax;
		const top = (el.scrollTop + ay) * f - ay;
		zoom = z;
		requestAnimationFrame(() => el.scrollTo({ left, top, behavior: 'auto' }));
	}

	function fit() {
		if (scene.width > 0) setZoom(Math.max(MIN_ZOOM, fitZoom));
	}

	// A new tree opens at its fitting zoom (and follows the width until zoomed by hand).
	let fittedScene: unknown = null;
	$effect(() => {
		const sc = scene;
		const w = viewWidth;
		untrack(() => {
			if (sc !== fittedScene) manual = false;
			fittedScene = sc;
			if (!manual && w > 0) zoom = initialZoom(sc.width + sc.levelWidth, sc.height, w, maxHeight);
		});
	});

	$effect(() => {
		const el = scroller;
		const svg = svgEl;
		const id = display.current;
		const z = untrack(() => zoom);
		void scene;
		void viewWidth;
		if (!el || !svg || id === null) return;
		const n = scene.byId.get(id);
		if (!n) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const elRect = el.getBoundingClientRect();
		const svgRect = svg.getBoundingClientRect();
		const x = svgRect.left - elRect.left + el.scrollLeft + n.x * z;
		const y = svgRect.top - elRect.top + el.scrollTop + n.y * z;
		const marginX = Math.min(90, el.clientWidth / 4);
		const marginY = Math.min(60, el.clientHeight / 4);
		let left = el.scrollLeft;
		let top = el.scrollTop;
		if (x < el.scrollLeft + marginX || x > el.scrollLeft + el.clientWidth - marginX)
			left = x - el.clientWidth / 2;
		if (y < el.scrollTop + marginY || y > el.scrollTop + el.clientHeight - marginY)
			top = y - el.clientHeight / 2;
		if (Math.abs(left - el.scrollLeft) > 1 || Math.abs(top - el.scrollTop) > 1)
			el.scrollTo({ left, top, behavior: reduce ? 'auto' : 'smooth' });
	});

	let drag: { id: number; x: number; y: number; moved: boolean } | null = null;
	let dragging = $state(false);

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || e.button !== 0) return;
		drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
	}
	function onPointerMove(e: PointerEvent) {
		const el = scroller;
		if (!drag || drag.id !== e.pointerId || !el) return;
		const dx = e.clientX - drag.x;
		const dy = e.clientY - drag.y;
		if (!drag.moved) {
			if (Math.hypot(dx, dy) < 4) return;
			drag.moved = true;
			dragging = true;
			el.setPointerCapture(e.pointerId);
		}
		el.scrollLeft -= dx;
		el.scrollTop -= dy;
		drag.x = e.clientX;
		drag.y = e.clientY;
	}
	function onPointerEnd(e: PointerEvent) {
		if (drag && drag.id === e.pointerId) {
			drag = null;
			dragging = false;
		}
	}

	function onWheel(e: WheelEvent) {
		if (!(e.ctrlKey || e.metaKey) || !scroller) return;
		e.preventDefault();
		const unitPx = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
		const raw = Math.exp(-e.deltaY * unitPx * (e.ctrlKey ? 0.01 : 0.002));
		const r = scroller.getBoundingClientRect();
		setZoom(zoom * Math.min(Math.max(raw, 0.8), 1.25), {
			x: e.clientX - r.left,
			y: e.clientY - r.top
		});
	}

	$effect(() => {
		const el = scroller;
		if (!el) return;
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	function onKeyDown(e: KeyboardEvent) {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		if (e.key === '+' || e.key === '=') setZoom(zoom * ZOOM_STEP);
		else if (e.key === '-' || e.key === '_') setZoom(zoom / ZOOM_STEP);
		else if (e.key === '0') fit();
		else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target === scroller) {
			const dx = (e.shiftKey ? 160 : 48) * (e.key === 'ArrowLeft' ? -1 : 1);
			scroller?.scrollBy({ left: dx, behavior: 'auto' });
		} else return;
		e.preventDefault();
	}

	/** Native listener, so handled keys are marked before a page's own shortcuts run. */
	const ownKeys: Attachment<HTMLElement> = (node) => {
		node.addEventListener('keydown', onKeyDown);
		return () => node.removeEventListener('keydown', onKeyDown);
	};
</script>

<div class={['game-tree', className]} {@attach ownKeys}>
	<div class="frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class={['scroller', { dragging }]}
			style:max-height="{maxHeight}px"
			bind:this={scroller}
			bind:clientWidth={viewWidth}
			role="region"
			aria-label="Game tree (scrolls)"
			tabindex="0"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerEnd}
			onpointercancel={onPointerEnd}
			onlostpointercapture={onPointerEnd}
		>
			<div class="canvas">
				<!-- MAX / MIN level labels, kept in view while the tree scrolls sideways. -->
				<svg
					class="level-column"
					width={Math.max(1, scene.levelWidth * zoom)}
					height={svgHeight}
					viewBox="0 0 {Math.max(1, scene.levelWidth)} {Math.max(1, scene.height)}"
					aria-hidden="true"
				>
					{#each scene.levels as l (l.depth)}
						<text
							class="level"
							x="16"
							y={l.y}
							style={l.player !== null ? `fill: var(--tok-${tone(l.player)})` : undefined}
							>{l.text}</text
						>
					{/each}
				</svg>
				<svg
					bind:this={svgEl}
					class={['drawing', { compact: scene.compact }]}
					width={svgWidth}
					height={svgHeight}
					viewBox="0 0 {Math.max(1, scene.width)} {Math.max(1, scene.height)}"
					role="img"
					aria-label={summary}
				>
					<g class="edges">
						{#each scene.edges as e (e.child)}
							<line class={edgeClass(e)} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
						{/each}
					</g>
					{#if actions}
						<g class="actions">
							{#each scene.edges as e (e.child)}
								{#if e.label}
									<text
										class={['action', statusOf(e.child), { best: display.best === e.child }]}
										x={e.label.x}
										y={e.label.y}
										text-anchor={e.label.anchor}>{e.label.text}</text
									>
								{/if}
							{/each}
						</g>
					{/if}
					<g class="cuts">
						{#each scene.edges as e (e.child)}
							{#if display.cut.has(e.child)}
								<path class="cut" d={crossPath(e.mid.x, e.mid.y, scene.compact ? 4 : 5.5)} />
							{/if}
						{/each}
					</g>
					<g class="nodes">
						{#each scene.nodes as n (n.id)}
							{@const label = display.labels[n.id]}
							<g class={nodeClass(n)}>
								{#if n.box}
									<rect
										class="shape box"
										x={n.box.x}
										y={n.box.y}
										width={n.box.width}
										height={n.box.height}
										rx="3"
									/>
									{#if n.utility}
										<text class="tuple-in" x={n.x} y={n.y}
											>{#each n.utility.split(',') as part, i (i)}{#if i > 0}<tspan class="comma"
														>,</tspan
													>{/if}<tspan style="fill: var(--tok-{tone(i + 1)})">{part}</tspan
												>{/each}</text
										>
									{/if}
								{:else if n.shape === 'square'}
									<rect
										class="shape square"
										x={n.x - n.halfW}
										y={n.y - n.halfH}
										width={2 * n.halfW}
										height={2 * n.halfH}
										style="--p: var(--tok-{tone(n.player)}); --p-soft: var(--tok-{tone(
											n.player
										)}-soft)"
									/>
									<text class="player-no" x={n.x} y={n.y} style="fill: var(--tok-{tone(n.player)})"
										>{n.player}</text
									>
								{:else}
									<polygon class="shape" points={trianglePoints(n)} />
									{#if n.utility !== null}
										<text class="utility" x={n.x} y={n.utilityY}>{n.utility}</text>
									{/if}
								{/if}
								{#if label}
									<text class={['value', label.kind]} x={n.valueX} y={n.y}
										>{#if label.tuple}{#each label.tuple as part, i (i)}{#if i > 0}<tspan
														class="comma">,</tspan
													>{/if}<tspan style="fill: var(--tok-{tone(i + 1)})"
													>{formatBound(part)}</tspan
												>{/each}{:else}{label.text}{/if}</text
									>
								{/if}
								{#if display.bounds?.node === n.id}
									<text class="side" x={n.sideX} y={n.y - SIDE_FONT * 0.62}
										><tspan class="alpha">α</tspan> = {formatBound(display.bounds.alpha)}</text
									>
									<text class="side" x={n.sideX} y={n.y + SIDE_FONT * 0.72}
										><tspan class="beta">β</tspan> = {formatBound(display.bounds.beta)}</text
									>
								{/if}
							</g>
						{/each}
					</g>
				</svg>
			</div>
		</div>
	</div>
	<div class="toolbar">
		{#if items.length}
			<ul class="legend" aria-label="Legend">
				{#each items as item (item)}
					<li>
						<svg class="swatch" width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
							{#if item === 'best'}
								<line class="swatch-best" x1="2" y1="8" x2="20" y2="8" />
							{:else}
								{#if tree.tuples}
									<rect class={['swatch-shape', item]} x="5" y="2" width="12" height="12" />
								{:else}
									<polygon class={['swatch-shape', item]} points="11,2 18,14 4,14" />
								{/if}
							{/if}
						</svg>
						<span>{LEGEND_TEXT[item]}</span>
					</li>
				{/each}
				{#if bounds}
					<li class="bounds-note">
						<span class="mono">≥v</span> / <span class="mono">≤v</span>: bound on the minimax value
					</li>
				{/if}
			</ul>
		{/if}
		<div class="zoombar" role="group" aria-label="Zoom">
			<IconButton
				icon="plus"
				size="sm"
				label="Zoom in"
				shortcut="+"
				aria-disabled={zoom >= MAX_ZOOM}
				onclick={() => setZoom(zoom * ZOOM_STEP)}
			/>
			<IconButton
				icon="minus"
				size="sm"
				label="Zoom out"
				shortcut="−"
				aria-disabled={zoom <= MIN_ZOOM}
				onclick={() => setZoom(zoom / ZOOM_STEP)}
			/>
			<IconButton
				icon="fit"
				size="sm"
				label="Fit to view"
				shortcut="0"
				aria-disabled={Math.abs(zoom - fitZoom) < 0.01}
				onclick={fit}
			/>
		</div>
	</div>
</div>

<style>
	.game-tree {
		--graph-bg: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.frame {
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--graph-bg);
	}
	.scroller {
		overflow: auto;
		min-height: 80px;
		border-radius: inherit;
		overscroll-behavior-x: contain;
		cursor: grab;
	}
	.scroller.dragging {
		cursor: grabbing;
		user-select: none;
	}
	.scroller:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	.canvas {
		display: flex;
		align-items: flex-start;
		width: max-content;
		min-width: 100%;
	}
	.level-column {
		position: sticky;
		left: 0;
		z-index: 1;
		flex: none;
		display: block;
		font-family: var(--font-sans);
		background: linear-gradient(
			to right,
			var(--graph-bg) 70%,
			color-mix(in srgb, var(--graph-bg) 0%, transparent)
		);
	}
	.drawing {
		flex: none;
		display: block;
		margin: 0 auto;
		font-family: var(--font-sans);
	}

	.level {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		fill: var(--text-3);
		dominant-baseline: central;
	}

	/* Edges */
	.edge {
		stroke: var(--edge);
		stroke-width: 1.4;
		stroke-linecap: round;
	}
	.edge.unvisited {
		stroke: var(--border-strong);
	}
	.edge.pruned,
	.edge.beyond {
		stroke: var(--dead);
		stroke-dasharray: 4 4;
	}
	.edge.pruned {
		opacity: 0.7;
	}
	.edge.emphasis {
		stroke: var(--active);
		stroke-width: 2.6;
	}
	.edge.best {
		stroke: var(--accept);
		stroke-width: 3.2;
	}
	.action {
		font-size: 11px;
		font-weight: 500;
		fill: var(--text-2);
		dominant-baseline: central;
		paint-order: stroke;
		stroke: var(--graph-bg);
		stroke-width: 3.5px;
		stroke-linejoin: round;
	}
	.action.pruned,
	.action.beyond {
		fill: var(--text-3);
		opacity: 0.8;
	}
	.action.best {
		fill: var(--accept);
		font-weight: 700;
	}
	.cut {
		fill: none;
		stroke: var(--reject);
		stroke-width: 2;
		stroke-linecap: round;
	}

	/* Nodes */
	.node .shape {
		fill: var(--surface-3);
		stroke: var(--border-strong);
		stroke-width: 1.4;
		stroke-linejoin: round;
		transition:
			fill var(--duration) var(--ease),
			stroke var(--duration) var(--ease);
	}
	.node.open .shape {
		fill: var(--info-soft);
		stroke: var(--info);
		stroke-width: 2;
	}
	.node.done .shape {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.node.pruned,
	.node.beyond {
		opacity: 0.45;
	}
	.node.pruned .shape,
	.node.beyond .shape {
		fill: var(--node-fill);
		stroke: var(--dead);
		stroke-dasharray: 3 3;
	}
	.node.current .shape {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.6;
	}
	.node.best .shape {
		stroke: var(--accept);
		stroke-width: 2.4;
	}
	.node .shape.square {
		fill: var(--p-soft);
		stroke: var(--p);
	}
	.node.unvisited .shape.square {
		fill: var(--node-fill);
	}
	.node.current .shape.square {
		stroke-width: 3;
		fill: var(--active-soft);
		stroke: var(--active);
	}
	.node .shape.box {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
	}
	.node.unvisited .shape.box {
		stroke: var(--border-strong);
	}
	.node.done .shape.box {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.node.current .shape.box {
		fill: var(--active-soft);
		stroke: var(--active);
	}
	.player-no {
		font-size: 11px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.utility {
		font-size: 14px;
		font-weight: 700;
		fill: var(--text);
		text-anchor: middle;
		dominant-baseline: central;
		font-variant-numeric: tabular-nums;
	}
	.compact .utility {
		font-size: 11px;
	}
	.node.unvisited .utility {
		fill: var(--text-3);
		font-weight: 600;
	}
	.tuple-in {
		font-size: 13px;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.compact .tuple-in {
		font-size: 10px;
	}
	.node.unvisited .tuple-in {
		opacity: 0.7;
	}
	.comma {
		fill: var(--text-3);
	}
	.value {
		font-size: 14px;
		font-weight: 700;
		fill: var(--accent);
		text-anchor: end;
		dominant-baseline: central;
		paint-order: stroke;
		stroke: var(--graph-bg);
		stroke-width: 3px;
		stroke-linejoin: round;
		font-variant-numeric: tabular-nums;
	}
	.value.eval {
		fill: var(--heuristic);
	}
	.node.best .value {
		fill: var(--accept);
	}
	.side {
		font-size: 11px;
		font-weight: 500;
		fill: var(--text);
		dominant-baseline: central;
		paint-order: stroke;
		stroke: var(--graph-bg);
		stroke-width: 3px;
		stroke-linejoin: round;
	}
	.alpha {
		fill: var(--tok-4);
		font-weight: 700;
	}
	.beta {
		fill: var(--tok-0);
		font-weight: 700;
	}

	/* Legend and zoom */
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		min-width: 0;
	}
	.legend {
		display: flex;
		flex: 1 1 16rem;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0 2px;
		list-style: none;
		font-size: var(--text-xs);
		color: var(--text-2);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}
	.swatch {
		flex: none;
	}
	.swatch-shape {
		fill: var(--surface-3);
		stroke: var(--border-strong);
		stroke-width: 1.4;
		stroke-linejoin: round;
	}
	.swatch-shape.current {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2;
	}
	.swatch-shape.open {
		fill: var(--info-soft);
		stroke: var(--info);
		stroke-width: 1.8;
	}
	.swatch-shape.done {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.swatch-shape.pruned,
	.swatch-shape.beyond {
		fill: var(--node-fill);
		stroke: var(--dead);
		stroke-dasharray: 3 2;
	}
	.swatch-best {
		stroke: var(--accept);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.bounds-note .mono {
		color: var(--accent);
		font-weight: 700;
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
</style>
