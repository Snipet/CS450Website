<!--
	"A note on the complexity of search" (Informed Search, slide 43): the
	solution length of the Towers of Hanoi grows exponentially with the number
	of disks, so a search exponential in the solution length is doubly so.
-->
<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import NumberField from '$lib/components/ui/NumberField.svelte';
	import { HANOI_BRANCHING, hanoiFacts, hanoiText } from './counts';
	import { MAX_DISKS, cleanDisks } from './state';

	interface Props {
		disks: number;
	}

	let { disks = $bindable() }: Props = $props();

	// Whole, in-range (a number field can report 3.5 while it is typed).
	const n = $derived(cleanDisks(disks));
	const text = $derived(hanoiText(hanoiFacts(n)));

	/** Disks drawn on the first peg (at most 8; more are summarized in the label). */
	const MAX_DRAWN = 8;
	const drawn = $derived(Math.min(n, MAX_DRAWN));
	const W = 260;
	const H = 96;
	const BASE = H - 8;
	const DISK_H = 9;
	const PEG_X = [W / 6, W / 2, (5 * W) / 6];
	const MAX_DISK_W = W / 3 - 12;
	const MIN_DISK_W = 18;

	function diskWidth(i: number): number {
		// i = 0 is the bottom (largest) disk.
		if (drawn <= 1) return MAX_DISK_W;
		return MAX_DISK_W - ((MAX_DISK_W - MIN_DISK_W) * i) / (drawn - 1);
	}

	const label = $derived(
		`Towers of Hanoi: three pegs with ${n} ${n === 1 ? 'disk' : 'disks'} stacked on the first peg, largest at the bottom${
			n > MAX_DRAWN ? ` (${MAX_DRAWN} drawn)` : ''
		}.`
	);
</script>

<div class="hanoi">
	<p class="lead">
		The worst-case complexity of search is exponential in the length of the solution path, and the
		length of the solution path can be exponential in the number of “objects” in the problem.
		Example: towers of Hanoi.
		<CitationTag cite={{ deck: 'informed', slide: 43 }} />
	</p>

	<div class="controls">
		<NumberField
			label="Disks n"
			bind:value={() => disks, (v) => (disks = cleanDisks(v))}
			min={1}
			max={MAX_DISKS}
			size="sm"
		/>
		<svg viewBox="0 0 {W} {H}" role="img" aria-label={label} class="pegs">
			<rect class="base" x="4" y={BASE} width={W - 8} height="4" rx="2" />
			{#each PEG_X as x (x)}
				<rect class="peg" x={x - 2} y="10" width="4" height={BASE - 10} rx="2" />
			{/each}
			{#each Array.from({ length: drawn }, (_, i) => i) as i (i)}
				{@const w = diskWidth(i)}
				<rect
					class="disk"
					x={PEG_X[0] - w / 2}
					y={BASE - (i + 1) * DISK_H}
					width={w}
					height={DISK_H - 1.5}
					rx="3"
					style="fill: var(--tok-{i % 6}); stroke: var(--tok-{i % 6})"
				/>
			{/each}
			{#if n > MAX_DRAWN}
				<text class="more" x={PEG_X[0]} y="8">+{n - MAX_DRAWN}</text>
			{/if}
		</svg>
	</div>

	<dl class="facts">
		<div>
			<dt>Moves in the shortest solution</dt>
			<dd>
				<span class="mono">{`2ⁿ − 1 = ${text.movesFormula} = `}<strong>{text.moves}</strong></span>
			</dd>
		</div>
		<div>
			<!-- Not "O(bᵈ) …": the labels are set in capitals, which would turn b into B. -->
			<dt>Search cost at that depth</dt>
			<dd>
				<span class="mono"
					>{`O(bᵈ) with b = ${HANOI_BRANCHING}, d = ${text.moves}: ${text.power}`}{text.value
						? ` = ${text.value}`
						: ''}</span
				>
				<span class="digits">({text.digits})</span>
			</dd>
		</div>
	</dl>
	<p class="note">
		b = 3: in any state the smallest disk can move to either other peg, and one move is possible
		between the two remaining pegs.
	</p>
</div>

<style>
	.hanoi {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.lead {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-2);
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3) var(--space-5);
	}
	.pegs {
		width: 100%;
		max-width: 260px;
		height: auto;
	}
	.base,
	.peg {
		fill: var(--border-strong);
	}
	.disk {
		fill-opacity: 0.85;
		stroke-width: 1;
	}
	.more {
		fill: var(--text-3);
		font-size: 9px;
		text-anchor: middle;
	}
	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
	}
	dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	dd {
		margin: 0;
		font-size: var(--text-sm);
		overflow-wrap: anywhere;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.digits {
		color: var(--text-3);
		white-space: nowrap;
	}
	.note {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
</style>
