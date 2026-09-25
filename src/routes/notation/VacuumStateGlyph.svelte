<!--
@component
A two-square vacuum world state as drawn by the vacuum tool: squares A and B,
dirt as dots, the agent as a bar in its square. Decorative.
-->
<script lang="ts">
	interface Props {
		/** The agent's square, 0 for A. */
		location: number;
		/** Whether each square is dirty, left to right. */
		dirt: readonly boolean[];
	}

	let { location, dirt }: Props = $props();
</script>

<svg viewBox="0 0 56 26" width="56" height="26" aria-hidden="true">
	{#each dirt as d, i (i)}
		{@const x = 1 + 27 * i}
		<rect class="cell" {x} y="1" width="27" height="24" />
		{#if d}
			<circle class="dirt" cx={x + 8} cy="19" r="2.4" />
			<circle class="dirt" cx={x + 13.5} cy="20" r="2" />
			<circle class="dirt" cx={x + 18.5} cy="18.5" r="2.4" />
			<circle class="dirt" cx={x + 11} cy="15.5" r="1.7" />
			<circle class="dirt" cx={x + 16} cy="15" r="1.5" />
		{/if}
	{/each}
	<rect class="agent" x={8 + 27 * location} y="5" width="13" height="7" rx="3.5" />
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
	.cell {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1;
	}
	.dirt {
		fill: var(--tok-5);
	}
	.agent {
		fill: var(--node-stroke);
	}
</style>
