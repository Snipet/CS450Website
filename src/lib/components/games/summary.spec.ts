import { describe, expect, it } from 'vitest';
import { nestedTree } from '$lib/theory/games';
import { hasBounds, legendItems, treeSummary } from './summary';
import { formatBound, type GameTreeDisplay, type NodeStatus } from './types';

const SLIDE = nestedTree([
	[3, 12, 8],
	[2, 4, 6],
	[14, 5, 2]
]);

const display = (patch: Partial<GameTreeDisplay> = {}): GameTreeDisplay => ({
	status: new Array<NodeStatus>(13).fill('unvisited'),
	labels: new Array(13).fill(null),
	current: null,
	bounds: null,
	emphasis: null,
	cut: new Set(),
	best: null,
	...patch
});

describe('legendItems', () => {
	it('lists what is on screen, the current node first', () => {
		const status = new Array<NodeStatus>(13).fill('unvisited');
		status[0] = 'open';
		status[1] = 'done';
		status[7] = 'pruned';
		expect(legendItems(display({ status, current: 1 }))).toEqual([
			'current',
			'open',
			'unvisited',
			'pruned'
		]);
		expect(legendItems(display({ best: 1 }))).toEqual(['unvisited', 'best']);
	});
});

describe('treeSummary', () => {
	it('describes the tree, the current node, values, prunes, and the decision', () => {
		const labels = new Array(13).fill(null);
		labels[0] = { text: '≥3', kind: 'lower' };
		labels[5] = { text: '≤2', kind: 'upper' };
		const d = display({
			labels,
			current: 5,
			bounds: { node: 5, alpha: 3, beta: Infinity },
			cut: new Set([7, 8]),
			best: 1
		});
		expect(treeSummary(SLIDE, d)).toBe(
			'Game tree with 13 nodes and 9 terminal nodes, MAX to move at the root; current node A2; at A2 α = 3, β = +∞; values root ≥3, A2 ≤2; pruned A22, A23; best action A1.'
		);
		expect(hasBounds(d)).toBe(true);
		expect(hasBounds(display())).toBe(false);
	});
});

describe('formatBound', () => {
	it('writes infinities as on the slides', () => {
		expect(formatBound(Infinity)).toBe('+∞');
		expect(formatBound(-Infinity)).toBe('−∞');
		expect(formatBound(-0)).toBe('0');
		expect(formatBound(2.5)).toBe('2.5');
	});
});
