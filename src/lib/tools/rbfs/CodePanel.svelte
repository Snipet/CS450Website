<!--
@component
Russell & Norvig's RBFS pseudocode with the lines of the current step
highlighted, and the open calls with their f_limit and f.
-->
<script lang="ts">
	import { formatNumber } from '$lib/components/search/describe';
	import { RBFS_CODE, tokenizeCode, type StepLines } from './pseudocode';
	import type { TreeView } from './view';

	interface Props {
		lines: StepLines;
		view: TreeView;
	}

	let { lines, view }: Props = $props();

	/** Open calls listed (the deepest ones). */
	const MAX_CALLS = 12;

	const active = $derived(new Set(lines.lines));
	const calls = $derived.by(() => {
		const byId = new Map(view.nodes.map((n) => [n.id, n]));
		const open = view.path.map((id) => byId.get(id)!);
		// A returning call is still shown, last, until the step is over.
		const cur = view.current === null ? undefined : byId.get(view.current);
		if (cur && cur.limit !== null && !view.path.includes(cur.id)) open.push(cur);
		return open;
	});
	const hiddenCalls = $derived(Math.max(0, calls.length - MAX_CALLS));
	const shownCalls = $derived(calls.slice(hiddenCalls));
</script>

<div class="code-panel">
	<div class="code" role="group" aria-label="Pseudocode: recursive best-first search">
		{#each RBFS_CODE as l (l.id)}
			<div
				class={[
					'line',
					{ on: active.has(l.id), main: l.id === lines.main, head: l.head, gap: l.gap }
				]}
				style="--indent: {l.indent}"
				aria-current={l.id === lines.main ? 'step' : undefined}
			>
				{#each tokenizeCode(l.text) as tok, j (j)}<span class={tok.kind}>{tok.text}</span
					>{/each}{#if l.comment}<span class="comment">/* {l.comment} */</span
					>{/if}{#if l.id === lines.main}<span class="visually-hidden">
						(current step)</span
					>{:else if active.has(l.id)}<span class="visually-hidden"> (run in this step)</span>{/if}
			</div>
		{/each}
	</div>
	<div class="stack">
		<h3 class="stack-title">Open calls</h3>
		{#if calls.length}
			{#if hiddenCalls}
				<p class="none">{hiddenCalls} earlier {hiddenCalls === 1 ? 'call' : 'calls'} not listed.</p>
			{/if}
			<ol>
				{#each shownCalls as n, i (n.id)}
					<li
						class={{ top: n.id === view.current }}
						style="margin-left: {Math.min(i, 10) * 0.75}rem"
					>
						RBFS({n.label}, f_limit = {formatNumber(n.limit ?? Infinity)})
						<span class="f">f = {formatNumber(n.f)}</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="none">None.</p>
		{/if}
	</div>
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
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		font-size: var(--text-xs);
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.line {
		padding: 2px var(--space-3) 2px calc(var(--space-3) + var(--indent) * 1.1rem + 1rem);
		border-left: 3px solid transparent;
		text-indent: -1rem;
		transition: background var(--duration) var(--ease);
	}
	.line.gap {
		margin-top: var(--space-2);
	}
	.line.on {
		background: var(--active-soft);
	}
	.line.main {
		border-left-color: var(--active);
	}
	.keyword {
		font-weight: 700;
		color: var(--text);
	}
	.name {
		font-variant: small-caps;
		text-transform: lowercase;
		color: var(--text);
		font-weight: 500;
	}
	.head .name {
		font-weight: 700;
	}
	.text {
		color: var(--text);
	}
	.comment {
		margin-left: 1ch;
		color: var(--text-3);
		font-style: italic;
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
		background: var(--active-soft);
	}
	.f {
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
