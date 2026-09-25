<!--
@component
The graph text editor (docs/ARCHITECTURE.md §4.2.1) with highlighting and
diagnostics, a short format reference, and how states are drawn.
-->
<script lang="ts">
	import CodeEditor from '$lib/components/ui/CodeEditor.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import type { NodeShape } from '$lib/components/search/graph-scene';
	import type { Diagnostic } from '$lib/theory/diagnostics';
	import { highlightGraphText } from '$lib/theory/graphs';

	interface Props {
		text: string;
		diagnostics: readonly Diagnostic[];
		shape: NodeShape;
		oninput: (text: string) => void;
		onshape: (shape: NodeShape) => void;
	}

	let { text, diagnostics, shape, oninput, onshape }: Props = $props();

	const shapeOptions: { value: NodeShape; label: string; title: string }[] = [
		{ value: 'circle', label: 'Circles', title: 'States as circles with the name inside' },
		{ value: 'square', label: 'Map squares', title: 'Small squares with the name beside them' }
	];

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
	<div class="below">
		<div class="format">
			<h3 class="format-title">Format</h3>
			<dl>
				{#each FORMAT as [code, text] (code)}
					<div class="row">
						<dt><code>{code}</code></dt>
						<dd>{text}</dd>
					</div>
				{/each}
			</dl>
		</div>
		<div class="shape">
			<SegmentedControl
				label="Draw states as"
				showLabel
				size="sm"
				options={shapeOptions}
				value={shape}
				onchange={onshape}
			/>
		</div>
	</div>
</div>

<style>
	.graph-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.below {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
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
