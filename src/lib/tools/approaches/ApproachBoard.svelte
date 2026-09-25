<script lang="ts">
	import { tick } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import PresetMenu from '$lib/components/ui/PresetMenu.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { toneStyle } from '$lib/components/ui/tones';
	import type { Preset } from '$lib/components/ui/types';
	import {
		BOARD_PRESETS,
		MAX_TEXT_LENGTH,
		addItem,
		itemsIn,
		placeItem,
		removeItem,
		type BoardItem
	} from './board';
	import {
		BOARD_CITE,
		DIMENSIONS,
		STANDARDS,
		approachAt,
		approachById,
		cellLabel,
		type ApproachId
	} from './content';
	import QuadrantPicker from './QuadrantPicker.svelte';

	interface Props {
		board: BoardItem[];
		onchange: (board: BoardItem[]) => void;
	}

	let { board, onchange }: Props = $props();

	const uid = $props.id();
	const itemId = (index: number) => `${uid}-item-${index}`;
	const actionId = (index: number) => `${uid}-act-${index}`;

	let draft = $state('');
	let error = $state<string | undefined>();
	let input: HTMLInputElement | undefined = $state();
	let announcement = $state('');
	let dragging = $state<number | null>(null);
	let over = $state<string | null>(null);

	const unplaced = $derived(itemsIn(board, null));
	const boardKey = $derived(JSON.stringify(board));
	const selectedPreset = $derived(
		BOARD_PRESETS.find((p) => JSON.stringify(p.value) === boardKey)?.id ?? null
	);

	/** Rows of the table, each with its two approaches. */
	const rows = DIMENSIONS.map((d) => ({
		...d,
		cells: STANDARDS.map((s) => approachAt(d.id, s.id))
	}));

	let flip = false;
	function announce(message: string) {
		// A trailing no-break space makes a repeated message count as new.
		flip = !flip;
		announcement = flip ? message : `${message}\u00a0`;
	}

	function load(preset: Preset<BoardItem[]>) {
		onchange(preset.value.map((item) => ({ ...item })));
		error = undefined;
		announce(`Loaded ${preset.label}: ${preset.value.length} applications.`);
	}

	function add() {
		const result = addItem(board, draft);
		if (result.index === null) {
			error = result.diagnostics[0]?.message;
			return;
		}
		onchange(result.board);
		announce(`Added ${result.board[result.index].text} to Unplaced.`);
		draft = '';
		error = undefined;
		input?.focus();
	}

	async function place(index: number, at: ApproachId | null) {
		const item = board[index];
		if (!item || item.at === at) return;
		const hadFocus = document.activeElement?.closest(`[data-item="${index}"]`) != null;
		onchange(placeItem(board, index, at));
		announce(
			at
				? `${item.text} placed in ${approachById(at).title}.`
				: `${item.text} moved back to Unplaced.`
		);
		if (!hadFocus) return;
		await tick();
		const target = at ?? 'acting-humanly';
		document.getElementById(`${itemId(index)}-${target}`)?.focus();
	}

	async function remove(index: number) {
		const item = board[index];
		if (!item) return;
		const position = unplaced.findIndex((u) => u.index === index);
		const next = removeItem(board, index);
		onchange(next);
		announce(`Deleted ${item.text}.`);
		await tick();
		const tray = itemsIn(next, null);
		const target = tray[position] ?? tray[position - 1];
		if (target) document.getElementById(actionId(target.index))?.focus();
		else input?.focus();
	}

	// Drag and drop (pointer only; the grids and buttons do the same with the keyboard).
	function dragStart(event: DragEvent, index: number) {
		dragging = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', board[index]?.text ?? '');
		}
	}
	function dragEnd() {
		dragging = null;
		over = null;
	}
	function dragOver(event: DragEvent, key: string) {
		if (dragging === null) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		over = key;
	}
	function dragLeave(event: DragEvent, key: string) {
		const target = event.currentTarget as HTMLElement;
		if (over === key && !target.contains(event.relatedTarget as Node | null)) over = null;
	}
	function drop(event: DragEvent, at: ApproachId | null) {
		event.preventDefault();
		if (dragging !== null) place(dragging, at);
		dragEnd();
	}
</script>

{#snippet chip(item: BoardItem, index: number)}
	<li
		class={['chip', { placed: item.at !== null, dragging: dragging === index }]}
		style={item.at ? toneStyle(approachById(item.at).tone) : undefined}
		data-item={index}
		draggable="true"
		ondragstart={(e) => dragStart(e, index)}
		ondragend={dragEnd}
	>
		<QuadrantPicker
			value={item.at}
			label="Approach for {item.text}"
			idPrefix={itemId(index)}
			onchange={(id) => place(index, id)}
		/>
		<span class="chip-text">{item.text}</span>
		{#if item.at}
			<IconButton
				id={actionId(index)}
				size="sm"
				icon="x"
				label="Move {item.text} back to Unplaced"
				onclick={() => place(index, null)}
			/>
		{:else}
			<IconButton
				id={actionId(index)}
				size="sm"
				icon="trash"
				label="Delete {item.text}"
				onclick={() => remove(index)}
			/>
		{/if}
	</li>
{/snippet}

{#snippet zone(at: ApproachId)}
	{@const a = approachById(at)}
	{@const entries = itemsIn(board, at)}
	<section
		class={['quadrant', { over: over === at }]}
		style={toneStyle(a.tone)}
		aria-labelledby="{uid}-{at}-title"
		ondragover={(e) => dragOver(e, at)}
		ondragleave={(e) => dragLeave(e, at)}
		ondrop={(e) => drop(e, at)}
	>
		<header class="zone-head">
			<h3 id="{uid}-{at}-title">{a.title}</h3>
			<span class="zone-cell">{cellLabel(a)}</span>
			<Badge tone={a.tone} class="count">{entries.length}</Badge>
		</header>
		{#if entries.length}
			<ul class="chips">
				{#each entries as entry (entry.index)}
					{@render chip(entry.item, entry.index)}
				{/each}
			</ul>
		{:else}
			<p class="empty">No applications yet.</p>
		{/if}
	</section>
{/snippet}

<Panel title="The problem dictates the approach">
	{#snippet actions()}
		<PresetMenu
			presets={BOARD_PRESETS}
			selected={selectedPreset}
			onselect={load}
			label="Load"
			size="sm"
			align="end"
		/>
	{/snippet}

	<div class="intro">
		<p class="prompt">
			Brainstorm various AI applications and decide which approach is best for the application…
			<CitationTag cite={BOARD_CITE} />
		</p>
		<p class="how">
			Each application has a small 2 × 2 grid laid out like the table: pick a square to place the
			application in that approach, or drag the application onto a quadrant. Copy link shares the
			board.
		</p>
	</div>

	<div class="add">
		<TextField
			bind:value={draft}
			bind:element={input}
			label="New application"
			placeholder="e.g. Spam filtering"
			maxlength={MAX_TEXT_LENGTH}
			{error}
			oninput={() => (error = undefined)}
			onsubmit={add}
		/>
		<Button variant="primary" onclick={add}>
			{#snippet icon()}<Icon name="plus" size={16} />{/snippet}
			Add
		</Button>
	</div>

	<div class="board">
		<section
			class={['tray', { over: over === 'tray' }]}
			aria-labelledby="{uid}-tray-title"
			ondragover={(e) => dragOver(e, 'tray')}
			ondragleave={(e) => dragLeave(e, 'tray')}
			ondrop={(e) => drop(e, null)}
		>
			<header class="zone-head">
				<h3 id="{uid}-tray-title">Unplaced</h3>
				<Badge class="count">{unplaced.length}</Badge>
			</header>
			{#if unplaced.length}
				<ul class="chips">
					{#each unplaced as entry (entry.index)}
						{@render chip(entry.item, entry.index)}
					{/each}
				</ul>
			{:else if board.length}
				<p class="empty">Every application is placed.</p>
			{:else}
				<p class="empty">No applications. Add one above or load a list.</p>
			{/if}
		</section>

		<div class="quadrants">
			<span class="axis corner" aria-hidden="true"></span>
			{#each STANDARDS as s (s.id)}
				<span class="axis col" aria-hidden="true">{s.label}</span>
			{/each}
			{#each rows as row (row.id)}
				<span class="axis row" aria-hidden="true">{row.label}</span>
				{#each row.cells as a (a.id)}
					{@render zone(a.id)}
				{/each}
			{/each}
		</div>
	</div>

	<p class="visually-hidden" role="status">{announcement}</p>
</Panel>

<style>
	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-width: var(--content-width);
		margin-bottom: var(--space-4);
	}
	.intro p {
		margin: 0;
	}
	.prompt {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		line-height: 1.45;
	}
	.how {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.add {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		max-width: 30rem;
		margin-bottom: var(--space-5);
	}
	.add :global(.field) {
		flex: 1;
	}
	.add :global(.btn) {
		margin-top: calc(var(--text-sm) * 1.6 + 6px);
	}

	.board {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		align-items: start;
	}
	@media (min-width: 960px) {
		.board {
			grid-template-columns: minmax(14rem, 19rem) minmax(0, 1fr);
		}
	}

	.tray,
	.quadrant {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-3);
		border-radius: var(--radius);
		transition:
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}
	.tray {
		border: 1px solid var(--border);
		background: var(--surface-2);
	}
	.tray.over {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.quadrant {
		min-height: 8.5rem;
		border: 1px solid var(--border);
		border-top: 3px solid var(--tone-fg);
		background: var(--surface);
	}
	.quadrant.over {
		border-color: var(--tone-fg);
		background: var(--tone-bg);
	}
	.zone-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px var(--space-2);
	}
	.zone-head h3 {
		margin: 0;
		font-size: var(--text-base);
	}
	.zone-cell {
		display: none;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.zone-head :global(.count) {
		margin-left: auto;
		align-self: center;
	}
	.empty {
		margin: 0;
		padding: var(--space-3);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
		color: var(--text-3);
		font-size: var(--text-sm);
		text-align: center;
	}

	.chips {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 38px;
		padding: 3px 3px 3px 8px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		cursor: grab;
	}
	.chip.placed {
		border-left: 3px solid var(--tone-fg);
	}
	.chip.dragging {
		opacity: 0.5;
	}
	.chip-text {
		flex: 1;
		min-width: 0;
		font-size: var(--text-sm);
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.quadrant .chips {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
	}

	.quadrants {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-2);
	}
	.axis {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.axis.col {
		padding: 0 var(--space-1);
	}
	.axis.row {
		align-self: center;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
	}
	@media (max-width: 640px) {
		.quadrants {
			grid-template-columns: minmax(0, 1fr);
		}
		.axis {
			display: none;
		}
		/* Title and count on the first line, the table cell on its own line below. */
		.zone-cell {
			display: block;
			flex-basis: 100%;
			order: 3;
		}
		.add {
			max-width: none;
		}
	}
</style>
