<!--
@component
Legend for the grid drawing: start, goal, wall, and the search status colors
(docs/ARCHITECTURE.md §3.2).
-->
<script lang="ts">
	interface Props {
		/** Explored cells are shaded by expansion order. */
		shade?: boolean;
	}

	let { shade = true }: Props = $props();
</script>

<ul class="legend" aria-label="Legend">
	<li>
		<svg width="18" height="18" viewBox="0 0 1 1" aria-hidden="true">
			<circle class="start" cx="0.5" cy="0.5" r="0.4" />
		</svg>
		Start
	</li>
	<li>
		<svg width="18" height="18" viewBox="0 0 1 1" aria-hidden="true">
			<circle class="goal-ring" cx="0.5" cy="0.5" r="0.44" />
			<circle class="goal" cx="0.5" cy="0.5" r="0.32" />
		</svg>
		Goal
	</li>
	<li>
		<svg width="18" height="18" viewBox="0 0 1 1" aria-hidden="true">
			<rect class="wall" width="1" height="1" />
		</svg>
		Wall
	</li>
	<li>
		<svg width="18" height="18" viewBox="0 0 1 1" aria-hidden="true">
			<rect class="current" width="1" height="1" />
		</svg>
		Being expanded
	</li>
	<li>
		<svg width="18" height="18" viewBox="0 0 1 1" aria-hidden="true">
			<rect class="frontier" x="0.04" y="0.04" width="0.92" height="0.92" />
		</svg>
		On the frontier
	</li>
	<li>
		<svg width={shade ? 30 : 18} height="18" viewBox="0 0 {shade ? 1.7 : 1} 1" aria-hidden="true">
			{#if shade}
				<rect class="explored" style="--mix: 4%" width="0.9" height="1" />
				<rect class="explored" style="--mix: 32%" x="0.8" width="0.9" height="1" />
			{:else}
				<rect class="explored" style="--mix: 12%" width="1" height="1" />
			{/if}
		</svg>
		Explored{#if shade}<span class="hint">&nbsp;(earlier → later)</span>{/if}
	</li>
	<li>
		<svg width="26" height="18" viewBox="0 0 1.5 1" aria-hidden="true">
			<line class="path" x1="0.15" y1="0.5" x2="1.35" y2="0.5" />
		</svg>
		Solution path
	</li>
</ul>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}
	svg {
		flex: none;
		overflow: visible;
	}
	.start {
		fill: var(--node-stroke);
	}
	.goal {
		fill: var(--accept);
	}
	.goal-ring {
		fill: var(--node-fill);
		stroke: var(--accept);
		stroke-width: 0.07;
	}
	.wall {
		fill: var(--wall);
	}
	.current {
		fill: var(--active);
	}
	.frontier {
		fill: var(--info-soft);
		stroke: var(--info);
		stroke-width: 0.08;
	}
	.explored {
		fill: color-mix(in srgb, var(--explored) var(--mix), var(--explored-soft));
		stroke: var(--border);
		stroke-width: 0.04;
	}
	.path {
		stroke: var(--accept);
		stroke-width: 0.3;
		stroke-linecap: round;
	}
	.hint {
		color: var(--text-3);
	}
</style>
