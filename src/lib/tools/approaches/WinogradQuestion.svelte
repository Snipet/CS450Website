<script lang="ts">
	import { tick } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { gradeWinograd, highlightSegments, type WinogradSchema } from './content';

	interface Props {
		schema: WinogradSchema;
		/** 1-based number shown on the card. */
		number: number;
	}

	let { schema, number }: Props = $props();

	const uid = $props.id();
	let choice = $state<number | null>(null);
	let revealed = $state(false);

	const result = $derived(gradeWinograd(schema, choice));
	const answer = $derived(schema.options[schema.answer]);
	const status = $derived.by(() => {
		if (!revealed) return '';
		return `${result === 'correct' ? 'Correct' : 'Answer'}: ${answer.toLowerCase()}.`;
	});

	let revealButton: HTMLButtonElement | undefined = $state();
	let againButton: HTMLButtonElement | undefined = $state();

	// Each button replaces the other, so focus moves to the one that appears.
	async function reveal() {
		revealed = true;
		await tick();
		againButton?.focus();
	}

	async function reset() {
		choice = null;
		revealed = false;
		await tick();
		revealButton?.focus();
	}
</script>

<article class="schema" aria-labelledby="{uid}-q">
	<header class="head">
		<span class="num" aria-hidden="true">{number}</span>
		<CitationTag cite={schema.cite} />
	</header>
	<p class="sentence">
		{#each highlightSegments(schema.sentence, schema.highlight) as seg, i (i)}{#if seg.mark}<mark
					>{seg.text}</mark
				>{:else}{seg.text}{/if}{/each}
	</p>
	<p class="question" id="{uid}-q">
		{#each highlightSegments(schema.question, schema.highlight) as seg, i (i)}{#if seg.mark}<mark
					>{seg.text}</mark
				>{:else}{seg.text}{/if}{/each}
	</p>
	<div class="options" role="group" aria-labelledby="{uid}-q">
		{#each schema.options as option, i (i)}
			{@const isAnswer = i === schema.answer}
			{@const picked = choice === i}
			<button
				type="button"
				class={[
					'option',
					{
						picked,
						right: revealed && isAnswer,
						wrong: revealed && picked && !isAnswer
					}
				]}
				aria-pressed={picked}
				disabled={revealed}
				onclick={() => (choice = i)}
			>
				<span class="letter" aria-hidden="true">{i + 1}</span>
				<span class="text">{option}</span>
				{#if revealed && isAnswer}
					<Icon name="check" size={16} label="correct answer" class="mark" />
				{:else if revealed && picked}
					<Icon name="x" size={16} label="your answer" class="mark" />
				{/if}
			</button>
		{/each}
	</div>
	<footer class="foot">
		{#if revealed}
			<Button size="sm" variant="ghost" onclick={reset} bind:element={againButton}>
				{#snippet icon()}<Icon name="reset" size={15} />{/snippet}
				Try again
			</Button>
		{:else}
			<Button size="sm" onclick={reveal} bind:element={revealButton}>
				{#snippet icon()}<Icon name="eye" size={15} />{/snippet}
				Reveal answer
			</Button>
		{/if}
		<p class={['status', result ?? 'none']} role="status">{status}</p>
	</footer>
</article>

<style>
	.schema {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-3) var(--space-4) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--surface-3);
		color: var(--text-2);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.sentence {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		line-height: 1.45;
	}
	.question {
		margin: 0;
		font-weight: 600;
	}
	mark {
		padding: 0 0.15em;
		border-radius: 3px;
		background: var(--active-soft);
		color: inherit;
		box-shadow: inset 0 -2px var(--active);
	}
	.options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
		gap: var(--space-2);
	}
	.option {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 40px;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font-size: var(--text-sm);
		text-align: left;
		cursor: pointer;
		transition:
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}
	.option:hover:not(:disabled) {
		background: var(--surface-2);
	}
	.option:disabled {
		cursor: default;
	}
	.letter {
		display: inline-grid;
		flex: none;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	.option.picked {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.option.picked .letter {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--accent-contrast);
	}
	.option.right {
		border-color: var(--accept);
		background: var(--accept-soft);
	}
	.option.right .letter {
		border-color: var(--accept);
		background: var(--accept);
		color: var(--surface);
	}
	.option.wrong {
		border-color: var(--reject);
		background: var(--reject-soft);
	}
	.option.wrong .letter {
		border-color: var(--reject);
		background: var(--reject);
		color: var(--surface);
	}
	.option :global(.mark) {
		flex: none;
	}
	.option.right :global(.mark) {
		color: var(--accept);
	}
	.option.wrong :global(.mark) {
		color: var(--reject);
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding-top: var(--space-1);
	}
	.status {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.status.correct {
		color: var(--accept);
	}
	.status.incorrect,
	.status.none {
		color: var(--text-2);
	}
</style>
