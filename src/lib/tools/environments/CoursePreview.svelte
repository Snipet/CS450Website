<script lang="ts">
	import { COURSE_PREVIEW, matchCourseRow } from '$lib/theory/agents/environments';
	import { columnName, columnProfile, type Column } from './state';

	interface Props {
		columns: readonly Column[];
		selected: string | null;
		onselect: (key: string) => void;
	}

	let { columns, selected, onselect }: Props = $props();

	const rows = $derived(
		COURSE_PREVIEW.map((row) => ({
			row,
			columns: columns
				.map((c) => ({
					key: c.key,
					name: columnName(c),
					status: matchCourseRow(row, columnProfile(c)).status
				}))
				.filter((c) => c.status !== 'no')
		}))
	);
</script>

<ul class="preview">
	{#each rows as { row, columns: cols }, i (row.id)}
		{#if row.group && row.group !== rows[i - 1]?.row.group}
			<li class="group">{row.group}</li>
		{/if}
		<li class={['item', { sub: row.group }]}>
			<p class="text">
				<span class="env">{row.environments}:</span>
				{row.methods}
			</p>
			{#if row.note}<p class="note">{row.note}</p>{/if}
			<div class="cols">
				{#if cols.length}
					<span class="visually-hidden">Environments in the table:</span>
					{#each cols as c (c.key)}
						<button
							type="button"
							class={['chip', c.status, { current: c.key === selected }]}
							title={c.status === 'depends'
								? `${c.name}: depends on values that are not set`
								: `${c.name}: applies`}
							onclick={() => onselect(c.key)}
						>
							{c.name}{#if c.status === 'depends'}<span class="q" aria-hidden="true">?</span><span
									class="visually-hidden">(depends on values that are not set)</span
								>{/if}
						</button>
					{/each}
				{:else}
					<span class="empty">No environment in the table</span>
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.group {
		margin-top: var(--space-1);
		color: var(--text);
		font-weight: 600;
		font-size: var(--text-base);
	}
	.item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding-left: var(--space-3);
		border-left: 3px solid var(--border);
	}
	.item.sub {
		margin-left: var(--space-4);
	}
	.text {
		margin: 0;
		font-size: var(--text-base);
		line-height: 1.45;
	}
	.env {
		color: var(--accent);
		font-weight: 600;
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.note::before {
		content: '– ';
		color: var(--text-3);
	}
	.cols {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
		margin-top: 2px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 24px;
		padding: 0 9px;
		border: 1px solid color-mix(in srgb, var(--accept) 35%, transparent);
		border-radius: 999px;
		background: var(--accept-soft);
		color: var(--text);
		font-size: var(--text-xs);
		font-weight: 500;
		cursor: pointer;
	}
	.chip.depends {
		border-style: dashed;
		border-color: var(--active);
		background: var(--active-soft);
	}
	.chip.current {
		box-shadow: 0 0 0 2px var(--accent);
	}
	.chip:hover {
		border-color: var(--text-3);
	}
	.q {
		color: var(--text-3);
		font-weight: 700;
	}
	.empty {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
</style>
