<!--
@component
State-space sizes of the example problems and the work of Dijkstra's
algorithm on the whole state space, E + V log₂ V (Solving Problems by
Searching, slide 12).
-->
<script lang="ts">
	import { formatBig, sizeRows } from './content';

	interface Props {
		/** Rows to mark (problem names as in `sizeRows`). */
		marked?: readonly string[];
	}

	let { marked = [] }: Props = $props();

	const rows = sizeRows();
</script>

<div class="wrap">
	<table class="sizes">
		<caption class="visually-hidden">
			State-space sizes: states V, actions E, and E + V log₂ V
		</caption>
		<thead>
			<tr>
				<th scope="col">Problem</th>
				<th scope="col" class="num">States V</th>
				<th scope="col" class="num edges">Actions E</th>
				<th scope="col" class="num">E + V log₂ V</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.problem)}
				{@const mark = marked.includes(r.problem)}
				<tr class={{ marked: mark }}>
					<th scope="row">{r.problem}</th>
					<td class="num">{r.statesText}</td>
					<td class="num edges">{r.edgesText}</td>
					<td class="num strong">{Number.isFinite(r.work) ? `~${formatBig(r.work)}` : '∞'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.wrap {
		overflow-x: auto;
	}
	.sizes {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: baseline;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	tbody th {
		font-weight: 500;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.strong {
		font-weight: 600;
		white-space: nowrap;
	}
	tr.marked th,
	tr.marked td {
		background: var(--accent-soft);
	}
	tr.marked th {
		box-shadow: inset 3px 0 var(--accent);
	}
	@media (max-width: 520px) {
		.edges {
			display: none;
		}
	}
</style>
