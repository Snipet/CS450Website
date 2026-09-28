<!--
	Node counts for given b, d, m (and C*, ε for UCS): the sums behind the
	complexity classes written out with the numbers substituted (Uninformed
	Search, slides 31, 32, 38, 44), computed exactly with BigInt.
-->
<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import NumberField from '$lib/components/ui/NumberField.svelte';
	import { formatLarge } from '$lib/theory/search';
	import {
		MAX_EXPONENT,
		formatQuotient,
		formatRatio,
		nodeCounts,
		percentMore,
		type Series
	} from './counts';
	import {
		MAX_B,
		MAX_C_STAR,
		MAX_DEPTH,
		MAX_EPS,
		MIN_EPS,
		cleanCounts,
		numberIn,
		wholeIn
	} from './state';

	interface Props {
		b: number;
		d: number;
		m: number;
		cStar: number;
		eps: number;
	}

	let {
		b = $bindable(),
		d = $bindable(),
		m = $bindable(),
		cStar = $bindable(),
		eps = $bindable()
	}: Props = $props();

	// Whole, in-range inputs (a number field can report 2.5 while it is typed).
	const inputs = $derived(cleanCounts({ b, d, m, cStar, eps }));
	const counts = $derived(nodeCounts(inputs));
	const k = $derived(counts.ucs.capped ? MAX_EXPONENT : counts.ucs.depth);

	const spaceRows = $derived([
		{ algo: 'BFS', cls: 'O(bᵈ)', count: 'bᵈ', nodes: counts.space.bfs },
		{ algo: 'IDS', cls: 'O(bd)', count: 'b·d + 1', nodes: counts.space.ids },
		{ algo: 'DFS', cls: 'O(bm)', count: 'b·m + 1', nodes: counts.space.dfs },
		{ algo: 'UCS', cls: null, count: 'bᵏ', nodes: counts.space.ucs }
	]);
</script>

{#snippet sum(s: Series)}
	<div class="lines">
		<p class="sym">{s.symbolic}</p>
		<p>= {s.powers}</p>
		{#if s.values !== s.powers}<p>= {s.values}</p>{/if}
		<!-- Totals over 15 digits are shown rounded, in powers of ten. -->
		<p class="total">
			{s.total.toString().length > 15 ? '≈' : '='} <strong>{formatLarge(s.total)}</strong>
		</p>
	</div>
{/snippet}

<div class="counts">
	<fieldset class="inputs">
		<legend class="visually-hidden">Inputs</legend>
		<NumberField
			label="Branching factor b"
			bind:value={() => b, (v) => (b = wholeIn(v, 1, MAX_B))}
			min={1}
			max={MAX_B}
			size="sm"
		/>
		<NumberField
			label="Solution depth d"
			bind:value={() => d, (v) => (d = wholeIn(v, 0, MAX_DEPTH))}
			min={0}
			max={MAX_DEPTH}
			size="sm"
		/>
		<NumberField
			label="Longest path m"
			bind:value={() => m, (v) => (m = wholeIn(v, 0, MAX_DEPTH))}
			min={0}
			max={MAX_DEPTH}
			size="sm"
		/>
		<NumberField
			label="Optimal cost C*"
			bind:value={() => cStar, (v) => (cStar = numberIn(v, 0, MAX_C_STAR))}
			min={0}
			max={MAX_C_STAR}
			size="sm"
		/>
		<NumberField
			label="Least step cost ε"
			bind:value={() => eps, (v) => (eps = numberIn(v, MIN_EPS, MAX_EPS))}
			min={MIN_EPS}
			max={MAX_EPS}
			step={0.1}
			size="sm"
		/>
	</fieldset>
	{#if inputs.m < inputs.d}
		<p class="note">m is usually at least d: the optimal solution is itself a path.</p>
	{/if}

	<h3>Time <span class="sub">nodes generated</span></h3>
	<dl class="rows">
		<div class="row">
			<dt>
				<span class="algo">BFS</span>
				<span class="class">O(bᵈ)</span>
			</dt>
			<dd>
				<p class="what">
					Nodes in a b-ary tree of depth d
					<CitationTag cite={{ deck: 'uninformed', slide: 31 }} />
				</p>
				{@render sum(counts.bfs)}
			</dd>
		</div>
		<div class="row">
			<dt>
				<span class="algo">IDS</span>
				<span class="class">O(bᵈ)</span>
			</dt>
			<dd>
				<p class="what">
					Level i is generated again in each of the d + 1 − i iterations that reach it
					<CitationTag cite={{ deck: 'uninformed', slide: 38 }} />
				</p>
				{@render sum(counts.ids)}
				<p class="compare">
					IDS / BFS = <strong>{formatRatio(counts.idsOverBfs)}</strong>: {percentMore(
						counts.idsOverBfs
					)} nodes than BFS.
				</p>
			</dd>
		</div>
		<div class="row">
			<dt>
				<span class="algo">DFS</span>
				<span class="class">O(bᵐ)</span>
			</dt>
			<dd>
				<p class="what">
					A solution at the maximum depth m: every node of a b-ary tree of depth m
					<CitationTag cite={{ deck: 'uninformed', slide: 32 }} />
				</p>
				{@render sum(counts.dfs)}
			</dd>
		</div>
		<div class="row">
			<dt>
				<span class="algo">UCS</span>
				<span class="class">O(b<sup>C*/ε</sup>)</span>
			</dt>
			<dd>
				<p class="what">
					Nodes with g(n) ≤ C* lie at depth k = ⌊C*/ε⌋ = {counts.ucs.depth.toLocaleString('en-US')}
					or less{#if counts.ucs.capped}; counted with k = {MAX_EXPONENT.toLocaleString(
							'en-US'
						)}{/if}.
					<CitationTag cite={{ deck: 'uninformed', slide: 44 }} />
				</p>
				{@render sum(counts.ucs)}
				<p class="compare">
					{#if k > inputs.d}
						k = {k} &gt; d = {inputs.d}: up to {formatQuotient(counts.ucs.total, counts.bfs.total)} times
						the BFS count.
					{:else}
						k = {k} ≤ d = {inputs.d}: no more than the BFS count.
					{/if}
				</p>
			</dd>
		</div>
	</dl>

	<h3>Space <span class="sub">nodes in memory</span></h3>
	<table class="space">
		<thead>
			<tr>
				<th scope="col">Algorithm</th>
				<th scope="col">Space</th>
				<th scope="col" class="num">Nodes</th>
			</tr>
		</thead>
		<tbody>
			{#each spaceRows as row (row.algo)}
				<tr>
					<th scope="row">{row.algo}</th>
					<td>
						<span class="class-name"
							>{#if row.cls === null}O(b<sup>C*/ε</sup>){:else}{row.cls}{/if}</span
						>
						<span class="formula">{row.count}</span>
					</td>
					<td class="num">{formatLarge(row.nodes)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="note">
		BFS keeps the whole last level on the frontier; DFS keeps the unexpanded siblings of each node
		on its path (b per level) plus the root; IDS is DFS with depth limit d.
	</p>
</div>

<style>
	.counts {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.inputs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-4);
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	h3 {
		margin: var(--space-3) 0 0;
		font-size: var(--text-lg);
	}
	.sub {
		margin-left: var(--space-1);
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 400;
	}
	.rows {
		margin: 0;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-1) var(--space-4);
		padding: var(--space-3) 0;
		border-top: 1px solid var(--border);
	}
	.row:last-child {
		border-bottom: 1px solid var(--border);
	}
	@media (min-width: 640px) {
		.row {
			grid-template-columns: 6.5rem minmax(0, 1fr);
		}
	}
	dt {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px var(--space-2);
		align-content: flex-start;
	}
	.algo {
		font-family: var(--font-serif);
		font-weight: 600;
	}
	.class {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	dd {
		margin: 0;
		min-width: 0;
	}
	.what {
		margin: 0 0 var(--space-1);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.lines p {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}
	.lines .sym {
		color: var(--text-2);
	}
	.total strong {
		font-weight: 700;
	}
	.compare {
		margin: var(--space-1) 0 0;
		font-size: var(--text-sm);
	}
	.note {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	.space {
		width: 100%;
		font-size: var(--text-sm);
	}
	.space th,
	.space td {
		padding: var(--space-1) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
	.space th:first-child,
	.space td:first-child {
		padding-left: 0;
	}
	.space th:last-child,
	.space td:last-child {
		padding-right: 0;
	}
	.space thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.space tbody th {
		font-family: var(--font-serif);
		font-weight: 600;
	}
	.num {
		text-align: right !important;
		font-variant-numeric: tabular-nums;
	}
	.class-name {
		margin-right: var(--space-2);
	}
	.formula {
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		white-space: nowrap;
	}
</style>
