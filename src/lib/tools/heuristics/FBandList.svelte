<!--
@component
The nodes an A* run took off the frontier, in order, grouped by f(n)
against C* (Informed Search, slide 30).
-->
<script lang="ts">
	import { formatValue } from './edit';
	import type { FBands, PoppedNode } from './analysis';

	interface Props {
		bands: FBands;
		cStar: number;
	}

	let { bands, cStar }: Props = $props();

	const groups = $derived([
		{ key: 'below', label: 'f(n) < C*', nodes: bands.below },
		{ key: 'equal', label: 'f(n) = C*', nodes: bands.equal },
		{ key: 'above', label: 'f(n) > C*', nodes: bands.above }
	]);

	const f = (n: PoppedNode) => formatValue(n.f);
	const title = (n: PoppedNode) =>
		`${n.label}: f = g + h = ${formatValue(n.g)} + ${formatValue(n.h)} = ${f(n)}`;
</script>

<dl class="bands">
	{#each groups as g (g.key)}
		<div class={['band', g.key]}>
			<dt>
				<span class="sym">{g.label}</span>
				<span class="count">{g.nodes.length}</span>
			</dt>
			<dd>
				{#if g.nodes.length}
					<ol class="chips" aria-label="{g.label}, C* = {formatValue(cStar)}">
						{#each g.nodes as n (n.index)}
							<li class="chip" title={title(n)}>
								<span class="name">{n.label}</span>
								<span class="f mono">{f(n)}</span>
								<span class="visually-hidden">(g = {formatValue(n.g)}, h = {formatValue(n.h)})</span
								>
							</li>
						{/each}
					</ol>
				{:else}
					<span class="none">none</span>
				{/if}
			</dd>
		</div>
	{/each}
</dl>

<style>
	.bands {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
	}
	.band {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr);
		gap: var(--space-2);
		align-items: baseline;
	}
	@media (max-width: 480px) {
		.band {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-1);
		}
	}
	dt {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
	}
	.sym {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
		white-space: nowrap;
	}
	.count {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	dd {
		margin: 0;
		min-width: 0;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chip {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		padding: 1px 7px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface-2);
		font-size: var(--text-xs);
		line-height: 1.6;
	}
	.below .chip {
		border-color: color-mix(in srgb, var(--explored) 45%, var(--border));
		background: var(--explored-soft);
	}
	.equal .chip {
		border-color: color-mix(in srgb, var(--accept) 50%, var(--border));
		background: var(--accept-soft);
	}
	.above .chip {
		border-color: color-mix(in srgb, var(--reject) 50%, var(--border));
		background: var(--reject-soft);
	}
	.name {
		font-weight: 500;
	}
	.f {
		color: var(--text-2);
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.none {
		color: var(--text-3);
		font-size: var(--text-sm);
	}
</style>
