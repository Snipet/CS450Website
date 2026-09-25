<!--
	Results of the 8-puzzle solvers: one row per solver with its counts, the
	solution length (or why there is none), and the run time.
-->
<script lang="ts">
	import { formatCount } from '$lib/components/search/describe';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { formatMs, runOutcomeText } from './describe';
	import type { RunEntries } from './queue';
	import { SOLVERS, type SolverId } from './solvers';

	interface Props {
		entries: RunEntries;
		/** Whether a solver can run here (all with a worker, light ones without). */
		canRun: (id: SolverId) => boolean;
		onrun: (id: SolverId) => void;
		/** Optimal solution length, once an optimal solver has found it. */
		optimalLength: number | null;
	}

	let { entries, canRun, onrun, optimalLength }: Props = $props();

	const dash = '–';
</script>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th scope="col" class="solver">Solver</th>
				<th scope="col" class="num">Nodes expanded</th>
				<th scope="col" class="num">Nodes generated</th>
				<th scope="col" class="num">Max frontier</th>
				<th scope="col" class="result">Solution length</th>
				<th scope="col" class="num">Time (ms)</th>
			</tr>
		</thead>
		<tbody>
			{#each SOLVERS as s (s.id)}
				{@const entry = entries[s.id]}
				{@const run = entry?.status === 'done' ? entry.run : undefined}
				{@const busy = entry?.status === 'running' || entry?.status === 'queued'}
				<tr class:running={entry?.status === 'running'}>
					<th scope="row" class="solver">
						<div class="solver-cell">
							<IconButton
								icon="play"
								size="sm"
								variant="ghost"
								label="Run {s.label}"
								disabled={busy || !canRun(s.id)}
								onclick={() => onrun(s.id)}
							/>
							<span class="name">
								<span class="label">{s.label}</span>
								<span class="detail">{s.detail}</span>
							</span>
						</div>
					</th>
					<td class="num" data-label="Expanded">{run ? formatCount(run.expanded) : dash}</td>
					<td class="num" data-label="Generated">{run ? formatCount(run.generated) : dash}</td>
					<td class="num" data-label="Max frontier">{run ? formatCount(run.maxFrontier) : dash}</td>
					<td class="result" data-label="Length">
						<span class="rv">
							{#if run}
								{#if run.outcome === 'solved' && run.length !== null}
									<span class="len">{formatCount(run.length)}</span>
									{#if optimalLength !== null && run.length > optimalLength}
										<span class="extra">+{run.length - optimalLength} over optimal</span>
									{:else if optimalLength !== null && s.optimal}
										<span class="extra ok">optimal</span>
									{/if}
								{:else}
									<span class={['status', run.outcome === 'limit' ? 'stopped' : 'none']}
										>{runOutcomeText(run)}</span
									>
								{/if}
							{:else if entry?.status === 'running'}
								<span class="status live"
									><span class="spinner" aria-hidden="true"></span>Running…</span
								>
							{:else if entry?.status === 'queued'}
								<span class="status muted">Queued</span>
							{:else if entry?.status === 'cancelled'}
								<span class="status muted">Cancelled</span>
							{:else if entry?.status === 'error'}
								<span class="status none">Error: {entry.error}</span>
							{:else if !canRun(s.id)}
								<span class="status muted">Needs a Web Worker</span>
							{:else}
								<span class="muted">{dash}</span>
							{/if}</span
						></td
					>
					<td class="num" data-label="Time (ms)">{run ? formatMs(run.ms) : dash}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-wrap {
		container-type: inline-size;
		overflow-x: auto;
		min-width: 0;
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	thead th {
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
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	thead .num {
		white-space: normal;
	}
	.solver {
		min-width: 11rem;
	}
	tbody th {
		font-weight: 500;
	}
	.solver-cell {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.name {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}
	.label {
		white-space: nowrap;
	}
	.detail {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
	}
	.result {
		min-width: 11rem;
	}
	.len {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.extra {
		margin-left: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.extra.ok {
		color: var(--accept);
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-xs);
	}
	.stopped,
	.none {
		color: var(--reject);
	}
	.muted {
		color: var(--text-3);
	}
	.live {
		color: var(--text-2);
	}
	tr.running th,
	tr.running td {
		background: var(--active-soft);
	}
	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid var(--border-strong);
		border-top-color: var(--active);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	/* Narrow: one card per solver, each value labelled. */
	@container (max-width: 560px) {
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
		tr {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: var(--space-4);
			padding: var(--space-2) 0 var(--space-3);
			border-bottom: 1px solid var(--border);
		}
		th,
		td {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: var(--space-2);
			min-width: 0;
			padding: 2px 0;
			border: 0;
		}
		th:first-child,
		td:first-child {
			padding-left: 0;
		}
		th.solver {
			grid-column: 1 / -1;
			min-width: 0;
			padding-bottom: var(--space-1);
		}
		td.result {
			grid-column: 1 / -1;
			order: 1;
			min-width: 0;
		}
		td::before {
			content: attr(data-label);
			color: var(--text-3);
			font-size: var(--text-xs);
			white-space: nowrap;
		}
		td > :global(*) {
			text-align: right;
		}
		tr.running {
			background: var(--active-soft);
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
