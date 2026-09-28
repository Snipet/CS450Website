<!--
	Every strategy's run on one problem: the path and its cost, whether it is a
	cheapest path, the node counts, how the run ended, and the expansion order.
	The lowest cost and the fewest nodes expanded are marked.
-->
<script lang="ts">
	import { strategyShort } from '$lib/components/search/describe';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Tone } from '$lib/components/ui/types';
	import { formatCount } from '$lib/theory/search';
	import {
		costGap,
		formatCost,
		isBestCost,
		isFewestExpanded,
		orderTokens,
		outcomeDetail,
		outcomeText,
		pathText,
		type CompareSettings,
		type Comparison,
		type ComparedStrategy,
		type RunOutcome
	} from './compare';
	import OrderText from './OrderText.svelte';

	interface Props {
		comparison: Comparison;
		settings: CompareSettings;
		/** Link to the search tool for a strategy, or null to hide it. */
		linkFor: (strategy: ComparedStrategy) => string | null;
	}

	let { comparison, settings, linkFor }: Props = $props();

	const OUTCOME_TONE: Record<RunOutcome, Tone> = {
		found: 'accept',
		none: 'muted',
		limit: 'reject',
		cutoff: 'active'
	};

	const nameOf = (s: ComparedStrategy) => strategyShort(s);
	const dash = '–';
</script>

<div class="wrap">
	<table>
		<thead>
			<tr>
				<th scope="col" class="strategy">Strategy</th>
				<th scope="col" class="path">Path</th>
				<th scope="col" class="num">Cost</th>
				<th scope="col" class="cheapest">Cheapest?</th>
				<th scope="col" class="num">Taken off the frontier</th>
				<th scope="col" class="num">Expanded</th>
				<th scope="col" class="num">Generated</th>
				<th scope="col" class="num">Max frontier</th>
				<th scope="col" class="outcome">Outcome</th>
			</tr>
		</thead>
		{#each comparison.rows as row (row.strategy)}
			{@const link = linkFor(row.strategy)}
			{@const best = isBestCost(comparison, row)}
			{@const fewest = isFewestExpanded(comparison, row)}
			<tbody>
				<tr class="main">
					<th scope="row" class="strategy">
						<span class="name">
							{nameOf(row.strategy)}
							{#if row.strategy === 'wastar'}<span class="alpha">α = {settings.alpha}</span>{/if}
						</span>
						{#if link}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a class="open" href={link}
								>Step through<span class="visually-hidden">
									{nameOf(row.strategy)} in the search tool</span
								><Icon name="arrow-right" size={12} /></a
							>
						{/if}
					</th>
					<td class="path" data-label="Path">
						{#if row.path}{pathText(row.path)}{:else}<span class="muted">{dash}</span>{/if}
					</td>
					<td class="num" data-label="Cost">
						<span class="value">
							{#if row.cost !== null}
								<span class:best>{formatCost(row.cost)}</span>
								{#if best}<Badge tone="accept" title="Lowest cost among the runs">lowest</Badge
									>{/if}
							{:else}<span class="muted">{dash}</span>{/if}
						</span>
					</td>
					<td class="cheapest" data-label="Cheapest?">
						<span class="value">
							{#if row.cheapest === true}
								<span class="yes"><Icon name="check" size={14} /> Yes</span>
							{:else if row.cheapest === false && row.cost !== null && comparison.optimalCost !== null}
								<span class="no">No, {costGap(row.cost, comparison.optimalCost)}</span>
							{:else}<span class="muted">{dash}</span>{/if}
						</span>
					</td>
					<td class="num" data-label="Taken off the frontier">{formatCount(row.popped)}</td>
					<td class="num" data-label="Expanded">
						<span class="value">
							<span class:best={fewest}>{formatCount(row.expanded)}</span>
							{#if fewest}<Badge
									tone="accent"
									title="Fewest nodes expanded among the runs that found a solution">fewest</Badge
								>{/if}
						</span>
					</td>
					<td class="num" data-label="Generated">{formatCount(row.generated)}</td>
					<td class="num" data-label="Max frontier">{formatCount(row.maxFrontier)}</td>
					<td class="outcome" data-label="Outcome">
						<span class="value">
							<Badge tone={OUTCOME_TONE[row.outcome]} title={outcomeDetail(row, settings)}>
								{outcomeText(row.outcome)}
							</Badge>
							<span class="visually-hidden">{outcomeDetail(row, settings)}</span>
						</span>
					</td>
				</tr>
				<tr class="order-row">
					<td colspan="9">
						<div class="order">
							<span class="order-label"
								>Expansion order<span class="visually-hidden">
									of {nameOf(row.strategy)}</span
								></span
							>
							<OrderText tokens={orderTokens(row)} name={nameOf(row.strategy)} />
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
		overflow-x: auto;
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-2) var(--space-2);
		text-align: left;
		vertical-align: top;
		line-height: 1.45;
	}
	thead th {
		padding-top: 0;
		border-bottom: 1px solid var(--border);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		line-height: 1.3;
		text-transform: uppercase;
		vertical-align: bottom;
	}
	th:first-child,
	td:first-child {
		padding-left: 0;
	}
	th:last-child,
	td:last-child {
		padding-right: 0;
	}
	tbody {
		border-bottom: 1px solid var(--border);
	}
	tbody:hover {
		background: var(--surface-2);
	}
	.main > * {
		padding-top: var(--space-3);
		padding-bottom: var(--space-1);
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	thead .num {
		white-space: normal;
	}
	.num .value {
		justify-content: flex-end;
	}
	.value {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 6px;
	}
	.strategy {
		width: 9.5rem;
	}
	tbody th.strategy {
		font-weight: 400;
	}
	.name {
		display: block;
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
		line-height: 1.3;
	}
	.alpha {
		margin-left: 2px;
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 500;
		white-space: nowrap;
	}
	.open {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: var(--text-xs);
		font-weight: 500;
		text-decoration: none;
	}
	.open:hover {
		text-decoration: underline;
	}
	.path {
		min-width: 9rem;
		overflow-wrap: anywhere;
	}
	.cheapest {
		white-space: nowrap;
	}
	.outcome {
		white-space: nowrap;
	}
	.best {
		font-weight: 700;
	}
	.yes {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--accept);
		font-weight: 500;
	}
	.no {
		color: var(--reject);
		font-weight: 500;
	}
	.muted {
		color: var(--text-3);
	}
	.order-row td {
		padding-top: 0;
		padding-bottom: var(--space-3);
	}
	.order {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}
	.order-label {
		flex: none;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	/* Narrow: one card per strategy, each value labelled. */
	@container (max-width: 880px) {
		table,
		tbody,
		tr {
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
			padding: var(--space-3) 0;
		}
		tbody:hover {
			background: none;
		}
		tr.main {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: var(--space-4);
		}
		th,
		td,
		.main > * {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: var(--space-2);
			min-width: 0;
			padding: 2px 0;
		}
		th.strategy {
			grid-column: 1 / -1;
			width: auto;
			padding-bottom: var(--space-2);
		}
		td.path,
		td.outcome {
			grid-column: 1 / -1;
		}
		td.path {
			order: -1;
			padding-bottom: var(--space-1);
		}
		th.strategy {
			order: -2;
		}
		td[data-label]::before {
			content: attr(data-label);
			flex: none;
			color: var(--text-3);
			font-size: var(--text-xs);
			white-space: nowrap;
		}
		td.path {
			justify-content: flex-start;
		}
		td.path::before {
			min-width: 3rem;
		}
		.order-row td {
			display: block;
			padding: var(--space-2) 0 0;
		}
		.order {
			flex-direction: column;
			gap: 2px;
		}
	}
	@container (max-width: 380px) {
		tr.main {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
