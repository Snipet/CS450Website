<!--
@component
Read-only Lisp code with syntax highlighting (the CodeEditor's hl-* classes).
`inline` renders a <code> run; otherwise a block that wraps long lines.
-->
<script lang="ts">
	import { highlightLisp } from '$lib/theory/lisp';
	import { codeSegments } from './view';

	interface Props {
		code: string;
		inline?: boolean;
		/** Inline code without the chip background and border. */
		plain?: boolean;
		/** Accessible name for a block (e.g. "Definitions"). */
		label?: string;
		class?: string;
	}

	let { code, inline = false, plain = false, label, class: className }: Props = $props();

	const segments = $derived(codeSegments(code, highlightLisp(code)));
</script>

{#if inline}
	<code class={['lisp-inline', { plain }, className]}
		>{#each segments as s, i (i)}{#if s.className}<span class={s.className}>{s.text}</span
				>{:else}{s.text}{/if}{/each}</code
	>
{:else}
	<pre class={['lisp-block', className]} aria-label={label}><code
			>{#each segments as s, i (i)}{#if s.className}<span class={s.className}>{s.text}</span
					>{:else}{s.text}{/if}{/each}</code
		></pre>
{/if}

<style>
	.lisp-inline {
		font-family: var(--font-mono);
		font-size: 0.92em;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.lisp-inline.plain {
		padding: 0;
		border: 0;
		background: none;
	}
	.lisp-block {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: 0.875rem;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.lisp-block code {
		font-size: inherit;
	}
</style>
