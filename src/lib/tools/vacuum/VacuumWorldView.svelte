<script lang="ts">
	import type { Square, VacuumAction, VacuumWorld } from '$lib/theory/agents/vacuum';

	interface Props {
		/** The world the agent perceives. */
		world: VacuumWorld;
		/** The action about to be taken, drawn as an overlay (null for none). */
		action?: VacuumAction | null;
		/** Squares whose dirt appeared after the previous step. */
		fresh?: readonly Square[];
		/** Accessible description of the figure. */
		label: string;
	}

	let { world, action = null, fresh = [], label }: Props = $props();

	const uid = $props.id();
	const arrowId = `${uid}-arrow`;
	const stopId = `${uid}-stop`;

	// Drawing units: the frame is 380 × 180, one square is 190 wide.
	const W = 190;
	const H = 180;
	const X0 = 10;
	const Y0 = 10;
	const squareX = (s: Square) => X0 + (s === 'A' ? 0 : W);

	/** Robot anchor (the left end of its floor nozzle) in a square. */
	const robotX = (s: Square) => squareX(s) + 46;
	const ROBOT_Y = 34;
	const PILE_Y = 144;
	const pileX = (s: Square) => squareX(s) + 95;

	// Stones of a dirt pile around (0, 0), after the slide 3 picture.
	const STONES: { cx: number; cy: number; rx: number; ry: number; r: number }[] = [
		{ cx: -30, cy: 3, rx: 6, ry: 10, r: 25 },
		{ cx: -17, cy: -3, rx: 9, ry: 7, r: 0 },
		{ cx: -2, cy: -17, rx: 6, ry: 3.5, r: 0 },
		{ cx: 2, cy: -4, rx: 6, ry: 5, r: 0 },
		{ cx: 17, cy: -11, rx: 7, ry: 5, r: 0 },
		{ cx: 24, cy: 5, rx: 7, ry: 10, r: -30 },
		{ cx: -14, cy: 13, rx: 7, ry: 4, r: 0 },
		{ cx: 5, cy: 14, rx: 7, ry: 7, r: 0 }
	];

	const here = $derived(world.location);
	const other = $derived<Square>(here === 'A' ? 'B' : 'A');
	const moves = $derived(action === 'Left' || action === 'Right');
	/** Whether the move leaves the square (Left from B, Right from A). */
	const leaves = $derived(
		(action === 'Left' && here === 'B') || (action === 'Right' && here === 'A')
	);
	const sucking = $derived(action === 'Suck');
</script>

{#snippet robot(x: number, y: number, ghost: boolean)}
	<g
		class={['robot', { ghost }]}
		transform="translate({x} {y})"
		aria-hidden="true"
		stroke-linejoin="round"
		stroke-linecap="round"
	>
		<!-- Floor nozzle, hose/handle, canister, wheels (after the slide 3 drawing). -->
		<path class="part" d="M0 62 L10 53 H40 L50 62 Z" />
		<path class="line" d="M36 54 L70 26 M42 57 L74 30" />
		<path class="part" d="M68 60 V20 Q68 4 79 4 Q90 4 90 20 V60 Z" />
		<circle class="part" cx="74" cy="64" r="5.5" />
		<circle class="part" cx="86" cy="64" r="5.5" />
	</g>
{/snippet}

{#snippet pile(s: Square)}
	{@const faded = sucking && s === here}
	<g class={['pile', { faded }]} transform="translate({pileX(s)} {PILE_Y})">
		{#each STONES as st, i (i)}
			<ellipse
				cx={st.cx}
				cy={st.cy}
				rx={st.rx}
				ry={st.ry}
				transform={st.r ? `rotate(${st.r} ${st.cx} ${st.cy})` : undefined}
			/>
		{/each}
	</g>
	{#if fresh.includes(s)}
		<text class="fresh" x={pileX(s)} y={PILE_Y + 38} text-anchor="middle">new dirt</text>
	{/if}
{/snippet}

<figure class="world">
	<svg viewBox="0 0 400 200" role="img" aria-label={label}>
		<defs>
			<marker
				id={arrowId}
				viewBox="0 0 10 10"
				refX="8"
				refY="5"
				markerWidth="7"
				markerHeight="7"
				orient="auto-start-reverse"
			>
				<path d="M0 0 L10 5 L0 10 Z" class="arrowhead" />
			</marker>
			<marker
				id={stopId}
				viewBox="0 0 10 10"
				refX="5"
				refY="5"
				markerWidth="8"
				markerHeight="8"
				orient="auto"
			>
				<path d="M5 0 V10" class="stophead" />
			</marker>
		</defs>

		<!-- The two squares; the perceived square is shaded. -->
		{#each ['A', 'B'] as const as s (s)}
			<rect
				class={['square', { current: s === here }]}
				x={squareX(s)}
				y={Y0}
				width={W}
				height={H}
			/>
			<text class="letter" x={squareX(s) + 10} y={Y0 + 24}>{s}</text>
		{/each}
		<line class="divider" x1={X0 + W} y1={Y0} x2={X0 + W} y2={Y0 + H} />
		<rect class="frame" x={X0} y={Y0} width={2 * W} height={H} />

		{#each ['A', 'B'] as const as s (s)}
			{#if world.dirt[s]}{@render pile(s)}{/if}
		{/each}

		{#if sucking}
			{#if world.dirt[here]}
				<ellipse
					class="suck-ring"
					cx={pileX(here)}
					cy={PILE_Y - 1}
					rx="44"
					ry="28"
					aria-hidden="true"
				/>
				<path
					class="suction"
					d="M{pileX(here) - 12} {PILE_Y - 30} q -6 -8 -18 -12 M{pileX(here) + 4} {PILE_Y -
						30} q -8 -10 -24 -14 M{pileX(here) + 18} {PILE_Y - 26} q -8 -12 -30 -16"
					aria-hidden="true"
				/>
			{:else}
				<ellipse
					class="noop-ring"
					cx={pileX(here)}
					cy={PILE_Y - 1}
					rx="40"
					ry="24"
					aria-hidden="true"
				/>
			{/if}
		{/if}

		{#if moves && leaves}
			{@render robot(robotX(other), ROBOT_Y, true)}
			<path
				class="move"
				d="M{robotX(here) + (here === 'A' ? 100 : -10)} {ROBOT_Y + 46} H{robotX(other) +
					(here === 'A' ? -10 : 96)}"
				marker-end="url(#{arrowId})"
				aria-hidden="true"
			/>
		{:else if moves}
			<!-- A move into the outer wall: no effect. -->
			<path
				class="bump"
				d={here === 'A'
					? `M${robotX(here) - 6} ${ROBOT_Y + 30} H${X0 + 8}`
					: `M${robotX(here) + 100} ${ROBOT_Y + 30} H${X0 + 2 * W - 8}`}
				marker-end="url(#{stopId})"
				aria-hidden="true"
			/>
		{/if}

		{@render robot(robotX(here), ROBOT_Y, false)}
	</svg>
</figure>

<style>
	.world {
		margin: 0;
		min-width: 0;
	}
	svg {
		display: block;
		width: 100%;
		max-width: 560px;
		height: auto;
		margin: 0 auto;
		overflow: visible;
	}
	.square {
		fill: var(--surface);
		transition: fill var(--duration) var(--ease);
	}
	.square.current {
		fill: var(--active-soft);
	}
	.frame {
		fill: none;
		stroke: var(--node-stroke);
		stroke-width: 2.5;
	}
	.letter {
		fill: var(--text);
		font-family: var(--font-serif);
		font-size: 22px;
		font-style: italic;
	}
	.divider {
		stroke: var(--node-stroke);
		stroke-width: 1.5;
	}
	.robot .part {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 2;
	}
	.robot .line {
		fill: none;
		stroke: var(--node-stroke);
		stroke-width: 2;
	}
	.robot.ghost .part,
	.robot.ghost .line {
		fill: none;
		stroke: var(--active);
		stroke-dasharray: 4 3;
		stroke-width: 1.5;
	}
	.pile ellipse {
		fill: var(--tok-5-soft);
		stroke: var(--tok-5);
		stroke-width: 1.5;
	}
	.pile.faded {
		opacity: 0.45;
	}
	.fresh {
		fill: var(--text-2);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
	}
	.suck-ring {
		fill: none;
		stroke: var(--active);
		stroke-width: 2;
		stroke-dasharray: 5 4;
	}
	.noop-ring {
		fill: none;
		stroke: var(--text-3);
		stroke-width: 1.5;
		stroke-dasharray: 3 4;
	}
	.suction {
		fill: none;
		stroke: var(--active);
		stroke-width: 2;
		stroke-linecap: round;
	}
	.move {
		fill: none;
		stroke: var(--active);
		stroke-width: 2.5;
	}
	.bump {
		fill: none;
		stroke: var(--reject);
		stroke-width: 2.5;
		stroke-dasharray: 5 4;
	}
	.arrowhead {
		fill: var(--active);
	}
	.stophead {
		stroke: var(--reject);
		stroke-width: 3;
	}
</style>
