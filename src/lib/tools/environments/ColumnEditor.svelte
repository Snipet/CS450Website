<script lang="ts">
	import {
		Button,
		Callout,
		CitationTag,
		Icon,
		IconButton,
		Panel,
		SegmentedControl,
		TextField,
		toneStyle
	} from '$lib/components/ui';
	import {
		DIMENSIONS,
		SLIDE_17,
		profileDiagnostics,
		type Dimension,
		type DimensionValue
	} from '$lib/theory/agents/environments';
	import {
		MAX_NAME_LENGTH,
		columnExample,
		columnName,
		columnProfile,
		isEdited,
		type Column
	} from './state';
	import { columnSource, dimensionNote, valueTone } from './view';

	interface Props {
		column: Column;
		onvalue: (dimension: Dimension, value: DimensionValue | undefined) => void;
		onrename: (name: string) => void;
		onreset: () => void;
		onduplicate: () => void;
		onremove: () => void;
	}

	let { column, onvalue, onrename, onreset, onduplicate, onremove }: Props = $props();

	const uid = $props.id();
	const example = $derived(columnExample(column));
	const profile = $derived(columnProfile(column));
	const edited = $derived(isEdited(column));
	const source = $derived(columnSource(column));
	const diagnostics = $derived(profileDiagnostics(profile));

	const options = DIMENSIONS.map((d) =>
		d.values.map((v) => ({ value: v.id as string, label: v.label, title: v.name }))
	);
</script>

<Panel title={columnName(column)} subtitle={source.text}>
	<div class="editor">
		{#if column.kind === 'custom'}
			<TextField
				label="Name"
				size="sm"
				value={column.name}
				maxlength={MAX_NAME_LENGTH}
				oninput={(e) => onrename(e.currentTarget.value)}
			/>
		{/if}

		<div class="source">
			{#if example?.source === 'slide'}
				<span>{edited ? 'Changed from the values in' : 'Values as in'}</span>
				<CitationTag cite={SLIDE_17} />
			{:else if example}
				<span
					>{edited ? 'Changed from this site’s classification' : 'Values classified on this site'}.
					Appears in</span
				>
				{#each example.appears as cite, i (i)}<CitationTag {cite} />{/each}
			{:else}
				<span>Set a value for each dimension, or leave it unset.</span>
			{/if}
		</div>

		<ul class="dims" aria-label="Environment type of {columnName(column)}">
			{#each DIMENSIONS as d, i (d.id)}
				{@const value = profile[d.id]}
				{@const note = dimensionNote(column, d.id)}
				<li class="dim">
					<span class="dim-label" id="{uid}-{d.id}">
						<span
							class={['swatch', { unset: value === undefined }]}
							style={toneStyle(valueTone(d.id, value))}
							aria-hidden="true"
						></span>
						{d.label}
					</span>
					<div class="control">
						<SegmentedControl
							size="sm"
							label={d.label}
							options={options[i]}
							value={value ?? ''}
							onchange={(v) => onvalue(d.id, v as DimensionValue)}
						/>
						{#if value !== undefined}
							<IconButton
								icon="x"
								size="sm"
								label="Clear {d.label}"
								class="clear"
								onclick={() => onvalue(d.id, undefined)}
							/>
						{/if}
					</div>
					<p class="note">
						{note.text}
						{#if note.original}
							<span class="original"
								>{example?.source === 'slide' ? 'Slide 17' : 'Site'}: {note.original}</span
							>
						{/if}
					</p>
				</li>
			{/each}
		</ul>

		{#each diagnostics as diagnostic, i (i)}
			<Callout tone="warn">{diagnostic.message}</Callout>
		{/each}
	</div>

	{#snippet footer()}
		<div class="actions">
			{#if edited}
				<Button size="sm" variant="secondary" onclick={onreset}>
					{#snippet icon()}<Icon name="undo" size={15} />{/snippet}
					Reset values
				</Button>
			{/if}
			<Button size="sm" variant="secondary" onclick={onduplicate}>
				{#snippet icon()}<Icon name="copy" size={15} />{/snippet}
				{column.kind === 'custom' ? 'Duplicate' : 'Edit a copy'}
			</Button>
			<Button size="sm" variant="ghost" onclick={onremove}>
				{#snippet icon()}<Icon name="trash" size={15} />{/snippet}
				Remove
			</Button>
		</div>
	{/snippet}
</Panel>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.source {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.dims {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.dim {
		display: grid;
		grid-template-columns: 8.5rem minmax(0, 1fr);
		align-items: center;
		gap: 2px var(--space-3);
		padding: var(--space-2) 0;
		border-top: 1px solid var(--border);
	}
	.dim:first-child {
		border-top: 0;
		padding-top: 0;
	}
	.dim-label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.swatch {
		flex: none;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--tone-fg);
		box-shadow: 0 0 0 2px var(--tone-bg);
	}
	.swatch.unset {
		background: transparent;
		border: 1.5px dashed var(--text-3);
		box-shadow: none;
	}
	.control {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
	}
	.control :global(.clear) {
		width: 26px;
		height: 26px;
		color: var(--text-3);
	}
	.note {
		grid-column: 2;
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
	.original {
		display: inline-block;
		margin-left: var(--space-1);
		padding: 0 6px;
		border-radius: 999px;
		background: var(--active-soft);
		color: var(--text-2);
		white-space: nowrap;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	@media (max-width: 560px) {
		.dim {
			grid-template-columns: minmax(0, 1fr);
		}
		.note {
			grid-column: 1;
		}
	}
</style>
