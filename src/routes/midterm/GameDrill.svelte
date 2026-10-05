<!--
@component
Game tree practice on a random tree with MAX at the root. The minimax focus
asks for the root's value and MAX's move; the alpha-beta focus asks for the
value and the leaves alpha-beta never looks up (marked by pressing them).
"Show answer" draws the searched tree and links to the minimax tool.
-->
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Callout from '$lib/components/ui/Callout.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import GameTree from '$lib/components/games/GameTree.svelte';
	import { toolLink } from '$lib/tools/links';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		GAME_SIZES,
		alphaBetaDisplay,
		blankDisplay,
		gameDrill,
		gradeGame,
		minimaxDisplay,
		type GameGrade,
		type GameSize
	} from './practice/game-drill';

	interface Props {
		focus: 'minimax' | 'alphabeta';
	}

	let { focus }: Props = $props();

	let size = $state<GameSize>('b2d3');
	let seed = $state(1);
	let value = $state('');
	let move = $state('');
	const pruned = new SvelteSet<number>();
	let grade = $state<GameGrade | null>(null);
	let revealed = $state(false);
	// svelte-ignore state_referenced_locally
	let view = $state<'minimax' | 'alphabeta'>(focus);

	const drill = $derived(gameDrill(seed, size));
	const display = $derived(
		!revealed
			? blankDisplay(drill.tree)
			: view === 'minimax'
				? minimaxDisplay(drill.minimax)
				: alphaBetaDisplay(drill.alphaBeta)
	);
	const href = $derived(toolLink('minimax', { tree: drill.text, algorithm: view }));
	const prunedCount = $derived(drill.leaves.filter((l) => l.pruned).length);
	const wrongLeaves = $derived(new Set(grade?.wrongLeaves ?? []));

	const sizeOptions = GAME_SIZES.map((s) => ({ value: s.id, label: s.label }));
	const moveOptions = $derived(drill.moves.map((m) => ({ value: m, label: m })));
	const viewOptions = [
		{ value: 'minimax' as const, label: 'Minimax values' },
		{ value: 'alphabeta' as const, label: 'Alpha-beta' }
	];

	function reset() {
		value = '';
		move = '';
		pruned.clear();
		grade = null;
		revealed = false;
	}

	function submit() {
		const n = value.trim() === '' ? null : Number(value.trim());
		grade = gradeGame(drill, {
			value: n === null || Number.isNaN(n) ? null : n,
			move: focus === 'minimax' && move ? move : null,
			pruned
		});
	}

	function toggleLeaf(id: number) {
		if (pruned.has(id)) pruned.delete(id);
		else pruned.add(id);
		grade = null;
	}

	const lines = $derived.by(() => {
		if (!grade) return null;
		const out: { ok: boolean | null; text: string }[] = [
			{
				ok: grade.value,
				text:
					grade.value === null
						? 'Root value: not answered.'
						: `Root value: ${grade.value ? 'right' : 'wrong'}.`
			}
		];
		if (focus === 'minimax')
			out.push({
				ok: grade.move,
				text:
					grade.move === null
						? 'MAX’s move: not answered.'
						: `MAX’s move: ${grade.move ? 'right' : 'wrong'}.`
			});
		else
			out.push({
				ok: grade.leaves,
				text: grade.leaves
					? 'Pruned leaves: right.'
					: `Pruned leaves: ${grade.wrongLeaves.length} wrong (outlined in red).`
			});
		return out;
	});
	const allRight = $derived(lines?.every((l) => l.ok === true) ?? false);
</script>

<div class="drill">
	<div class="controls">
		<Select
			label="Tree size"
			options={sizeOptions}
			bind:value={size}
			size="sm"
			inline
			onchange={reset}
		/>
		<Button
			size="sm"
			onclick={() => {
				seed++;
				reset();
			}}
		>
			{#snippet icon()}<Icon name="dice" size={15} />{/snippet}
			New tree
		</Button>
	</div>

	<p class="prompt">
		MAX moves at the root; terminal utilities are for MAX. {focus === 'minimax'
			? 'What is the minimax value of the root, and which move does MAX choose?'
			: 'What is the minimax value of the root, and which leaves does alpha-beta never look up? Children are searched left to right.'}
	</p>

	<GameTree tree={drill.tree} {display} maxHeight={380} legend={revealed} />

	<form
		class="answers"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<div class="value">
			<TextField
				label="Root value"
				bind:value
				inputmode="numeric"
				size="sm"
				oninput={() => (grade = null)}
			/>
		</div>
		{#if focus === 'minimax'}
			<SegmentedControl
				label="MAX’s move"
				showLabel
				options={moveOptions}
				bind:value={move}
				size="sm"
				onchange={() => (grade = null)}
			/>
		{/if}
		<div class="buttons">
			<Button type="submit" variant="primary" size="sm">Check</Button>
			<Button size="sm" onclick={() => (revealed = !revealed)}>
				{revealed ? 'Hide answer' : 'Show answer'}
			</Button>
		</div>
	</form>

	{#if focus === 'alphabeta'}
		<fieldset class="leaves">
			<legend>Leaves alpha-beta never looks up (press to mark)</legend>
			<div class="chips">
				{#each drill.leaves as leaf (leaf.id)}
					<button
						type="button"
						class={[
							'chip',
							{
								on: pruned.has(leaf.id),
								wrong: wrongLeaves.has(leaf.id),
								answer: revealed && leaf.pruned
							}
						]}
						aria-pressed={pruned.has(leaf.id)}
						aria-label="{leaf.action}, utility {leaf.utility}"
						onclick={() => toggleLeaf(leaf.id)}
					>
						<span class="utility">{leaf.utility}</span>
						<span class="action">{leaf.action}</span>
					</button>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div aria-live="polite">
		{#if lines}
			<Callout tone={allRight ? 'success' : 'error'}>
				{#each lines as line, i (i)}<span class="line">{line.text}</span>{/each}
			</Callout>
		{/if}
	</div>

	{#if revealed}
		<div class="reveal">
			<SegmentedControl label="Show" options={viewOptions} bind:value={view} size="sm" />
			<p>
				Minimax value {drill.value}; MAX chooses {drill.bestMoves.join(' or ')}. Alpha-beta looks up
				{drill.leaves.length - prunedCount} of {drill.leaves.length} leaves and never looks up {prunedCount}{focus ===
				'alphabeta'
					? ' (dashed in the leaf list)'
					: ''}.
			</p>
			{#if href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
				<a class="tool-link" {href}>
					Step through it in the minimax tool <Icon name="arrow-right" size={15} />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.drill {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.controls,
	.answers {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-2) var(--space-4);
	}
	.value {
		width: 8rem;
	}
	.buttons {
		display: flex;
		gap: var(--space-2);
	}
	.prompt {
		margin: 0;
	}
	.leaves {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	.leaves legend {
		margin-bottom: var(--space-2);
		padding: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		min-width: 2.75rem;
		padding: 4px 6px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		line-height: 1.2;
		cursor: pointer;
	}
	.chip:hover {
		border-color: var(--text-3);
	}
	.chip.on {
		border-color: var(--reject);
		background: var(--reject-soft);
		text-decoration: line-through;
	}
	.chip.wrong {
		outline: 2px solid var(--reject);
		outline-offset: 1px;
	}
	.chip.answer {
		border-style: dashed;
	}
	.utility {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.action {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.line {
		display: block;
	}
	.reveal {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.reveal p {
		margin: 0;
	}
	.tool-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 500;
	}
</style>
