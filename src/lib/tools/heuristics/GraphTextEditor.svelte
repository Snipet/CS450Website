<!--
@component
The problem as graph text (docs/ARCHITECTURE.md §4.2.1) with highlighting,
diagnostics, and a short format reference. The `h:` lines hold the heuristic.
-->
<script lang="ts">
	import CodeEditor from '$lib/components/ui/CodeEditor.svelte';
	import type { Diagnostic } from '$lib/theory/diagnostics';
	import { highlightGraphText } from '$lib/theory/graphs';

	interface Props {
		text: string;
		diagnostics: readonly Diagnostic[];
		oninput: (text: string) => void;
	}

	let { text, diagnostics, oninput }: Props = $props();

	const FORMAT: [string, string][] = [
		['start: Arad', 'the start state'],
		['goal: Bucharest', 'goal states (several: goal: G1, G2)'],
		['Arad - Sibiu 140', 'an undirected edge with its step cost'],
		['S -> d 3', 'a directed edge (the graph becomes directed)'],
		['h: Arad=366, Sibiu=253', 'heuristic values (h = 0 when left out)'],
		['at: Arad 26 233', 'where to draw a state (optional)'],
		['# h: Straight-line distance', 'on the first line: what h is'],
		['"Rimnicu Vilcea"', 'quotes for names with spaces']
	];
</script>

<div class="graph-editor">
	<CodeEditor
		label="Graph text"
		value={text}
		language="graph"
		highlight={highlightGraphText}
		{diagnostics}
		minRows={8}
		maxRows={18}
		oninput={(v) => oninput(v)}
	/>
	<p class="note">
		Changing h, the start, or the goal outside this editor rewrites the text in canonical form
		(comments other than the <code># h:</code> label are dropped).
	</p>
	<div class="format">
		<h3 class="format-title">Format</h3>
		<dl>
			{#each FORMAT as [code, meaning] (code)}
				<div class="row">
					<dt><code>{code}</code></dt>
					<dd>{meaning}</dd>
				</div>
			{/each}
		</dl>
	</div>
</div>

<style>
	.graph-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
	.format-title {
		margin: 0 0 var(--space-1);
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	dl {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2px var(--space-4);
		margin: 0;
		font-size: var(--text-xs);
	}
	@media (min-width: 560px) {
		dl {
			grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		}
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
		min-width: 0;
	}
	dt code {
		font-size: 0.95em;
		white-space: nowrap;
	}
	dd {
		margin: 0;
		color: var(--text-2);
	}
</style>
