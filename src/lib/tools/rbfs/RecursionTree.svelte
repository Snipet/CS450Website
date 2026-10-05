<!--
@component
The recursion tree of an RBFS step, drawn as in Russell & Norvig's Figure
3.27: the open calls with their f_limit in a tag above each node, every
stored successor with its current f (backed-up values marked ↑, values raised
to the parent's f by max(g + h, f(parent)) marked ↓), the current
call highlighted with the slides' arrow marker, and, at a return step, the
successors it forgets. Wide or deep trees scroll inside the component (drag,
scroll, or the arrow keys when focused) and zoom with the buttons or
Ctrl/⌘ + wheel; the current node is kept in view.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import {
		LEGEND_TEXT,
		legendKeys,
		recursionScene,
		sceneSummary,
		type RecursionSceneNode
	} from './tree-scene';
	import type { TreeView } from './view';

	interface Props {
		view: TreeView;
		/** State keys drawn with a goal outline. */
		goals?: readonly string[];
		/** Height limit in px before the tree scrolls vertically. */
		maxHeight?: number;
		legend?: boolean;
	}

	let { view, goals = [], maxHeight = 520, legend = true }: Props = $props();

	const ZOOM_STEP = 1.25;
	const MIN_ZOOM = 0.2;
	const MAX_ZOOM = 3;

	const scene = $derived(recursionScene(view));
	const summary = $derived(sceneSummary(view, scene));
	const goalKeys = $derived(new Set(goals));
	const pathIds = $derived(new Set(view.path));
	const solved = $derived(view.nodes.some((n) => n.status === 'goal'));

	const legendItems = $derived(legendKeys(view));

	function nodeClass(n: RecursionSceneNode) {
		const v = n.node;
		return [
			'node',
			v.status,
			v.role,
			{
				'on-path': v.onSolution && solved,
				'goal-state': goalKeys.has(v.key) && v.status !== 'goal'
			}
		];
	}

	function edgeClass(child: number) {
		const n = scene.byId.get(child)!.node;
		return [
			'edge',
			{
				open: pathIds.has(child) && !solved,
				'on-path': n.onSolution && solved,
				faint: n.status === 'forgotten'
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
	const fits = $derived(viewWidth > 0 && svgWidth <= viewWidth + 1 && svgHeight <= maxHeight + 1);

	function setZoom(next: number) {
		const el = scroller;
		const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
		if (!el || Math.abs(z - zoom) < 1e-6) {
			zoom = z;
			return;
		}
		const ax = el.clientWidth / 2;
		const ay = el.clientHeight / 2;
		const f = z / zoom;
		const left = (el.scrollLeft + ax) * f - ax;
		const top = (el.scrollTop + ay) * f - ay;
		zoom = z;
		requestAnimationFrame(() => el.scrollTo({ left, top, behavior: 'auto' }));
	}

	function fit() {
		const el = scroller;
		if (!el || scene.width === 0) return;
		setZoom(Math.min(1, (el.clientWidth - 4) / scene.width, (maxHeight - 4) / scene.height));
	}

	$effect(() => {
		const el = scroller;
		const svg = svgEl;
		const id = view.current;
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
		setZoom(zoom * Math.min(Math.max(raw, 0.8), 1.25));
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

	/** Native listener so these keys run before the page's step shortcuts (see SearchTree). */
	const ownKeys: Attachment<HTMLElement> = (node) => {
		node.addEventListener('keydown', onKeyDown);
		return () => node.removeEventListener('keydown', onKeyDown);
	};

	const pill = (n: RecursionSceneNode, g = 0) => ({
		x: n.x - n.halfW - g,
		y: n.y - n.halfH - g,
		width: 2 * (n.halfW + g),
		height: 2 * (n.halfH + g),
		rx: n.halfH + g
	});
	const tag = (n: RecursionSceneNode) => ({
		x: n.x - n.limitHalfW,
		y: n.limitY - 8,
		width: 2 * n.limitHalfW,
		height: 16,
		rx: 4
	});
	const marker = (n: RecursionSceneNode) => {
		const x = n.x - n.halfW - 3;
		return `M${x - 6} ${n.y - 5}L${x} ${n.y}L${x - 6} ${n.y + 5}Z`;
	};
</script>

<div class="recursion-tree" {@attach ownKeys}>
	{#if scene.hidden > 0}
		<p class="notice">
			Showing the open calls from depth {scene.fromDepth}; {scene.hidden}
			{scene.hidden === 1 ? 'node' : 'nodes'} above are not drawn.
		</p>
	{/if}
	<div class="frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class={['scroller', { dragging }]}
			style:max-height="{maxHeight}px"
			bind:this={scroller}
			bind:clientWidth={viewWidth}
			role="region"
			aria-label="Recursion tree (scrolls)"
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
					{#each scene.edges as e (e.child)}
						<path class={edgeClass(e.child)} d={e.d} />
					{/each}
				</g>
				<g class="nodes">
					{#each scene.nodes as n (n.id)}
						<g class={nodeClass(n)}>
							{#if n.limitText}
								<rect class="tag" {...tag(n)} />
								<text class="tag-text" x={n.x} y={n.limitY}>{n.limitText}</text>
							{/if}
							{#if n.node.status === 'goal' || goalKeys.has(n.node.key)}
								<rect class="goal-ring" {...pill(n, 3.5)} />
							{/if}
							{#if n.node.role}
								<rect class="role-ring" {...pill(n, n.node.status === 'goal' ? 6.5 : 3.5)} />
							{/if}
							<rect class="shape" {...pill(n)} />
							<text class="name" x={n.x} y={n.y}>{n.label}</text>
							<text class="f" x={n.x} y={n.fY}
								>{#if n.oldText}<tspan class="old">{n.oldText}</tspan>{/if}<tspan
									class={{ backed: n.node.backedUp || n.node.inherited }}
									dx={n.oldText ? 6 : undefined}
									>{n.node.backedUp ? '↑' : n.node.inherited ? '↓' : ''}{n.fText}</tspan
								></text
							>
							{#if n.id === view.current}<path class="marker" d={marker(n)} />{/if}
						</g>
					{/each}
				</g>
			</svg>
		</div>
	</div>
	<div class="toolbar">
		{#if legend && legendItems.length}
			<ul class="legend" aria-label="Legend">
				{#each legendItems as key (key)}
					<li>
						<svg class="swatch" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
							{#if key === 'backed' || key === 'inherited'}
								<text class="sw-backed" x="13" y="9.5">{key === 'backed' ? '↑' : '↓'}</text>
							{:else if key === 'goal'}
								<rect class="sw-goal-ring" x="0.5" y="0.5" width="25" height="17" rx="8.5" />
								<rect class="sw goal" x="3" y="3" width="20" height="12" rx="6" />
							{:else if key === 'best' || key === 'alternative' || key === 'exceeds'}
								<rect class="sw-ring {key}" x="0.5" y="0.5" width="25" height="17" rx="8.5" />
								<rect class="sw" x="4" y="4" width="18" height="10" rx="5" />
							{:else if key === 'limit'}
								<rect class="sw-tag" x="1" y="4" width="24" height="10" rx="3" />
								<text class="sw-tag-text" x="13" y="9.5">447</text>
							{:else}
								<rect class="sw {key}" x="3" y="3" width="20" height="12" rx="6" />
							{/if}
						</svg>
						<span>{LEGEND_TEXT[key]}</span>
					</li>
				{/each}
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
				aria-disabled={fits && zoom >= 1}
				onclick={fit}
			/>
		</div>
	</div>
</div>

<style>
	.recursion-tree {
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
	.edge.open {
		stroke: var(--explored);
		stroke-width: 2.25;
	}
	.edge.on-path {
		stroke: var(--accept);
		stroke-width: 2.75;
	}
	.edge.faint {
		stroke: var(--dead);
		stroke-dasharray: 3 3;
	}

	.tag {
		fill: var(--surface-2);
		stroke: var(--border-strong);
		stroke-width: 1;
	}
	.tag-text {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: 11px;
		fill: var(--text-2);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.node.current .tag {
		fill: var(--active-soft);
		stroke: var(--active);
	}
	.node.current .tag-text {
		fill: var(--text);
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
	.node .f {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: 11px;
		fill: var(--text-2);
		text-anchor: middle;
		dominant-baseline: central;
	}
	.node .f .old {
		fill: var(--text-3);
		text-decoration: line-through;
	}
	.node .f .backed {
		fill: var(--tok-2);
		font-weight: 700;
	}
	.node .goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.3;
	}
	.node.goal-state .goal-ring {
		opacity: 0.75;
	}
	.node .role-ring {
		fill: none;
		stroke-width: 2;
	}
	.node.best .role-ring {
		stroke: var(--active);
	}
	.node.alternative .role-ring {
		stroke: var(--active);
		stroke-dasharray: 4 3;
	}
	.node.exceeds .role-ring {
		stroke: var(--reject);
	}
	.node.exceeds .f {
		fill: var(--reject);
		font-weight: 600;
	}
	.node .marker {
		fill: var(--active);
	}

	.node.stored .shape {
		stroke: var(--info);
		stroke-width: 2;
	}
	.node.open .shape {
		fill: var(--explored-soft);
		stroke: var(--explored);
		stroke-width: 1.6;
	}
	.node.current .shape {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.5;
	}
	.node.current .name {
		font-weight: 650;
	}
	.node.forgotten {
		opacity: 0.6;
	}
	.node.forgotten .shape {
		stroke: var(--dead);
		stroke-dasharray: 4 3;
	}
	.node.forgotten.exceeds {
		opacity: 1;
	}
	.node.forgotten.exceeds .shape {
		stroke: var(--reject);
	}
	.node.on-path .shape,
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
		overflow: visible;
	}
	.sw {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.3;
	}
	.sw.current {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.2;
	}
	.sw.open {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.sw.stored {
		stroke: var(--info);
		stroke-width: 2;
	}
	.sw.forgotten {
		stroke: var(--dead);
		stroke-dasharray: 3 2;
		opacity: 0.8;
	}
	.sw.goal {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 1.6;
	}
	.sw-goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.2;
	}
	.sw-ring {
		fill: none;
		stroke-width: 1.8;
	}
	.sw-ring.best,
	.sw-ring.alternative {
		stroke: var(--active);
	}
	.sw-ring.alternative {
		stroke-dasharray: 3 2;
	}
	.sw-ring.exceeds {
		stroke: var(--reject);
	}
	.sw-tag {
		fill: var(--surface-2);
		stroke: var(--border-strong);
		stroke-width: 1;
	}
	.sw-tag-text {
		fill: var(--text-2);
		font-family: var(--font-mono);
		font-size: 7.5px;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.sw-backed {
		fill: var(--tok-2);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
	}
</style>
