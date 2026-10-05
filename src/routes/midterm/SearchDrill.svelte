<!--
@component
Expansion-order practice: a random search problem, a strategy, and a field
for the order in which nodes come off the frontier, checked against the
search engine. "Show answer" lists the order (per iteration for iterative
deepening), draws the solution path, and links to the search tool.
-->
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Callout from '$lib/components/ui/Callout.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import StateGraph from '$lib/components/search/StateGraph.svelte';
	import { strategyName } from '$lib/components/search/describe';
	import { toolLink } from '$lib/tools/links';
	import {
		DRILL_ADJECTIVE,
		DRILL_STRATEGIES,
		checkOrder,
		drillGraphText,
		parseOrder,
		searchDrill,
		type DrillStrategy,
		type OrderCheck
	} from './practice/search-drill';

	interface Props {
		strategy: DrillStrategy;
	}

	let { strategy: initial }: Props = $props();

	// The item's strategy is only the starting point; the select can change it.
	// svelte-ignore state_referenced_locally
	let strategy = $state<DrillStrategy>(initial);
	let mode = $state<'tree' | 'graph'>('tree');
	let seed = $state(1);
	let answer = $state('');
	let check = $state<OrderCheck | null>(null);
	let revealed = $state(false);

	const drill = $derived(searchDrill({ strategy, mode, seed }));
	const names = $derived(drill.spec.graph.nodes.map((n) => n.id));
	const informed = $derived(strategy === 'greedy' || strategy === 'astar');
	const costly = $derived(strategy === 'ucs' || strategy === 'astar' || strategy === 'greedy');
	const href = $derived(
		toolLink('search', {
			graph: drillGraphText(drill),
			strategy,
			mode,
			...(strategy === 'dls' ? { depthLimit: drill.depthLimit } : {})
		})
	);

	const strategyOptions = DRILL_STRATEGIES.map((s) => ({ value: s, label: strategyName(s) }));
	const modeOptions = [
		{ value: 'tree' as const, label: 'Tree search' },
		{ value: 'graph' as const, label: 'Graph search' }
	];

	function reset() {
		answer = '';
		check = null;
		revealed = false;
	}

	function submit() {
		check = checkOrder(drill.order, parseOrder(answer, names));
	}

	function feedback(c: OrderCheck): { tone: 'success' | 'error' | 'info'; text: string } {
		const n = drill.order.length;
		switch (c.kind) {
			case 'empty':
				return { tone: 'info', text: 'Type the states in order, separated by spaces.' };
			case 'unknown':
				return {
					tone: 'error',
					text: `Not a state in this problem: ${c.tokens.join(', ')}. The states are ${names.join(', ')}.`
				};
			case 'correct':
				return { tone: 'success', text: `Correct: all ${n} nodes in order.` };
			case 'short':
				return {
					tone: 'error',
					text: `The first ${c.matched} ${c.matched === 1 ? 'is' : 'are'} right, but the order goes on.`
				};
			case 'long':
				return {
					tone: 'error',
					text: `The search stops sooner: the first ${c.length} are right, and that is the whole order.`
				};
			case 'wrong':
				return {
					tone: 'error',
					text:
						c.matched === 0
							? 'The first node is wrong.'
							: `The first ${c.matched} ${c.matched === 1 ? 'is' : 'are'} right; node ${c.matched + 1} is not.`
				};
		}
	}

	const prompt = $derived.by(() => {
		const kind = `${DRILL_ADJECTIVE[strategy]} ${mode === 'tree' ? 'tree' : 'graph'} search from S to G`;
		const limit = strategy === 'dls' ? ` with depth limit ℓ = ${drill.depthLimit}` : '';
		let text = `${kind}${limit}. Write the nodes in the order they are taken off the frontier, including G`;
		if (strategy === 'ids')
			text += ', every iteration in turn (bars between iterations are optional)';
		if (strategy === 'dls')
			text += `; nodes at depth ${drill.depthLimit} are taken off but not expanded. If no goal is found, write the whole order`;
		return `${text}.`;
	});
	const rules = $derived.by(() => {
		const parts = [
			'Successors in alphabetical order',
			'goal test when a node comes off the frontier'
		];
		if (costly) parts.push('ties first in, first out');
		if (mode === 'graph')
			parts.push(
				`graph search keeps an explored set; a child already on the frontier is ${
					strategy === 'ucs' || informed ? 'replaced only by a cheaper path' : 'not added again'
				}`
			);
		if (informed) parts.push('h is next to each state');
		return `${parts.join(' · ')}.`;
	});

	const result = $derived(check ? feedback(check) : null);
	const solution = $derived(drill.result.solution);
</script>

<div class="drill">
	<div class="controls">
		<Select
			label="Strategy"
			options={strategyOptions}
			bind:value={strategy}
			size="sm"
			inline
			onchange={reset}
		/>
		<SegmentedControl
			label="Repeated states"
			options={modeOptions}
			bind:value={mode}
			size="sm"
			onchange={reset}
		/>
		<Button
			size="sm"
			onclick={() => {
				seed++;
				reset();
			}}
		>
			{#snippet icon()}<Icon name="dice" size={15} />{/snippet}
			New problem
		</Button>
	</div>

	<p class="prompt">{prompt}</p>
	<p class="rules">{rules}</p>

	<StateGraph
		graph={drill.spec.graph}
		start="S"
		goals={['G']}
		heuristic={informed ? drill.spec.h : undefined}
		showCosts={costly}
		height={270}
		highlight={revealed && solution ? { path: solution.states } : undefined}
		ariaLabel="Search problem from S to G with states {names.join(', ')}"
	/>

	<form
		class="answer"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<TextField label="Expansion order" bind:value={answer} mono placeholder="S …" />
		<div class="buttons">
			<Button type="submit" variant="primary" size="sm">Check</Button>
			<Button size="sm" onclick={() => (revealed = !revealed)}>
				{revealed ? 'Hide answer' : 'Show answer'}
			</Button>
		</div>
	</form>

	<div aria-live="polite">
		{#if result}<Callout tone={result.tone}>{result.text}</Callout>{/if}
	</div>

	{#if revealed}
		<div class="reveal">
			{#each drill.iterations as it (it.limit)}
				<p class="order">
					{#if it.limit !== null}<span class="limit">ℓ = {it.limit}</span>{/if}
					<span class="mono">{it.order.join(' ')}</span>
				</p>
			{/each}
			<p>
				{#if solution}
					Path {solution.states.join(' → ')}, cost {solution.cost}; {drill.order.length} nodes taken off
					the frontier.
				{:else}
					No goal within depth {drill.depthLimit}: the search returns cutoff.
				{/if}
			</p>
			{#if href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
				<a class="tool-link" {href}>
					Step through it in the search tool <Icon name="arrow-right" size={15} />
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
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}
	.prompt,
	.rules {
		margin: 0;
	}
	.rules {
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	.answer {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-2) var(--space-3);
	}
	.answer :global(.field) {
		flex: 1 1 16rem;
	}
	.buttons {
		display: flex;
		gap: var(--space-2);
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
	.order {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		overflow-wrap: anywhere;
	}
	.limit {
		color: var(--text-3);
		font-size: var(--text-sm);
		white-space: nowrap;
	}
	.mono {
		font-family: var(--font-mono);
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
