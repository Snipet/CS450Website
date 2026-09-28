<script lang="ts">
	import type { ProgramId } from '$lib/theory/agents/vacuum';
	import { PROGRAM_CODE, firedLine, tokenizeCode } from './pseudocode';

	interface Props {
		program: ProgramId;
		/** Rule that chose the current action (null: none highlighted). */
		rule: number | null;
		/** Accessible name of the listing. */
		label: string;
	}

	let { program, rule, label }: Props = $props();

	const lines = $derived(PROGRAM_CODE[program]);
	const fired = $derived(rule === null ? -1 : firedLine(program, rule));
</script>

<div class="code" role="group" aria-label={label}>
	{#each lines as line, i (i)}
		<div
			class={['line', { fired: i === fired, head: line.indent === 0 }]}
			style="--indent: {line.indent}"
			aria-current={i === fired ? 'step' : undefined}
		>
			{#each tokenizeCode(line.text) as tok, j (j)}<span class={tok.kind}>{tok.text}</span
				>{/each}{#if i === fired}<span class="visually-hidden">
					(this line returns the action)</span
				>{/if}
		</div>
	{/each}
</div>

<style>
	.code {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: var(--space-2) 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: var(--text-sm);
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.line {
		position: relative;
		/* Hanging indent: wrapped text lines up past the line's own indentation. */
		padding: 3px var(--space-3) 3px calc(var(--space-3) + var(--indent) * 1.5rem + 1rem);
		border-left: 3px solid transparent;
		text-indent: -1rem;
		transition: background var(--duration) var(--ease);
	}
	.line.fired {
		border-left-color: var(--active);
		background: var(--active-soft);
	}
	.keyword {
		font-style: italic;
		color: var(--text-2);
	}
	.head .keyword:first-child,
	.function {
		font-style: normal;
		font-weight: 700;
		color: var(--text);
	}
	.variable {
		color: var(--syn-number);
	}
	.action {
		color: var(--syn-escape);
		font-weight: 500;
	}
	.text {
		color: var(--text);
	}
</style>
