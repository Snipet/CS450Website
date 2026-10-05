<!--
@component
The trace of a run, indented as Common Lisp's TRACE prints it and grouped by
top-level form, with step controls over its lines. The current line, the
matching call or return, and the calls in progress are marked.
-->
<script lang="ts">
	import { Kbd, StepControls, Stepper, stepperKeys } from '$lib/components/ui';
	import { callStackAt, traceText, tracePartners, type RunResult } from '$lib/theory/lisp';
	import LispCode from './LispCode.svelte';
	import { describeTraceLine, traceGroups } from './view';

	interface Props {
		run: RunResult;
	}

	let { run }: Props = $props();

	const trace = $derived(run.trace);
	const stepper = new Stepper(() => trace.length, { speed: 2 });
	const step = $derived(stepper.index);
	const partners = $derived(tracePartners(trace));
	const stackLines = $derived(callStackAt(trace, step));
	const open = $derived(new Set(stackLines));
	const groups = $derived(traceGroups(run));

	let root = $state<HTMLElement>();
	let listing = $state<HTMLElement>();

	// A new run starts at its first line.
	let shownRun: RunResult | undefined;
	$effect(() => {
		if (run === shownRun) return;
		shownRun = run;
		stepper.pause();
		stepper.set(0);
	});

	// Keep the current line visible inside the listing (without scrolling the page).
	$effect(() => {
		const i = step;
		const box = listing;
		if (!box) return;
		const el = box.querySelector<HTMLElement>(`[data-line="${i}"]`);
		if (!el) return;
		const top = el.offsetTop - box.offsetTop;
		const bottom = top + el.offsetHeight;
		if (top < box.scrollTop + 8) box.scrollTop = Math.max(0, top - 40);
		else if (bottom > box.scrollTop + box.clientHeight - 8)
			box.scrollTop = bottom - box.clientHeight + 40;
	});

	/** Moves to trace line `line` and brings the trace into view. */
	export function show(line: number) {
		stepper.pause();
		stepper.set(line);
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		root?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
		// Focus moves into the trace so the arrow keys step through it.
		root?.focus({ preventScroll: true });
	}

	function select(i: number) {
		stepper.pause();
		stepper.set(i);
	}
</script>

<div class="trace-view" tabindex="-1" bind:this={root} {@attach stepperKeys(stepper)}>
	<StepControls {stepper} ariaLabel="Trace lines" noun="Line" speeds={[0.5, 1, 2, 4, 8]}>
		{#snippet label(i)}{describeTraceLine(trace, i)}{/snippet}
	</StepControls>
	<p class="stack">
		<span class="stack-label">Calls in progress:</span>
		{#if stackLines.length}
			{#each stackLines as line, k (line)}{#if k > 0}<span class="sep" aria-hidden="true">
						→
					</span><span class="visually-hidden">, </span>{/if}<code>{trace[line].text}</code>{/each}
		{:else}
			none
		{/if}
	</p>

	<div class="listing" bind:this={listing}>
		{#each groups as g (g.form)}
			<section class="group" aria-label="Trace of {g.text}">
				<p class="group-title"><LispCode code={g.text} inline plain /></p>
				<ol class="lines">
					{#each trace.slice(g.start, g.end) as e, k (g.start + k)}
						{@const i = g.start + k}
						<li
							data-line={i}
							class={[
								'line',
								e.kind,
								{
									current: i === step,
									partner: i === partners[step],
									open: open.has(i) && i !== step
								}
							]}
							style="--depth: {e.depth}"
						>
							<button
								type="button"
								tabindex="-1"
								aria-current={i === step ? 'step' : undefined}
								onclick={() => select(i)}>{traceText(e)}</button
							>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	</div>
	{#if run.traceTruncated}
		<p class="note">
			The trace stopped at {trace.length.toLocaleString('en-US')} lines; evaluation went on.
		</p>
	{/if}
	<p class="keys">
		With focus in the trace: <Kbd>←</Kbd>
		<Kbd>→</Kbd> previous and next line, <Kbd>Home</Kbd>
		<Kbd>End</Kbd> first and last, <Kbd>Space</Kbd> play or pause.
	</p>
</div>

<style>
	.trace-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.trace-view:focus {
		outline: none;
	}
	.stack {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		overflow-wrap: anywhere;
	}
	.stack-label {
		color: var(--text-3);
		font-weight: 600;
		font-size: var(--text-xs);
		letter-spacing: 0.03em;
		margin-right: var(--space-1);
	}
	.sep {
		color: var(--text-3);
	}
	.listing {
		max-height: 30rem;
		overflow: auto;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		overscroll-behavior: contain;
	}
	.group + .group {
		margin-top: var(--space-3);
		padding-top: var(--space-2);
		border-top: 1px dashed var(--border-strong);
	}
	.group-title {
		margin: 0 0 var(--space-1);
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.lines {
		margin: 0;
		padding: 0;
		list-style: none;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.6;
	}
	.line {
		padding-left: calc(min(var(--depth), 40) * 2ch);
		white-space: pre;
	}
	.line button {
		padding: 0 6px;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
		white-space: pre;
	}
	.line.return button {
		color: var(--text-2);
	}
	.line button:hover {
		background: var(--surface-3);
	}
	.line.open button {
		border-left: 2px solid var(--active);
	}
	.line.partner button {
		background: var(--active-soft);
		border-color: color-mix(in srgb, var(--active) 45%, transparent);
	}
	.line.current button {
		background: var(--active-soft);
		border-color: var(--active);
		color: var(--text);
		font-weight: 600;
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.keys {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
		line-height: 1.8;
	}
	@media (hover: none) {
		.keys {
			display: none;
		}
	}
</style>
