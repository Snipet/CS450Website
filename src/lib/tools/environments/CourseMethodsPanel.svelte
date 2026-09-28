<script lang="ts">
	import { Badge, CitationTag, Panel } from '$lib/components/ui';
	import {
		COURSE_PREVIEW,
		COURSE_PREVIEW_CITE,
		dimension,
		matchCourseRow,
		type EnvironmentProfile
	} from '$lib/theory/agents/environments';

	interface Props {
		name: string;
		profile: EnvironmentProfile;
	}

	let { name, profile }: Props = $props();

	const matches = $derived(COURSE_PREVIEW.map((row) => matchCourseRow(row, profile)));
</script>

<Panel title="Course methods">
	{#snippet actions()}<CitationTag cite={COURSE_PREVIEW_CITE} />{/snippet}
	<ul class="rows" aria-label="Rows of the course preview for {name}">
		{#each matches as m, i (m.row.id)}
			{@const groupStart = m.row.group && m.row.group !== matches[i - 1]?.row.group}
			{#if groupStart}
				<li class="group" aria-hidden="true">{m.row.group}</li>
			{/if}
			<li class={['row', m.status, { sub: m.row.group }]}>
				<div class="line">
					<span class="what">
						<span class="env">{m.row.environments}:</span>
						{m.row.methods}
						{#if m.row.group}<span class="visually-hidden">({m.row.group})</span>{/if}
					</span>
					{#if m.status === 'applies'}
						<Badge tone="accept">Applies</Badge>
					{:else if m.status === 'depends'}
						<Badge tone="active"
							>Depends on {m.missing.map((d) => dimension(d).label).join(', ')}</Badge
						>
					{/if}
				</div>
				<p class="reason">{m.reason}</p>
			</li>
		{/each}
	</ul>
</Panel>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.group {
		margin-top: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.row {
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--border);
		border-radius: 0 var(--radius) var(--radius) 0;
	}
	.row.sub {
		margin-left: var(--space-3);
	}
	.row.applies {
		border-left-color: var(--accept);
		background: var(--accept-soft);
	}
	.row.depends {
		border-left-color: var(--active);
		background: var(--active-soft);
	}
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1) var(--space-2);
	}
	.what {
		font-size: var(--text-sm);
		line-height: 1.45;
	}
	.env {
		font-weight: 600;
	}
	.row.no .what {
		color: var(--text-3);
	}
	.reason {
		margin: 2px 0 0;
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
	.row.no .reason {
		color: var(--text-3);
	}
</style>
