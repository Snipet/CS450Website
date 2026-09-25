<!--
@component
The search tree of a `SearchResult` up to a step (docs/ARCHITECTURE.md §3.2,
§5.3). The tree of the step's IDS iteration is laid out once, so nodes keep
their places while stepping; nodes generated after the step are hidden. Each
node shows its state name and, per `annotation`, g, h, f, or f=g+h underneath.

Wide trees scroll inside the component (drag, scroll, or the arrow keys when
focused) and zoom with the buttons or Ctrl/⌘ + wheel; the current node is
kept in view.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { SearchNode, SearchResult } from '$lib/theory/search';
	import { defaultAnnotation, formatCount, type Annotation } from './describe';
	import { treeLegend } from './legend';
	import StatusLegend from './StatusLegend.svelte';
	import { treeScene, type TreeSceneNode } from './tree-scene';
	import {
		clampStep,
		countStatuses,
		currentNode,
		iterationAt,
		solutionPathAt,
		statusesAt,
		type TreeNodeStatus
	} from './tree-view';

	interface Props {
		result: SearchResult;
		/** Step index into `result.steps`. */
		step: number;
		/** Text under each node (default: what the slides show for the strategy). */
		annotation?: Annotation;
		/** Step costs on the edges. */
		showCosts?: boolean;
		/** Largest number of nodes drawn (the first ones by id). */
		maxNodes?: number;
		/** State keys drawn with a goal outline wherever they appear. */
		goals?: readonly string[];
		/** Display name of a node's state (default: `node.label`). */
		label?: (node: SearchNode) => string;
		ariaLabel?: string;
		/** Height limit in px before the tree scrolls vertically. */
		maxHeight?: number;
		/** Show a legend of the status colors in use under the tree. */
		legend?: boolean;
		class?: string;
	}

	let {
		result,
		step,
		annotation,
		showCosts = false,
		maxNodes = 600,
		goals = [],
		label,
		ariaLabel,
		maxHeight = 560,
		legend = false,
		class: className
	}: Props = $props();

	const ZOOM_STEP = 1.25;
	const MIN_ZOOM = 0.2;
	const MAX_ZOOM = 3;

	const s = $derived(clampStep(result, step));
	const iteration = $derived(iterationAt(result, s));
	const note = $derived(annotation ?? defaultAnnotation(result.strategy));
	// Laid out once per (result, iteration, drawing options): stable while stepping.
	const scene = $derived(
		treeScene(result, iteration, { annotation: note, showCosts, maxNodes, label })
	);
	const shownNodes = $derived.by(() => {
		const out: SearchNode[] = [];
		for (const sn of scene.nodes) out.push(result.nodes[sn.id]);
		return out;
	});
	const statuses = $derived(result.steps.length ? statusesAt(result, s, shownNodes) : new Map());
	const current = $derived(result.steps.length ? currentNode(result, s) : null);
	const path = $derived(result.steps.length ? solutionPathAt(result, s) : new Set<number>());
	const goalKeys = $derived(new Set(goals));
	const counts = $derived(countStatuses(statuses));

	const visibleNodes = $derived(scene.nodes.filter((n) => statuses.has(n.id)));
	const visibleEdges = $derived(scene.edges.filter((e) => statuses.has(e.child)));
	/** Node to keep in view: the current one, else the newest visible one. */
	const focusId = $derived.by(() => {
		if (current !== null && scene.byId.has(current)) return current;
		let best: number | null = null;
		for (const n of visibleNodes) if (best === null || n.id > best) best = n.id;
		return best;
	});

	const summary = $derived.by(() => {
		const parts: string[] = [];
		const lim =
			result.strategy === 'ids' || result.strategy === 'dls' ? ` (depth limit ${iteration})` : '';
		parts.push(
			`Search tree${lim}: ${visibleNodes.length} ${visibleNodes.length === 1 ? 'node' : 'nodes'}`
		);
		if (counts.frontier) parts.push(`${counts.frontier} on the frontier`);
		if (current !== null) parts.push(`current node ${scene.byId.get(current)?.label ?? ''}`);
		if (path.size) parts.push(`solution path highlighted`);
		return `${parts.join('; ')}.`;
	});

	// Nodes on the solution path are drawn in its color, whatever their status.
	const legendItems = $derived.by(() => {
		if (!legend) return [];
		if (!path.size) return treeLegend(counts);
		const shown = [...statuses].filter(([id, st]) => st === 'goal' || !path.has(id));
		return treeLegend(countStatuses(new Map(shown)), { path: true });
	});

	function nodeClass(id: number, status: TreeNodeStatus) {
		const node = result.nodes[id];
		return [
			'node',
			status,
			{
				'on-path': path.has(id),
				'goal-state': goalKeys.has(node.key) && status !== 'goal'
			}
		];
	}

	function edgeClass(child: number) {
		const st = statuses.get(child);
		return [
			'edge',
			{
				'on-path': path.has(child),
				faint: st === 'dropped' || st === 'replaced'
			}
		];
	}

	// ---------------------------------------------------------------------
	// Zoom, scrolling, and keeping the current node in view
	// ---------------------------------------------------------------------

	let zoom = $state(1);
	let scroller = $state<HTMLDivElement>();
	let svgEl = $state<SVGSVGElement>();
	let viewWidth = $state(0);

	const svgWidth = $derived(Math.max(1, scene.width * zoom));
	const svgHeight = $derived(Math.max(1, scene.height * zoom));

	function setZoom(next: number, about?: { x: number; y: number }) {
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
		const el = scroller;
		if (!el || scene.width === 0) return;
		const zw = (el.clientWidth - 4) / scene.width;
		const zh = (maxHeight - 4) / scene.height;
		setZoom(Math.min(1, zw, zh));
	}

	const fits = $derived(viewWidth > 0 && svgWidth <= viewWidth + 1 && svgHeight <= maxHeight + 1);

	$effect(() => {
		const el = scroller;
		const svg = svgEl;
		const id = focusId;
		// Re-run when the step, the layout, or the available width changes, not on
		// zoom (zooming keeps the point under the pointer or the view center).
		const z = untrack(() => zoom);
		void s;
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
		const marginX = Math.min(80, el.clientWidth / 4);
		const marginY = Math.min(60, el.clientHeight / 4);
		let left = el.scrollLeft;
		let top = el.scrollTop;
		if (
			x - n.halfW * z < el.scrollLeft + marginX ||
			x + n.halfW * z > el.scrollLeft + el.clientWidth - marginX
		)
			left = x - el.clientWidth / 2;
		if (y < el.scrollTop + marginY || y > el.scrollTop + el.clientHeight - marginY)
			top = y - el.clientHeight / 2;
		if (Math.abs(left - el.scrollLeft) > 1 || Math.abs(top - el.scrollTop) > 1)
			el.scrollTo({ left, top, behavior: reduce ? 'auto' : 'smooth' });
	});

	// Mouse drag scrolls the tree; touch uses native scrolling.
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
			// ← → scroll the tree while it has focus, as ↑ ↓ do (elsewhere a page may
			// use them for stepping).
			const dx = (e.shiftKey ? 160 : 48) * (e.key === 'ArrowLeft' ? -1 : 1);
			scroller?.scrollBy({ left: dx, behavior: 'auto' });
		} else return;
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

	/** Pill outline grown by `g` px. */
	const pill = (n: TreeSceneNode, g = 0) => ({
		x: n.x - n.halfW - g,
		y: n.y - n.halfH - g,
		width: 2 * (n.halfW + g),
		height: 2 * (n.halfH + g),
		rx: n.halfH + g
	});
	/** The marker the slides put left of the current node. */
	const marker = (n: TreeSceneNode) => {
		const x = n.x - n.halfW - 3;
		return `M${x - 6} ${n.y - 5}L${x} ${n.y}L${x - 6} ${n.y + 5}Z`;
	};
	/** A cross over a dropped node. */
	const cross = (n: TreeSceneNode) => {
		const dx = Math.min(n.halfW - 4, 16);
		const dy = n.halfH - 5;
		return `M${n.x - dx} ${n.y - dy}L${n.x + dx} ${n.y + dy}M${n.x + dx} ${n.y - dy}L${n.x - dx} ${n.y + dy}`;
	};
</script>

<div class={['search-tree', className]} {@attach ownKeys}>
	{#if scene.shown < scene.total}
		<p class="notice">
			Showing the first {formatCount(scene.shown)} of {formatCount(scene.total)} nodes{result.strategy ===
			'ids'
				? ' in this iteration'
				: ''}.
		</p>
	{/if}
	{#if result.steps.length === 0}
		<p class="notice">This search was run without a step trace.</p>
	{:else}
		<div class="frame">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class={['scroller', { dragging }]}
				style:max-height="{maxHeight}px"
				bind:this={scroller}
				bind:clientWidth={viewWidth}
				role="region"
				aria-label={ariaLabel ?? 'Search tree'}
				tabindex="0"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerEnd}
				onpointercancel={onPointerEnd}
				onlostpointercapture={onPointerEnd}
			>
				<svg
					bind:this={svgEl}
					class="drawing"
					width={svgWidth}
					height={svgHeight}
					viewBox="0 0 {Math.max(1, scene.width)} {Math.max(1, scene.height)}"
					role="img"
					aria-label={summary}
				>
					<g class="edges">
						{#each visibleEdges as e (e.child)}
							<path class={edgeClass(e.child)} d={e.d} />
						{/each}
					</g>
					{#if showCosts}
						<g class="costs">
							{#each visibleEdges as e (e.child)}
								{#if e.cost}
									<text class={['cost', { 'on-path': path.has(e.child) }]} x={e.cost.x} y={e.cost.y}
										>{e.cost.text}</text
									>
								{/if}
							{/each}
						</g>
					{/if}
					<g class="nodes">
						{#each visibleNodes as n (n.id)}
							{@const status = statuses.get(n.id) ?? 'generated'}
							<g class={nodeClass(n.id, status)}>
								{#if status === 'goal' || goalKeys.has(result.nodes[n.id].key)}
									<rect class="goal-ring" {...pill(n, 3.5)} />
								{/if}
								<rect class="shape" {...pill(n)} />
								{#if status === 'dropped'}<path class="cross" d={cross(n)} />{/if}
								<text class="name" x={n.x} y={n.y}>{n.label}</text>
								{#if n.note}<text class="note" x={n.x} y={n.noteY}>{n.note}</text>{/if}
								{#if n.id === current}<path class="marker" d={marker(n)} />{/if}
							</g>
						{/each}
					</g>
				</svg>
			</div>
		</div>
	{/if}
	<div class="toolbar">
		{#if legendItems.length}
			<StatusLegend class="tree-legend" items={legendItems} shape="pill" />
		{/if}
		{#if result.steps.length}
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
					aria-disabled={fits && zoom >= 1}
					onclick={fit}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.search-tree {
		--graph-bg: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.notice {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-3);
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
	.drawing {
		display: block;
		margin: 0 auto;
	}

	.edge {
		fill: none;
		stroke: var(--edge);
		stroke-width: 1.3;
		stroke-linecap: round;
	}
	.edge.faint {
		stroke: var(--dead);
		stroke-dasharray: 3 3;
	}
	.edge.on-path {
		stroke: var(--accept);
		stroke-width: 2.75;
	}
	.cost {
		font-family: var(--font-sans);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		fill: var(--text-3);
		text-anchor: middle;
		dominant-baseline: central;
		paint-order: stroke;
		stroke: var(--graph-bg);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.cost.on-path {
		fill: var(--accept);
		font-weight: 600;
	}

	.node .shape {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.3;
		transition:
			fill var(--duration) var(--ease),
			stroke var(--duration) var(--ease);
	}
	.node .name {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 500;
		fill: var(--text);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.node .note {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: 11px;
		fill: var(--text-2);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.node .goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.3;
	}
	.node.goal-state .goal-ring {
		opacity: 0.75;
	}
	.node .marker {
		fill: var(--active);
	}
	.node .cross {
		fill: none;
		stroke: var(--reject);
		stroke-width: 1.5;
		stroke-linecap: round;
	}

	.node.frontier .shape {
		stroke: var(--info);
		stroke-width: 2.25;
	}
	.node.expanded .shape {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.node.current .shape {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.5;
	}
	.node.current .name {
		font-weight: 650;
	}
	.node.cutoff .shape {
		fill: var(--reject-soft);
		stroke: var(--reject);
		stroke-dasharray: 4 3;
	}
	.node.dropped .shape {
		fill: var(--node-fill);
		stroke: var(--reject);
		stroke-dasharray: 4 3;
	}
	.node.dropped .name,
	.node.dropped .note {
		fill: var(--text-3);
	}
	/* The name stays legible over the cross. */
	.node.dropped .name {
		paint-order: stroke;
		stroke: var(--node-fill);
		stroke-width: 3px;
		stroke-linejoin: round;
	}
	.node.dropped .cross {
		opacity: 0.8;
	}
	.node.replaced {
		opacity: 0.55;
	}
	.node.replaced .shape {
		stroke: var(--dead);
		stroke-dasharray: 4 3;
	}
	.node.replaced .name,
	.node.replaced .note {
		text-decoration: line-through;
	}
	.node.on-path .shape {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 2.25;
	}
	.node.goal .shape {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 2.25;
	}
	.node.goal .name {
		font-weight: 650;
	}
	.node.goal .marker {
		fill: var(--accept);
	}

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
	.search-tree :global(.tree-legend) {
		flex: 1 1 16rem;
		padding: 0 2px;
	}
</style>
