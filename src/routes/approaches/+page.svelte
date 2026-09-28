<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import ToolPage from '$lib/components/ui/ToolPage.svelte';
	import ApproachBoard from '$lib/tools/approaches/ApproachBoard.svelte';
	import ApproachDetail from '$lib/tools/approaches/ApproachDetail.svelte';
	import DefinitionGrid from '$lib/tools/approaches/DefinitionGrid.svelte';
	import { GRID_CITE, INTELLIGENCE, approachById } from '$lib/tools/approaches/content';
	import {
		completeApproachesState,
		defaultApproachesState,
		isSavedApproachesState,
		type ApproachesState
	} from '$lib/tools/approaches/state';
	import { tool } from '$lib/tools/catalog/approaches';
	import { syncToHash } from '$lib/url-state';

	let state = $state<ApproachesState>(defaultApproachesState());

	syncToHash(() => state, {
		validate: isSavedApproachesState,
		onLoad(saved) {
			Object.assign(state, completeApproachesState(saved));
		}
	});

	const current = $derived(approachById(state.approach));
</script>

<ToolPage {tool}>
	<Panel title="What is intelligence?">
		{#snippet actions()}<CitationTag cite={INTELLIGENCE.cite} />{/snippet}
		<div class="intelligence">
			<p>{INTELLIGENCE.prompt} The usual list includes:</p>
			<ul class="traits">
				{#each INTELLIGENCE.usual as trait (trait)}
					<li>{trait}</li>
				{/each}
			</ul>
			<p class="skew">{INTELLIGENCE.note}</p>
		</div>
	</Panel>

	<section class="dimensions" aria-labelledby="dimensions-title">
		<header class="section-head">
			<h2 id="dimensions-title">Dimensions of AI definitions</h2>
			<CitationTag cite={GRID_CITE} />
		</header>
		<div class="layout">
			<div class="grid-col">
				<DefinitionGrid
					selected={state.approach}
					onselect={(id) => (state.approach = id)}
					controls="approach-detail"
				/>
				<p class="hint">
					Rows: behavior or thought. Columns: measured against humans or against an ideal of
					rationality. Select a cell to show that approach.
				</p>
			</div>
			<ApproachDetail approach={current} id="approach-detail" />
		</div>
	</section>

	<ApproachBoard board={state.board} onchange={(board) => (state.board = board)} />
</ToolPage>

<style>
	.intelligence {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.intelligence p {
		margin: 0;
	}
	.traits {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.traits li {
		padding: 4px 12px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface-2);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.skew {
		color: var(--text-2);
		font-family: var(--font-serif);
		font-style: italic;
	}

	.dimensions {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.section-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border);
	}
	.section-head h2 {
		margin: 0;
		font-size: var(--text-xl);
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	.grid-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
		max-width: 34rem;
	}
	.hint {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	@media (min-width: 1040px) {
		.layout {
			grid-template-columns: minmax(20rem, 5fr) minmax(0, 8fr);
		}
		.grid-col {
			position: sticky;
			top: calc(56px + var(--space-4));
		}
	}
</style>
