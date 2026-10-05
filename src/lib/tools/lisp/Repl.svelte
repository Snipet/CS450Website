<!--
@component
A read-eval-print loop on the page's session: Enter evaluates the line in the
environment of the last Run, ↑/↓ recall earlier lines.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { Button, Icon } from '$lib/components/ui';
	import { formatTraceLine, type RunResult } from '$lib/theory/lisp';
	import LispCode from './LispCode.svelte';
	import { displayOutput } from './view';

	interface Props {
		/** Evaluates a line in the current session. */
		evaluate: (text: string) => RunResult;
		/** Changes when the session is replaced (a new Run); a marker is added to the log. */
		session: number;
	}

	let { evaluate, session }: Props = $props();

	interface Entry {
		id: number;
		kind: 'input' | 'reset';
		input: string;
		run: RunResult | null;
	}

	const MAX_ENTRIES = 200;
	const MAX_TRACE_SHOWN = 40;

	const uid = $props.id();
	let entries = $state.raw<Entry[]>([]);
	let input = $state('');
	let history: string[] = [];
	let cursor = -1;
	let draft = '';
	let nextId = 1;
	let announcement = $state('');
	let log = $state<HTMLElement>();
	let field = $state<HTMLInputElement>();

	let lastSession: number | undefined;
	$effect(() => {
		const s = session;
		if (lastSession !== undefined && s !== lastSession && entries.length)
			push({ id: nextId++, kind: 'reset', input: '', run: null });
		lastSession = s;
	});

	function push(entry: Entry) {
		const next = [...entries, entry];
		entries = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
	}

	async function submit() {
		const text = input.trim();
		if (!text) return;
		const run = evaluate(text);
		push({ id: nextId++, kind: 'input', input: text, run });
		if (history[history.length - 1] !== text) history.push(text);
		cursor = -1;
		draft = '';
		input = '';
		announcement = describe(run);
		await tick();
		if (log) log.scrollTop = log.scrollHeight;
	}

	function describe(run: RunResult): string {
		if (!run.read) return `Not evaluated: ${run.diagnostics[0]?.message ?? 'reading error'}`;
		return run.forms
			.map((f) => (f.error ? `Error: ${f.error.message}` : `Value: ${f.printed}`))
			.join(' ');
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.isComposing) {
			event.preventDefault();
			submit();
			return;
		}
		if (event.key === 'ArrowUp' && history.length) {
			event.preventDefault();
			if (cursor === -1) {
				draft = input;
				cursor = history.length - 1;
			} else if (cursor > 0) cursor--;
			input = history[cursor];
		} else if (event.key === 'ArrowDown' && cursor !== -1) {
			event.preventDefault();
			if (cursor < history.length - 1) {
				cursor++;
				input = history[cursor];
			} else {
				cursor = -1;
				input = draft;
			}
		}
	}

	function clear() {
		entries = [];
		announcement = 'Cleared.';
		field?.focus();
	}
</script>

<div class="repl">
	{#if entries.length}
		<div class="log" bind:this={log} role="log" aria-label="REPL history">
			{#each entries as e (e.id)}
				{#if e.kind === 'reset'}
					<p class="reset">Run: the environment was reloaded from the code.</p>
				{:else}
					<div class="entry">
						<div class="in">
							<span class="prompt" aria-hidden="true">&gt;</span><LispCode
								code={e.input}
								inline
								plain
							/>
						</div>
						{#if e.run && !e.run.read}
							{#each e.run.diagnostics as d, i (i)}
								<p class="out error">{d.message}</p>
							{/each}
						{:else if e.run}
							{#if e.run.output}<pre class="printed">{displayOutput(e.run.output)}</pre>{/if}
							{#if e.run.trace.length}
								<pre class="trace">{e.run.trace
										.slice(0, MAX_TRACE_SHOWN)
										.map(formatTraceLine)
										.join('\n')}{e.run.trace.length > MAX_TRACE_SHOWN
										? `\n… ${e.run.trace.length - MAX_TRACE_SHOWN} more lines`
										: ''}</pre>
							{/if}
							{#each e.run.forms as f (f.index)}
								{#if f.error}
									<p class="out error">{f.error.message}</p>
								{:else}
									<p class="out"><code>{f.printed}</code></p>
								{/if}
							{/each}
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="line">
		<label class="visually-hidden" for="{uid}-input">Expression to evaluate</label>
		<span class="prompt" aria-hidden="true">&gt;</span>
		<input
			bind:this={field}
			bind:value={input}
			id="{uid}-input"
			class="mono"
			type="text"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder="(my-function 1 2)"
			aria-describedby="{uid}-hint"
			{onkeydown}
		/>
		<Button size="sm" variant="primary" onclick={submit}>
			{#snippet icon()}<Icon name="arrow-right" />{/snippet}
			Evaluate
		</Button>
		{#if entries.length}
			<Button size="sm" variant="ghost" onclick={clear}>Clear</Button>
		{/if}
	</div>
	<p class="hint" id="{uid}-hint">
		Enter evaluates in the environment of the last Run; ↑ and ↓ recall earlier lines.
	</p>
	<p class="visually-hidden" aria-live="polite">{announcement}</p>
</div>

<style>
	.repl {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.log {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-height: 18rem;
		overflow: auto;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: var(--text-sm);
		overscroll-behavior: contain;
	}
	.entry {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.in {
		display: flex;
		gap: var(--space-2);
		min-width: 0;
	}
	.prompt {
		color: var(--accent);
		font-family: var(--font-mono);
		font-weight: 600;
	}
	.out {
		margin: 0;
		padding-left: 1.25rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.out code {
		padding: 0;
		border: 0;
		background: none;
		font-weight: 600;
	}
	.out.error {
		color: var(--reject);
	}
	.printed,
	.trace {
		margin: 0 0 0 1.25rem;
		color: var(--text-2);
		font-size: 0.8125rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.trace {
		color: var(--text-3);
	}
	.reset {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		border-top: 1px dashed var(--border-strong);
		padding-top: var(--space-1);
	}
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.line input {
		flex: 1 1 12rem;
		min-width: 0;
		height: 34px;
		padding: 0 10px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font-size: var(--text-sm);
	}
	.line input:focus-visible {
		border-color: var(--accent);
	}
	.line input::placeholder {
		color: var(--text-3);
	}
	.hint {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
</style>
