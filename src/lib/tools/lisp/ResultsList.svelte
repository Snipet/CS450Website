<!--
@component
The value (or error) and printed output of each top-level form of a run.
-->
<script lang="ts">
	import { Icon } from '$lib/components/ui';
	import type { FormResult } from '$lib/theory/lisp';
	import LispCode from './LispCode.svelte';
	import { displayOutput, oneLine } from './view';

	interface Props {
		forms: readonly FormResult[];
		/** Shows a form's trace lines (called with the form's first trace line). */
		ontrace?: (line: number) => void;
	}

	let { forms, ontrace }: Props = $props();
</script>

<ol class="results">
	{#each forms as f (f.index)}
		{@const lines = f.traceEnd - f.traceStart}
		<li class={['result', { failed: f.error }]}>
			<div class="form" title={f.text.length > 100 ? f.text : undefined}>
				<LispCode code={oneLine(f.text, 100)} inline />
			</div>
			{#if f.output}
				<div class="output">
					<span class="visually-hidden">Output:</span>
					<pre>{displayOutput(f.output)}</pre>
				</div>
			{/if}
			{#if f.error}
				<p class="value error">
					<Icon name="error" size={15} label="Error" />
					<span>{f.error.message}</span>
				</p>
			{:else}
				<p class="value">
					<span class="arrow" aria-hidden="true">⇒</span>
					<span class="visually-hidden">Value:</span>
					<code>{f.printed}</code>
				</p>
			{/if}
			{#if ontrace && lines > 0}
				<button type="button" class="trace-link" onclick={() => ontrace(f.traceStart)}>
					Trace: {lines.toLocaleString('en-US')} line{lines === 1 ? '' : 's'}
				</button>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.results {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.result {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-2) 0;
		border-top: 1px solid var(--border);
		min-width: 0;
	}
	.result:first-child {
		border-top: 0;
		padding-top: 0;
	}
	.form {
		color: var(--text-2);
		font-size: var(--text-sm);
		min-width: 0;
	}
	.value {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		margin: 0;
		min-width: 0;
		font-size: var(--text-sm);
	}
	.value code {
		padding: 0;
		border: 0;
		background: none;
		font-weight: 600;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.arrow {
		color: var(--accept);
		font-weight: 600;
	}
	.value.error {
		color: var(--reject);
		align-items: flex-start;
	}
	.value.error :global(.icon) {
		flex: none;
		margin-top: 3px;
	}
	.output pre {
		margin: 2px 0;
		padding: 4px var(--space-2);
		border-left: 3px solid var(--border-strong);
		background: var(--surface-2);
		color: var(--text);
		font-size: 0.8125rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.trace-link {
		align-self: flex-start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font-size: var(--text-xs);
		cursor: pointer;
	}
	.trace-link:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
