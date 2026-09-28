<!--
	The strategy table of the slides ("Review: Uninformed search strategies",
	Uninformed Search slide 45; "All search strategies", Informed Search slide
	42) with the slides' column names. Time and space share one cell where the
	slide merges them. Each row opens its notes from the per-strategy
	"Properties of …" slides.
-->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Button from '$lib/components/ui/Button.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { STRATEGY_PROPERTIES, type StrategyProperties } from '$lib/theory/search';
	import { complexityLines, mergesTimeAndSpace } from './properties-view';

	const uid = $props.id();
	const open = new SvelteSet<string>();
	const allOpen = $derived(open.size === STRATEGY_PROPERTIES.length);

	function toggle(p: StrategyProperties) {
		if (open.has(p.strategy)) open.delete(p.strategy);
		else open.add(p.strategy);
	}

	function toggleAll() {
		if (allOpen) open.clear();
		else for (const p of STRATEGY_PROPERTIES) open.add(p.strategy);
	}

	const notesId = (p: StrategyProperties) => `${uid}-notes-${p.strategy}`;
</script>

<div class="wrap">
	<div class="toolbar">
		<Button size="sm" variant="ghost" onclick={toggleAll} aria-pressed={allOpen}>
			{#snippet icon()}<Icon name={allOpen ? 'chevron-up' : 'chevron-down'} />{/snippet}
			{allOpen ? 'Hide all notes' : 'Show all notes'}
		</Button>
	</div>
	<table>
		<thead>
			<tr>
				<th scope="col" class="algo">Algorithm</th>
				<th scope="col">Complete?</th>
				<th scope="col">Optimal?</th>
				<th scope="col">Time complexity</th>
				<th scope="col">Space complexity</th>
			</tr>
		</thead>
		{#each STRATEGY_PROPERTIES as p (p.strategy)}
			{@const expanded = open.has(p.strategy)}
			<tbody class:informed={p.strategy === 'greedy'} class:expanded>
				<tr>
					<th scope="row" class="algo">
						<button
							type="button"
							class="toggle"
							aria-expanded={expanded}
							aria-controls={notesId(p)}
							onclick={() => toggle(p)}
						>
							<span class="chevron" aria-hidden="true"><Icon name="chevron-right" size={14} /></span
							>
							<span class="name">{p.name}</span>
							<span class="visually-hidden">notes</span>
						</button>
					</th>
					<td data-label="Complete?">{p.complete}</td>
					<td data-label="Optimal?">{p.optimal}</td>
					{#if mergesTimeAndSpace(p)}
						<td colspan="2" class="merged" data-label="Time and space">
							<span class="lines"
								>{#each complexityLines(p.time) as line (line)}<span class="line">{line}</span
									>{/each}</span
							>
						</td>
					{:else}
						<td data-label="Time complexity">
							<span class="lines"
								>{#each complexityLines(p.time) as line (line)}<span class="line">{line}</span
									>{/each}</span
							>
						</td>
						<td data-label="Space complexity">
							<span class="lines"
								>{#each complexityLines(p.space) as line (line)}<span class="line">{line}</span
									>{/each}</span
							>
						</td>
					{/if}
				</tr>
				<tr class="notes" id={notesId(p)} hidden={!expanded}>
					<td colspan="5">
						<ul>
							{#each p.notes as note (note)}<li>{note}</li>{/each}
						</ul>
						<div class="cites">
							{#each p.cite as c (`${c.deck}-${c.slide}`)}<CitationTag cite={c} />{/each}
						</div>
					</td>
				</tr>
			</tbody>
		{/each}
	</table>
</div>

<style>
	.wrap {
		container-type: inline-size;
		min-width: 0;
	}
	.toolbar {
		display: flex;
		justify-content: flex-end;
		margin: calc(-1 * var(--space-2)) 0 var(--space-2);
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: center;
		vertical-align: middle;
		line-height: 1.4;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		vertical-align: bottom;
	}
	th.algo {
		width: 8rem;
		padding-left: 0;
		text-align: left;
	}
	tbody.informed tr:first-child > * {
		border-top: 2px solid var(--border-strong);
	}
	tbody:hover tr:first-child > *,
	tbody.expanded tr > * {
		background: var(--surface-2);
	}
	tbody.expanded tr:first-child > * {
		border-bottom-color: transparent;
	}
	.merged {
		color: var(--text);
	}
	.lines,
	.line {
		display: block;
		font-variant-numeric: tabular-nums;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 8px 2px 4px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
		cursor: pointer;
	}
	.toggle:hover {
		color: var(--accent);
	}
	.chevron {
		display: flex;
		color: var(--text-3);
		transition: transform var(--duration) var(--ease);
	}
	.toggle[aria-expanded='true'] .chevron {
		transform: rotate(90deg);
	}
	.notes td {
		padding: 0 var(--space-3) var(--space-3) calc(var(--space-2) + 22px);
		text-align: left;
	}
	.notes ul {
		margin: 0 0 var(--space-2);
		padding-left: 1.1em;
		color: var(--text-2);
		line-height: 1.5;
	}
	.notes li + li {
		margin-top: 2px;
	}
	.cites {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
	}

	/* Narrow: one block per strategy, each value labelled. */
	@container (max-width: 540px) {
		table,
		tbody,
		tr,
		td,
		th {
			display: block;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
		}
		tbody {
			padding: var(--space-2) 0;
			border-bottom: 1px solid var(--border);
		}
		tbody.informed {
			border-top: 2px solid var(--border-strong);
		}
		tbody.informed tr:first-child > * {
			border-top: 0;
		}
		tbody:hover tr:first-child > *,
		tbody.expanded tr > * {
			background: none;
		}
		tr[hidden] {
			display: none;
		}
		th,
		td {
			padding: 2px 0;
			border: 0;
			text-align: left;
		}
		th.algo {
			width: auto;
			padding-bottom: var(--space-1);
		}
		td[data-label] {
			display: grid;
			grid-template-columns: 7.5rem minmax(0, 1fr);
			gap: var(--space-2);
		}
		td[data-label]::before {
			content: attr(data-label);
			color: var(--text-3);
			font-size: var(--text-xs);
			line-height: 1.9;
		}
		.notes td {
			padding: var(--space-2) 0 0;
		}
	}
</style>
