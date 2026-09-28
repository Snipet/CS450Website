<script lang="ts" module>
	// 24×24 strokes in the same style as the theme toggle. `fill` paths are filled.
	const ICONS = {
		play: {
			fill: 'M8 5.6v12.8a.6.6 0 0 0 .92.5l9.9-6.4a.6.6 0 0 0 0-1l-9.9-6.4a.6.6 0 0 0-.92.5Z'
		},
		pause: { fill: 'M7 5.5h3.4v13H7zM13.6 5.5H17v13h-3.4z' },
		'step-back': { d: 'M14.5 6.5 9 12l5.5 5.5' },
		'step-forward': { d: 'M9.5 6.5 15 12l-5.5 5.5' },
		first: { d: 'M6.5 6v12M17 6.5 11.5 12l5.5 5.5' },
		last: { d: 'M17.5 6v12M7 6.5l5.5 5.5L7 17.5' },
		link: {
			d: 'M10.2 13.8a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66l-1.06 1.06M13.8 10.2a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.06-1.06'
		},
		book: {
			d: 'M3.5 5.5c2.9-1 5.7-.8 8.5 1 2.8-1.8 5.6-2 8.5-1v13c-2.9-1-5.7-.8-8.5 1-2.8-1.8-5.6-2-8.5-1zM12 6.5v13'
		},
		'chevron-down': { d: 'M6.5 9.5 12 15l5.5-5.5' },
		'chevron-up': { d: 'M6.5 14.5 12 9l5.5 5.5' },
		'chevron-left': { d: 'M14.5 6.5 9 12l5.5 5.5' },
		'chevron-right': { d: 'M9.5 6.5 15 12l-5.5 5.5' },
		'arrow-right': { d: 'M5 12h14M13.5 6.5 19 12l-5.5 5.5' },
		plus: { d: 'M12 5.5v13M5.5 12h13' },
		minus: { d: 'M5.5 12h13' },
		fit: {
			d: 'M4.5 9V6a1.5 1.5 0 0 1 1.5-1.5h3M15 4.5h3A1.5 1.5 0 0 1 19.5 6v3M19.5 15v3a1.5 1.5 0 0 1-1.5 1.5h-3M9 19.5H6A1.5 1.5 0 0 1 4.5 18v-3'
		},
		reset: { d: 'M4.8 12a7.2 7.2 0 1 0 2.1-5.1L4.8 9M4.8 4.8V9H9' },
		check: { d: 'M5.5 12.5 10 17l8.5-9.5' },
		x: { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' },
		info: { d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 11v5.2M12 7.8v.1' },
		warning: {
			d: 'M10.6 4.6 3 18a1.6 1.6 0 0 0 1.4 2.4h15.2A1.6 1.6 0 0 0 21 18L13.4 4.6a1.6 1.6 0 0 0-2.8 0ZM12 9.5v4.6M12 17.1v.1'
		},
		error: {
			d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6'
		},
		success: { d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM8.2 12.3l2.6 2.6 5-5.4' },
		list: { d: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01' },
		copy: {
			d: 'M9 9.5A1.5 1.5 0 0 1 10.5 8h8A1.5 1.5 0 0 1 20 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 9 18.5zM15 8V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H9'
		},
		shuffle: {
			d: 'M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.7-1.6 3.7-3.4M13 10.4c1-1.8 2.1-3.4 3.5-3.4H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5'
		},
		flag: { d: 'M5.5 20.5v-16M5.5 4.5h11l-2.5 4 2.5 4h-11' },
		target: {
			d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12.3v-.6'
		},
		trash: {
			d: 'M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12'
		},
		eraser: {
			d: 'M8.5 19.5h11M4.9 14.1l8.5-8.5a1.5 1.5 0 0 1 2.1 0l3.4 3.4a1.5 1.5 0 0 1 0 2.1l-7.8 7.8a2 2 0 0 1-1.4.6H8.3a2 2 0 0 1-1.4-.6l-2-2a1.5 1.5 0 0 1 0-2.1ZM9.5 9.5l5 5'
		},
		pencil: {
			d: 'M14.5 5.5l4 4M4.5 19.5l1-4.5L15.8 4.7a1.5 1.5 0 0 1 2.1 0l1.4 1.4a1.5 1.5 0 0 1 0 2.1L9 18.5z'
		},
		grid: { d: 'M4.5 4.5h15v15h-15zM4.5 9.5h15M4.5 14.5h15M9.5 4.5v15M14.5 4.5v15' },
		dice: {
			d: 'M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5ZM8.7 8.7v.1M15.3 15.3v.1M12 12v.1M15.3 8.7v.1M8.7 15.3v.1'
		},
		zap: { d: 'M13 3.5 5.5 13.5H12l-1 7 7.5-10H12z' },
		eye: {
			d: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z'
		},
		sliders: { d: 'M4.5 7h9M17.5 7h2M4.5 17h2M10.5 17h9M15.5 4.5v5M8.5 14.5v5' },
		help: {
			d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 17v.1'
		},
		columns: { d: 'M4.5 5.5h15v13h-15zM12 5.5v13' },
		tree: {
			d: 'M12 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 20.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM11 7.3 7 16.7M13 7.3l4 9.4'
		},
		map: { d: 'M9 5.5 4.5 7v12L9 17.5l6 2 4.5-1.5v-12L15 7.5l-6-2ZM9 5.5v12M15 7.5v12' },
		clock: { d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2' },
		undo: { d: 'M9 14.5 4.5 10 9 5.5M4.5 10h10a5 5 0 0 1 0 10h-3' },
		external: {
			d: 'M13.5 4.5h6v6M19.5 4.5 11 13M17.5 13.5v5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h5'
		},
		robot: {
			d: 'M7 8.5h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM12 8.5V5.2M12 4.4v.1M9.5 12.8v.1M14.5 12.8v.1M9.5 16.3h5'
		},
		search: { d: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15.5 15.5l5 5' }
	} satisfies Record<string, { d?: string; fill?: string }>;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		/** Rendered size in px (default 16). */
		size?: number;
		/** Accessible name. Without it the icon is decorative (aria-hidden). */
		label?: string;
		class?: string;
	}

	let { name, size = 16, label, class: className }: Props = $props();

	const icon = $derived<{ d?: string; fill?: string }>(ICONS[name]);
</script>

<svg
	class={['icon', className]}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{#if icon.fill}<path class="fill" d={icon.fill} />{/if}
	{#if icon.d}<path d={icon.d} />{/if}
</svg>

<style>
	.icon {
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
		vertical-align: middle;
	}
	.fill {
		fill: currentColor;
		stroke: none;
	}
</style>
