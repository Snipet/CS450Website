<!--
@component
The pseudocode of the running algorithm with the current step's line
highlighted, and (alpha-beta) the open Max-Value / Min-Value calls with their
α, β, and v.
-->
<script lang="ts">
	import { formatBound } from '$lib/components/games/types';
	import { fnName, nodeName, type GameTree } from '$lib/theory/games';
	import { tokenizeCode, type CodeListing, type LineId } from './pseudocode';
	import type { CallFrame } from './view';

	interface Props {
		listing: CodeListing;
		line: LineId | null;
		/** Open calls, root first (alpha-beta); null hides the call stack. */
		stack: readonly CallFrame[] | null;
		tree: GameTree;
	}

	let { listing, line, stack, tree }: Props = $props();
</script>

<div class="code-panel">
	<div class="code" role="group" aria-label="Pseudocode: {listing.title}">
		{#each listing.lines as l (l.id)}
			<div
				class={['line', { current: l.id === line, head: l.head, gap: l.gap }]}
				style="--indent: {l.indent}"
				aria-current={l.id === line ? 'step' : undefined}
			>
				{#each tokenizeCode(l.text, l.prose) as tok, j (j)}<span class={tok.kind}
						>{tok.text}{#if tok.sub}<sub>{tok.sub}</sub>{/if}</span
					>{/each}{#if l.id === line}<span class="visually-hidden"> (current step)</span>{/if}
			</div>
		{/each}
	</div>
	{#if stack}
		<div class="stack">
			<h3 class="stack-title">Open calls</h3>
			{#if stack.length}
				<ol>
					{#each stack as f, i (i)}
						<li
							class={{ top: i === stack.length - 1 }}
							style="margin-left: {Math.min(i, 10) * 0.75}rem"
						>
							<span class={f.fn}>{fnName(f.fn)}</span>({nodeName(tree, f.node)},
							<span class="alpha">α</span> = {formatBound(f.alpha)},
							<span class="beta">β</span> = {formatBound(f.beta)})
							<span class="v">v = {formatBound(f.v)}</span>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="none">None.</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.code-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.code {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: var(--space-2) 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: var(--text-sm);
		line-height: 1.45;
		overflow-wrap: anywhere;
	}
	.line {
		padding: 2px var(--space-3) 2px calc(var(--space-3) + var(--indent) * 1.25rem + 1rem);
		border-left: 3px solid transparent;
		text-indent: -1rem;
		transition: background var(--duration) var(--ease);
	}
	.line.gap {
		margin-top: var(--space-2);
	}
	.line.current {
		border-left-color: var(--active);
		background: var(--active-soft);
	}
	.keyword {
		font-style: italic;
		color: var(--text-2);
	}
	.head .keyword:first-child {
		font-style: normal;
		font-weight: 700;
		color: var(--text);
	}
	.function {
		color: var(--text);
		font-weight: 500;
	}
	.head .function {
		font-weight: 700;
	}
	.max,
	.alpha {
		color: var(--tok-4);
		font-weight: 600;
	}
	.min,
	.beta {
		color: var(--tok-0);
		font-weight: 600;
	}
	.text {
		color: var(--text);
	}
	sub {
		font-size: 0.72em;
		font-weight: 400;
	}
	.stack-title {
		margin: 0 0 var(--space-1);
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	ol {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
	li {
		padding: 3px var(--space-2);
		border-radius: var(--radius-sm);
		overflow-wrap: anywhere;
	}
	li.top {
		background: var(--surface-2);
	}
	.v {
		margin-left: var(--space-2);
		color: var(--accent);
		font-weight: 600;
		white-space: nowrap;
	}
	.none {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
</style>
