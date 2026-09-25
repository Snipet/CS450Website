<!--
@component
The frontier after a step, in the order nodes would be taken off (the first
one is next), with each node's priority as the slides write it, the queue's
name, and, for graph search, the explored set.
-->
<script lang="ts">
	import type { SearchNode, SearchResult } from '$lib/theory/search';
	import { formatCount, priorityLabel, queueName } from './describe';
	import { clampStep, exploredAfter, frontierOrder, labelsByKey } from './tree-view';

	interface Props {
		result: SearchResult;
		/** Step index into `result.steps`. */
		step: number;
		/** Display name of a node's state (default: `node.label`). */
		label?: (node: SearchNode) => string;
		/** Chips shown per list before "+N more". */
		maxChips?: number;
		/** Show the explored set (default: for graph search). */
		showExplored?: boolean;
		/** Heading level of the two list titles. */
		level?: 2 | 3 | 4 | 5 | 6;
		class?: string;
	}

	let {
		result,
		step,
		label,
		maxChips = 60,
		showExplored,
		level = 3,
		class: className
	}: Props = $props();

	const uid = $props.id();
	const s = $derived(clampStep(result, step));
	const name = $derived(label ?? ((n: SearchNode) => n.label));
	const frontier = $derived(result.steps.length ? frontierOrder(result, s) : []);
	/** The search returned or stopped at this step: no node is taken off next. */
	const ended = $derived(result.steps[s]?.kind === 'goal' || result.steps[s]?.kind === 'fail');
	const lifo = $derived(
		result.strategy === 'dfs' || result.strategy === 'dls' || result.strategy === 'ids'
	);
	const explored = $derived(result.steps.length ? exploredAfter(result, s) : []);
	const keyLabels = $derived(labelsByKey(result));
	const withExplored = $derived(showExplored ?? result.mode === 'graph');
	const weight = $derived(result.options.weight);

	const shownFrontier = $derived(frontier.slice(0, maxChips));
	const shownExplored = $derived(explored.slice(0, maxChips));
	const count = (n: number, one: string, many: string) =>
		`${formatCount(n)} ${n === 1 ? one : many}`;
</script>

<div class={['frontier-view', className]}>
	<section class="block" aria-labelledby="{uid}-frontier">
		<div class="head">
			<svelte:element this={`h${level}`} class="title" id="{uid}-frontier">Frontier</svelte:element>
			<span class="count">{count(frontier.length, 'node', 'nodes')}</span>
			<span class="queue">{queueName(result.strategy)}</span>
		</div>
		{#if frontier.length === 0}
			<p class="empty">Empty</p>
		{:else}
			<div class="row">
				{#if lifo}<span class="end" aria-hidden="true">top</span>{/if}
				<ol
					class="chips"
					aria-label="Frontier in the order nodes are taken off{lifo
						? ', top of the LIFO queue first'
						: ''}"
				>
					{#each shownFrontier as id, i (id)}
						{@const node = result.nodes[id]}
						{@const prio = priorityLabel(result.strategy, node, weight)}
						<li class={['chip', 'frontier', { next: i === 0 && !ended }]}>
							{#if i === 0 && !ended}<span class="tag">next</span>{/if}
							<span class="name">{name(node)}</span>
							{#if prio}<span class="prio">{prio}</span>{/if}
						</li>
					{/each}
					{#if frontier.length > shownFrontier.length}
						<li class="more">+{formatCount(frontier.length - shownFrontier.length)} more</li>
					{/if}
				</ol>
			</div>
		{/if}
	</section>

	{#if withExplored}
		<section class="block" aria-labelledby="{uid}-explored">
			<div class="head">
				<svelte:element this={`h${level}`} class="title" id="{uid}-explored"
					>Explored set</svelte:element
				>
				<span class="count">{count(explored.length, 'state', 'states')}</span>
			</div>
			{#if explored.length === 0}
				<p class="empty">Empty</p>
			{:else}
				<ul class="chips" aria-label="Explored set, in the order states were added">
					{#each shownExplored as key (key)}
						<li class="chip explored"><span class="name">{keyLabels.get(key) ?? key}</span></li>
					{/each}
					{#if explored.length > shownExplored.length}
						<li class="more">+{formatCount(explored.length - shownExplored.length)} more</li>
					{/if}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.frontier-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px var(--space-2);
	}
	.title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
		letter-spacing: -0.005em;
	}
	.queue {
		flex-basis: 100%;
		font-size: var(--text-sm);
		color: var(--text-2);
	}
	.count {
		margin-left: auto;
		font-size: var(--text-xs);
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.empty {
		margin: 0;
		font-size: var(--text-sm);
		font-style: italic;
		color: var(--text-3);
	}
	.row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		min-width: 0;
	}
	.end {
		flex: none;
		margin-top: 5px;
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-3);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
		min-width: 0;
	}
	.chip {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		max-width: 100%;
		padding: 3px 9px;
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		background: var(--surface);
		font-size: var(--text-sm);
		line-height: 1.35;
	}
	.chip .name {
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.chip .prio {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: var(--text-xs);
		color: var(--text-2);
		white-space: nowrap;
	}
	.chip.frontier {
		border-color: color-mix(in srgb, var(--info) 55%, var(--border));
	}
	.chip.next {
		border-color: var(--info);
		background: var(--info-soft);
		box-shadow: inset 0 0 0 1px var(--info);
	}
	.chip .tag {
		align-self: center;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--info);
		color: var(--surface);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.03em;
		line-height: 16px;
		text-transform: uppercase;
	}
	.chip.explored {
		border-color: color-mix(in srgb, var(--explored) 35%, var(--border));
		background: var(--explored-soft);
	}
	.more {
		align-self: center;
		font-size: var(--text-sm);
		color: var(--text-3);
	}
</style>
