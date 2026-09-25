<!--
	The problem the strategies run on: facts (start, goals, h, b, the cheapest
	path), the state-space graph with one path highlighted, and the graph text,
	read-only with its diagnostics. Editing happens in the search tool.
-->
<script lang="ts">
	import StateGraph from '$lib/components/search/StateGraph.svelte';
	import CodeEditor from '$lib/components/ui/CodeEditor.svelte';
	import Disclosure from '$lib/components/ui/Disclosure.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import type { Diagnostic } from '$lib/theory/diagnostics';
	import { highlightGraphText, type GraphProblemSpec } from '$lib/theory/graphs';
	import { formatCost, pathText } from './compare';
	import { shapeFor } from './problems';
	import { problemFacts, type PathChoice, type PathOption } from './problem-view';

	interface Props {
		/** The parsed problem, or null when the text has errors. */
		spec: GraphProblemSpec | null;
		text: string;
		diagnostics: readonly Diagnostic[];
		/** Open the graph text at first (a graph from a link). */
		showText?: boolean;
		options: readonly PathOption[];
		path: PathChoice;
		/** Link to edit the graph in the search tool, or null. */
		editLink: string | null;
		onpath: (choice: PathChoice) => void;
	}

	let {
		spec,
		text,
		diagnostics,
		showText = false,
		options,
		path,
		editLink,
		onpath
	}: Props = $props();

	const facts = $derived(spec ? problemFacts(spec) : null);
	const shown = $derived(options.find((o) => o.value === path) ?? options[0]);
	const highlighted = $derived(shown?.states ?? []);
	const hText = $derived.by(() => {
		if (!facts || !spec?.h || facts.hCount === 0) return 'none: greedy and A* use h = 0';
		return spec.hLabel ?? `${facts.hCount} ${facts.hCount === 1 ? 'value' : 'values'}`;
	});

	const graphLabel = $derived(
		facts
			? `${facts.directed ? 'Directed' : 'Undirected'} state-space graph with ${facts.states} states, start ${facts.start}, ${
					facts.goals.length === 1 ? 'goal' : 'goals'
				} ${facts.goals.join(', ')}.${
					highlighted.length ? ` Highlighted: ${shown.label}, ${pathText(highlighted)}.` : ''
				}`
			: ''
	);
</script>

<div class="problem">
	{#if spec && facts}
		<dl class="facts">
			<div class="fact">
				<dt>Start</dt>
				<dd>{facts.start}</dd>
			</div>
			<div class="fact">
				<dt>{facts.goals.length === 1 ? 'Goal' : 'Goals'}</dt>
				<dd>{facts.goals.join(', ')}</dd>
			</div>
			<div class="fact">
				<dt>h(n)</dt>
				<dd class:muted={facts.hCount === 0}>{hText}</dd>
			</div>
			<div class="fact">
				<dt>b</dt>
				<dd>{facts.branching} <span class="muted">(most successors of any state)</span></dd>
			</div>
			<div class="fact">
				<dt>Cheapest</dt>
				<dd>
					{#if facts.cheapest}
						{pathText(facts.cheapest.states)}
						<span class="muted"
							>(cost {formatCost(facts.cheapest.cost)}, d = {facts.cheapest.depth})</span
						>
					{:else}
						<span class="muted">no goal is reachable</span>
					{/if}
				</dd>
			</div>
		</dl>

		<div class="graph-head">
			<Select
				label="Highlight"
				inline
				size="sm"
				options={options.map((o) => ({ value: o.value, label: o.label }))}
				value={path}
				onchange={onpath}
			/>
		</div>
		<StateGraph
			graph={spec.graph}
			start={spec.start}
			goals={spec.goals}
			heuristic={facts.hCount > 0 ? spec.h : undefined}
			highlight={{ path: [...highlighted] }}
			nodeShape={shapeFor(spec.graph)}
			height={340}
			ariaLabel={graphLabel}
		/>
	{/if}

	<div class="text">
		<Disclosure summary="Graph text" openSummary="Hide graph text" variant="boxed" open={showText}>
			<CodeEditor
				value={text}
				readonly
				ariaLabel="Graph text (read-only)"
				language="graph"
				highlight={highlightGraphText}
				{diagnostics}
				source={null}
				minRows={4}
				maxRows={14}
			/>
		</Disclosure>
	</div>
	{#if editLink}
		<p class="links">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
			<a href={editLink}><Icon name="pencil" size={14} /> Edit the graph in the search tool</a>
		</p>
	{/if}
</div>

<style>
	.problem {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.facts {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		margin: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: var(--text-sm);
	}
	.fact {
		display: contents;
	}
	dt,
	dd {
		padding: 5px var(--space-3);
	}
	.fact + .fact dt,
	.fact + .fact dd {
		border-top: 1px solid var(--border);
	}
	dt {
		padding-right: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		line-height: 1.9;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.muted {
		color: var(--text-3);
	}
	.graph-head {
		display: flex;
		justify-content: flex-end;
		margin-bottom: calc(-1 * var(--space-2));
	}
	.links {
		margin: 0;
		font-size: var(--text-sm);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
</style>
