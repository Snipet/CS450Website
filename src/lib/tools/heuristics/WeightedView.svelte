<!--
@component
Weighted A* (Informed Search, slide 38): A* with h inflated by α, its cost
against C* and the bound α · C*, and the nodes it expands against A*.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import NumberField from '$lib/components/ui/NumberField.svelte';
	import { formatCount } from '$lib/components/search/describe';
	import { formatValue } from './edit';
	import type { RunReport } from './analysis';
	import { MAX_ALPHA, MIN_ALPHA } from './state';

	interface Props {
		alpha: number;
		/** Weighted A* and A*, tree and graph search. */
		runs: { mode: 'tree' | 'graph'; weighted: RunReport; plain: RunReport }[];
		cStar: number | null;
		admissible: boolean;
		onalpha: (alpha: number) => void;
	}

	let { alpha, runs, cStar, admissible, onalpha }: Props = $props();

	const EPS = 1e-9;
	const n = formatValue;
	const bound = $derived(cStar === null ? null : alpha * cStar);
	const within = (r: RunReport) => r.cost !== null && bound !== null && r.cost <= bound + EPS;
</script>

<div class="weighted">
	<div class="controls">
		<NumberField
			label="α"
			inline
			size="sm"
			value={alpha}
			min={MIN_ALPHA}
			max={MAX_ALPHA}
			step={0.5}
			onchange={onalpha}
		/>
		<span class="formula">f(n) = g(n) + {n(alpha)}·h(n)</span>
	</div>

	<table>
		<thead>
			<tr>
				<th scope="col">Weighted A*</th>
				<th scope="col" class="num">Cost</th>
				<th scope="col" class="num">Expanded</th>
				<th scope="col" class="num">A* expanded</th>
			</tr>
		</thead>
		<tbody>
			{#each runs as r (r.mode)}
				<tr>
					<th scope="row">{r.mode === 'tree' ? 'Tree search' : 'Graph search'}</th>
					<td class="num">
						{#if r.weighted.cost !== null}
							<span class="mono">{n(r.weighted.cost)}</span>
						{:else}
							<span class="muted">{r.weighted.stopped ? 'limit' : 'none'}</span>
						{/if}
					</td>
					<td class="num">
						{formatCount(r.weighted.expanded)}{#if r.weighted.stopped}<span class="muted">+</span
							>{/if}
					</td>
					<td class="num">
						{formatCount(r.plain.expanded)}{#if r.plain.stopped}<span class="muted">+</span>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if cStar !== null && bound !== null}
		<p class="bound">
			<span>C* = {n(cStar)}, α · C* = {n(alpha)} × {n(cStar)} = <strong>{n(bound)}</strong>.</span>
			{#each runs as r (r.mode)}
				{#if r.weighted.cost !== null}
					<Badge tone={within(r.weighted) ? 'accept' : 'reject'}>
						{r.mode === 'tree' ? 'Tree' : 'Graph'}: {within(r.weighted)
							? 'within α · C*'
							: 'above α · C*'}
					</Badge>
				{/if}
			{/each}
		</p>
		<p class="note">
			{#if admissible}
				h is admissible, so the slide’s bound applies: the solution costs at most α · C*.
			{:else}
				h is not admissible, so the slide’s bound does not apply to this h.
			{/if}
		</p>
	{:else}
		<p class="note">No goal state can be reached from the start, so there is no C*.</p>
	{/if}
</div>

<style>
	.weighted {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.formula {
		color: var(--text-2);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 5px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	th:first-child {
		padding-left: 0;
	}
	tbody th {
		font-weight: 500;
		white-space: nowrap;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.muted {
		color: var(--text-3);
	}
	.bound {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		margin: 0;
		font-size: var(--text-sm);
	}
	.bound > span {
		flex-basis: 100%;
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
</style>
