<!--
@component
The game tree text editor with highlighting and diagnostics, and a short
reference of the format (src/lib/theory/games/text.ts).
-->
<script lang="ts">
	import CodeEditor from '$lib/components/ui/CodeEditor.svelte';
	import type { Diagnostic } from '$lib/theory/diagnostics';
	import { MAX_DEPTH, MAX_NODES, highlightGameTree } from '$lib/theory/games';

	interface Props {
		text: string;
		diagnostics: readonly Diagnostic[];
		oninput: (text: string) => void;
	}

	let { text, diagnostics, oninput }: Props = $props();

	const FORMAT: [string, string][] = [
		['[[3 12 8] [2 4 6]]', 'children in brackets, left to right; a number is a terminal utility'],
		['min: [[3 12] [2 4]]', 'MIN to move at the root (default max:)'],
		['[left: 3 right: [2 4]]', 'action labels (default A1, A2, …; A11, A12, … below)'],
		['{5}[3 12 8]', 'evaluation value of an internal node, for the depth cutoff'],
		['[(4,3,2) (1,5,2)]', 'utility tuples, one entry per player'],
		['order: 1 3 2', 'multi-player: the player to move at each level, cycling'],
		['# comment', 'to the end of the line; commas between nodes are optional']
	];
</script>

<div class="tree-editor">
	<CodeEditor
		label="Tree text"
		value={text}
		language="game-tree"
		highlight={highlightGameTree}
		{diagnostics}
		minRows={4}
		maxRows={16}
		oninput={(v) => oninput(v)}
	/>
	<div class="format">
		<h3 class="format-title">Format</h3>
		<dl>
			{#each FORMAT as [code, what] (code)}
				<div class="row">
					<dt><code>{code}</code></dt>
					<dd>{what}</dd>
				</div>
			{/each}
		</dl>
		<p class="limits">At most {MAX_DEPTH} levels and {MAX_NODES.toLocaleString('en-US')} nodes.</p>
	</div>
</div>

<style>
	.tree-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
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
		gap: 4px var(--space-4);
		margin: 0;
		font-size: var(--text-xs);
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
	.limits {
		margin: var(--space-2) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
</style>
