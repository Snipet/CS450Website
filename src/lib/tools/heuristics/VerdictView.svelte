<!--
@component
Whether h is admissible (Informed Search, slides 25–26) and consistent
(slide 28), and what slide 29 guarantees for A* tree and graph search next
to what the two searches return with this h.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Disclosure from '$lib/components/ui/Disclosure.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatValue } from './edit';
	import {
		admissibilitySentence,
		consistencySentence,
		type RunReport,
		type Verdicts
	} from './analysis';

	interface Props {
		v: Verdicts;
		tree: RunReport;
		graph: RunReport;
		cStar: number | null;
	}

	let { v, tree, graph, cStar }: Props = $props();

	const n = formatValue;

	const rows = $derived([
		{
			key: 'tree',
			search: 'Tree search',
			detail: 'no repeated-state detection',
			needs: 'admissible (and non-negative)',
			holds: v.admissible,
			run: tree
		},
		{
			key: 'graph',
			search: 'Graph search',
			detail: 'repeated-state detection',
			needs: 'consistent',
			holds: v.consistent,
			run: graph
		}
	]);
</script>

<div class="verdicts">
	<div class="pair">
		<section class="verdict" aria-labelledby="verdict-admissible">
			<header>
				<h3 id="verdict-admissible">Admissible</h3>
				<Badge tone={v.admissible ? 'accept' : 'reject'}>
					<Icon name={v.admissible ? 'check' : 'x'} size={12} />
					{v.admissible ? 'Yes' : 'No'}
				</Badge>
			</header>
			<p class="result">{admissibilitySentence(v)}</p>
			<blockquote>
				<p>
					An admissible heuristic never overestimates the cost to reach the goal: h(n) ≤ h*(n) for
					every node n, where h*(n) is the true cost to reach the goal state from n. Theorem: if
					h(n) is admissible, A* is optimal.
				</p>
				<CitationTag cite={{ deck: 'informed', slide: 25 }} />
			</blockquote>
			<Disclosure summary="Proof sketch" openSummary="Hide proof sketch">
				<p>
					For A* without repeated-state detection: let C* be the evaluation function value (actual
					path cost) of the first goal node selected for expansion. All the other nodes on the
					frontier have estimated path costs to the goal at least as big as C*. Because the
					heuristic is admissible, the true path costs to the goal for those nodes cannot be less
					than C*.
				</p>
				<CitationTag cite={{ deck: 'informed', slide: 26 }} />
			</Disclosure>
		</section>

		<section class="verdict" aria-labelledby="verdict-consistent">
			<header>
				<h3 id="verdict-consistent">Consistent</h3>
				<Badge tone={v.consistent ? 'accept' : 'reject'}>
					<Icon name={v.consistent ? 'check' : 'x'} size={12} />
					{v.consistent ? 'Yes' : 'No'}
				</Badge>
			</header>
			<p class="result">{consistencySentence(v)}</p>
			<blockquote>
				<p>
					cost(A to C) + h(C) ≥ h(A) for every edge, i.e. cost(A to C) ≥ h(A) − h(C): the real cost
					is at least the cost implied by the heuristic. Consistency is stronger than admissibility.
					Consequences: the f value along a path never decreases, and A* graph search is optimal.
				</p>
				<CitationTag cite={{ deck: 'informed', slide: 28 }} />
			</blockquote>
			{#if v.consistent && !v.goalsZero}
				<p class="warn">
					<Icon name="warning" size={14} />
					<span>
						h is consistent, but h &gt; 0 at {v.goalsAbove.length === 1 ? 'the goal' : 'the goals'}
						{v.goalsAbove.join(', ')}, so it is not admissible: consistency implies admissibility
						when h = 0 at every goal.
					</span>
				</p>
			{/if}
		</section>
	</div>

	<div class="optimality">
		<table>
			<caption>Optimality of A*</caption>
			<thead>
				<tr>
					<th scope="col">A*</th>
					<th scope="col">Optimal if h is</th>
					<th scope="col">This h</th>
					<th scope="col">Returned</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.key)}
					<tr>
						<th scope="row">
							{r.search}
							<span class="detail">{r.detail}</span>
						</th>
						<td class="needs"><span class="cell-label">Optimal if h is</span> {r.needs}</td>
						<td class="this">
							<span class="cell-label">This h:</span>
							<span class={['mark', r.holds ? 'ok' : 'bad']}>
								<Icon name={r.holds ? 'check' : 'x'} size={14} />
								{r.holds ? 'yes' : 'no'}
							</span>
						</td>
						<td class="ret">
							<span class="cell-label">Returned</span>
							{#if r.run.cost !== null}
								<span class="mono">{n(r.run.cost)}</span>
								{#if r.run.optimal}
									<Badge tone="accept">= C*</Badge>
								{:else if r.run.optimal === false && cStar !== null}
									<Badge tone="reject">&gt; C* = {n(cStar)}</Badge>
								{/if}
							{:else if r.run.stopped}
								<span class="muted">stopped at the limit</span>
							{:else}
								<span class="muted">no solution</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="foot">
			Consistency implies admissibility. In general, most natural admissible heuristics tend to be
			consistent, especially if they come from relaxed problems.
			<CitationTag cite={{ deck: 'informed', slide: 29 }} />
		</p>
	</div>
</div>

<style>
	.verdicts {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.pair {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
	}
	@media (min-width: 640px) {
		.pair {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.verdict {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		min-width: 0;
	}
	.verdict header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	h3 {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}
	.verdict :global(.badge) {
		gap: 3px;
	}
	.result {
		margin: 0;
		font-weight: 500;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	blockquote {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		margin: 0;
		padding: var(--space-1) 0 var(--space-1) var(--space-3);
		border-left: 3px solid var(--border-strong);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	blockquote p {
		margin: 0;
	}
	.verdict :global(.disclosure) {
		align-self: stretch;
	}
	.verdict :global(.disclosure p) {
		margin: 0 0 var(--space-1);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.warn {
		display: flex;
		gap: var(--space-2);
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.warn :global(svg) {
		flex: none;
		margin-top: 3px;
		color: var(--reject);
	}
	.optimality {
		container-type: inline-size;
		min-width: 0;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.cell-label {
		display: none;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	caption {
		padding-bottom: var(--space-2);
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
		text-align: left;
	}
	th,
	td {
		padding: 6px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}
	th:first-child {
		padding-left: 0;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	tbody th {
		font-weight: 600;
		white-space: nowrap;
	}
	.detail {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
		white-space: normal;
	}
	.mark {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-weight: 600;
	}
	.mark.ok {
		color: var(--accept);
	}
	.mark.bad {
		color: var(--reject);
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		margin-right: var(--space-1);
	}
	.muted {
		color: var(--text-3);
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		margin: var(--space-3) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	/* Narrow: one block per search, with the column names inline. */
	@container (max-width: 34rem) {
		thead {
			display: none;
		}
		caption {
			display: block;
		}
		table,
		tbody,
		tr,
		th,
		td {
			display: block;
		}
		tr {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--space-1) var(--space-4);
			padding: var(--space-2) 0;
			border-bottom: 1px solid var(--border);
		}
		th,
		td {
			padding: 0;
			border: 0;
		}
		th[scope='row'],
		td.needs {
			flex-basis: 100%;
		}
		th[scope='row'] .detail {
			display: inline;
			margin-left: var(--space-1);
		}
		.cell-label {
			display: inline;
			color: var(--text-3);
		}
	}
</style>
