<!--
@component
The number of vacuum-world states n·2ⁿ for n = 1 … 10 (Solving Problems by
Searching, slide 8), with bars on a linear scale.
-->
<script lang="ts">
	import { formatCount, superscript, vacuumCountRows } from './content';

	interface Props {
		/** The number of squares drawn now (its row is marked). */
		current: number;
	}

	let { current }: Props = $props();

	const rows = vacuumCountRows(10);
	const max = Math.max(...rows.map((r) => r.states));
</script>

<table class="counts">
	<caption class="visually-hidden">Number of states of the vacuum world with n squares</caption>
	<thead>
		<tr>
			<th scope="col" class="num">n</th>
			<th scope="col" class="num">n · 2ⁿ</th>
			<th scope="col" class="bar-col"><span class="visually-hidden">Bar</span></th>
		</tr>
	</thead>
	<tbody>
		{#each rows as r (r.n)}
			<tr class={{ current: r.n === current }} aria-current={r.n === current ? 'true' : undefined}>
				<th scope="row" class="num">{r.n}</th>
				<td class="num">
					<span class="formula">{r.n} · 2{superscript(r.n)} =</span>
					{formatCount(r.states)}
				</td>
				<td class="bar-col" aria-hidden="true">
					<span class="bar" style:width="{Math.max(0.4, (r.states / max) * 100)}%"></span>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.counts {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 3px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	tbody th {
		font-weight: 500;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.formula {
		margin-right: 2px;
		color: var(--text-3);
	}
	.bar-col {
		width: 45%;
	}
	.bar {
		display: block;
		height: 8px;
		border-radius: 2px;
		background: var(--tok-5);
		opacity: 0.55;
	}
	tr.current th,
	tr.current td {
		background: var(--accent-soft);
	}
	tr.current th {
		box-shadow: inset 3px 0 var(--accent);
	}
	tr.current .bar {
		opacity: 1;
	}
</style>
