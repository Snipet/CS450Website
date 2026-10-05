<!--
@component
Heuristic practice: a small graph with h values; the questions are whether h
is admissible and whether it is consistent. "Show answer" compares h with h*
at every state, lists the edges where consistency fails, and says what A*
tree and graph search return with this h.
-->
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Callout from '$lib/components/ui/Callout.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import StateGraph from '$lib/components/search/StateGraph.svelte';
	import { toolLink } from '$lib/tools/links';
	import {
		gradeHeuristic,
		heuristicDrill,
		heuristicGraphText,
		type AStarOutcome
	} from './practice/heuristic-drill';

	type YesNo = '' | 'yes' | 'no';

	let seed = $state(1);
	let admissible = $state<YesNo>('');
	let consistent = $state<YesNo>('');
	let graded = $state(false);
	let revealed = $state(false);

	const drill = $derived(heuristicDrill(seed));
	const report = $derived(drill.report);
	const href = $derived(toolLink('heuristics', { graph: heuristicGraphText(drill) }));
	const toBool = (v: YesNo) => (v === '' ? null : v === 'yes');
	const grade = $derived(
		gradeHeuristic(drill, { admissible: toBool(admissible), consistent: toBool(consistent) })
	);
	const badEdges = $derived(report.edges.filter((e) => !e.consistent));

	const options = [
		{ value: 'yes' as const, label: 'Yes' },
		{ value: 'no' as const, label: 'No' }
	];

	function next() {
		seed++;
		admissible = '';
		consistent = '';
		graded = false;
		revealed = false;
	}

	function verdict(g: boolean | null, what: string): string {
		if (g === null) return `${what}: not answered.`;
		return `${what}: ${g ? 'right' : 'wrong'}.`;
	}

	const summary = $derived.by(() => {
		if (!graded) return null;
		const both = grade.admissible === true && grade.consistent === true;
		return {
			tone: both ? ('success' as const) : ('error' as const),
			text: both
				? 'Both right.'
				: `${verdict(grade.admissible, 'Admissible')} ${verdict(grade.consistent, 'Consistent')}`
		};
	});

	function outcomeText(o: AStarOutcome): string {
		if (o.cost === null) return 'finds no path';
		return `returns ${o.states.join(' → ')} (cost ${o.cost})`;
	}
</script>

<div class="drill">
	<div class="controls">
		<Button size="sm" onclick={next}>
			{#snippet icon()}<Icon name="dice" size={15} />{/snippet}
			New graph
		</Button>
	</div>

	<p class="prompt">
		Start S, goal G; step costs on the edges and h next to each state. Is h admissible? Is it
		consistent?
	</p>

	<StateGraph
		graph={drill.spec.graph}
		start="S"
		goals={['G']}
		heuristic={drill.spec.h}
		height={250}
		highlight={revealed
			? { dropped: report.nodes.filter((n) => !n.admissible).map((n) => n.id) }
			: undefined}
		statusText={{ dropped: 'Overestimates h*' }}
		legend={revealed && !report.admissible}
		ariaLabel="Graph with states S, A, B, C, D, G and heuristic values"
	/>

	<div class="questions">
		<SegmentedControl
			label="Admissible?"
			showLabel
			{options}
			bind:value={admissible}
			size="sm"
			onchange={() => (graded = false)}
		/>
		<SegmentedControl
			label="Consistent?"
			showLabel
			{options}
			bind:value={consistent}
			size="sm"
			onchange={() => (graded = false)}
		/>
		<div class="buttons">
			<Button variant="primary" size="sm" onclick={() => (graded = true)}>Check</Button>
			<Button size="sm" onclick={() => (revealed = !revealed)}>
				{revealed ? 'Hide answer' : 'Show answer'}
			</Button>
		</div>
	</div>

	<div aria-live="polite">
		{#if summary}<Callout tone={summary.tone}>{summary.text}</Callout>{/if}
	</div>

	{#if revealed}
		<div class="reveal">
			<p>
				h is <strong>{report.admissible ? 'admissible' : 'not admissible'}</strong> and
				<strong>{report.consistent ? 'consistent' : 'not consistent'}</strong>.
			</p>
			<div class="table-wrap">
				<table>
					<caption class="visually-hidden">h and the true cost h* at each state</caption>
					<thead>
						<tr>
							<th scope="row">State</th>
							{#each report.nodes as n (n.id)}<th scope="col">{n.id}</th>{/each}
						</tr>
					</thead>
					<tbody>
						<tr>
							<th scope="row">h(n)</th>
							{#each report.nodes as n (n.id)}
								<td class={{ bad: !n.admissible }}>{n.h}</td>
							{/each}
						</tr>
						<tr>
							<th scope="row">h*(n)</th>
							{#each report.nodes as n (n.id)}<td>{n.hStar}</td>{/each}
						</tr>
					</tbody>
				</table>
			</div>
			{#if badEdges.length}
				<p>Consistency fails where h(n) &gt; c(n, n′) + h(n′):</p>
				<ul class="edges">
					{#each badEdges as e (e.from + e.to)}
						<li class="mono">
							h({e.from}) = {e.hFrom} &gt; c({e.from}, {e.to}) + h({e.to}) = {e.cost} + {e.hTo} = {e.cost +
								e.hTo}
						</li>
					{/each}
				</ul>
			{:else}
				<p>h(n) ≤ c(n, n′) + h(n′) holds on every edge, both ways.</p>
			{/if}
			<p>
				A* tree search {outcomeText(drill.tree)}; {report.admissible
					? 'h is admissible, so it is guaranteed optimal.'
					: 'h is not admissible, so optimality is not guaranteed.'}
				A* graph search {outcomeText(drill.graph)}; {report.consistent
					? 'h is consistent, so it is guaranteed optimal.'
					: 'h is not consistent, so optimality is not guaranteed.'}
				The cheapest path costs {drill.optimalCost}.
			</p>
			{#if href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
				<a class="tool-link" {href}>
					Check it in the heuristics tool <Icon name="arrow-right" size={15} />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.drill {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.controls,
	.questions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.buttons {
		display: flex;
		gap: var(--space-2);
	}
	.prompt {
		margin: 0;
	}
	.reveal {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.reveal p {
		margin: 0;
	}
	.table-wrap {
		max-width: 100%;
		overflow-x: auto;
	}
	table {
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 4px 10px;
		border: 1px solid var(--border);
		text-align: center;
	}
	th[scope='row'] {
		text-align: left;
		font-weight: 500;
		white-space: nowrap;
	}
	td.bad {
		background: var(--reject-soft);
		color: var(--reject);
		font-weight: 600;
	}
	.edges {
		margin: 0;
		padding-left: var(--space-5);
	}
	.mono {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
	}
	.tool-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		font-weight: 500;
	}
</style>
