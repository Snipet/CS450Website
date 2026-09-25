<script lang="ts">
	import { Button, CitationTag, Icon, Panel, TextField } from '$lib/components/ui';
	import type { Citation } from '$lib/lectures';
	import {
		PEAS_CITE,
		PEAS_PARTS,
		peasExample,
		type PeasPart
	} from '$lib/theory/agents/environments';
	import { MAX_PEAS_LENGTH, columnExample, columnName, type Column } from './state';

	interface Props {
		column: Column;
		onpeas: (part: PeasPart, text: string) => void;
		onduplicate: () => void;
	}

	let { column, onpeas, onduplicate }: Props = $props();

	const example = $derived(columnExample(column));
	const linked = $derived(example?.peas ? peasExample(example.peas) : undefined);

	/** One citation for the whole description when every part comes from the same slide. */
	const sharedCite = $derived.by((): Citation | null => {
		if (!linked) return null;
		const cites = PEAS_PARTS.map((p) => linked.sources[p.id]);
		const first = cites[0];
		if (!first) return null;
		return cites.every((c) => c && c.deck === first.deck && c.slide === first.slide) ? first : null;
	});
	const subtitle = $derived(
		linked && linked.name !== columnName(column) ? `of the ${linked.name.toLowerCase()}` : undefined
	);
</script>

<Panel title="PEAS" {subtitle}>
	{#snippet actions()}<CitationTag cite={PEAS_CITE} />{/snippet}
	{#if column.kind === 'custom'}
		<div class="fields">
			{#each PEAS_PARTS as part (part.id)}
				<div class="field">
					<span class="letter" aria-hidden="true">{part.letter}</span>
					<TextField
						label={part.name}
						description={part.definition}
						size="sm"
						value={column.peas[part.id]}
						maxlength={MAX_PEAS_LENGTH}
						oninput={(e) => onpeas(part.id, e.currentTarget.value)}
					/>
				</div>
			{/each}
		</div>
	{:else if linked}
		<dl class="peas">
			{#each PEAS_PARTS as part (part.id)}
				{@const cite = linked.sources[part.id]}
				<div class="row">
					<dt>
						<span class="letter" aria-hidden="true">{part.letter}</span>
						<span class="part">{part.name}</span>
					</dt>
					<dd>
						<span class="text">{linked.peas[part.id]}</span>
						{#if !sharedCite}
							{#if cite}<CitationTag {cite} />{:else}<span class="site">Site example</span>{/if}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
		{#if sharedCite}
			<p class="from">
				{linked.name}, as on the slide <CitationTag cite={sharedCite} />
			</p>
		{/if}
	{:else}
		<p class="none">The slides give no PEAS description for {columnName(column)}.</p>
		<Button size="sm" variant="secondary" onclick={onduplicate}>
			{#snippet icon()}<Icon name="pencil" size={15} />{/snippet}
			Write one in a copy
		</Button>
	{/if}
</Panel>

<style>
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.field {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: var(--space-3);
	}
	.letter {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 26px;
		height: 26px;
		border-radius: var(--radius);
		background: var(--accent-soft);
		color: var(--accent);
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 700;
	}
	.peas {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2px;
	}
	dt {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.part {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	dd {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		margin: 0 0 0 calc(26px + var(--space-2));
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.site {
		padding: 0 7px;
		border: 1px dashed var(--border-strong);
		border-radius: 999px;
		color: var(--text-3);
		font-size: var(--text-xs);
		white-space: nowrap;
	}
	.from {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.none {
		margin: 0 0 var(--space-3);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
</style>
