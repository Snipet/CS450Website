import { describe, expect, it } from 'vitest';
import { nestedTree, parseGameTree, randomGameTree } from '$lib/theory/games';
import {
	MAX_FIT_ZOOM,
	crossPath,
	gameTreeScene,
	initialZoom,
	levelText,
	trianglePoints,
	utilityText
} from './game-tree-scene';

const SLIDE = nestedTree([
	[3, 12, 8],
	[2, 4, 6],
	[14, 5, 2]
]);

describe('gameTreeScene', () => {
	const scene = gameTreeScene(SLIDE);

	it('draws MAX and MIN triangles by level, terminal utilities underneath', () => {
		expect(scene.nodes.map((n) => n.shape)).toEqual([
			'max',
			'min',
			'max',
			'max',
			'max',
			'min',
			'max',
			'max',
			'max',
			'min',
			'max',
			'max',
			'max'
		]);
		const leaf = scene.byId.get(2)!;
		expect(leaf.terminal).toBe(true);
		expect(leaf.utility).toBe('3');
		expect(leaf.utilityY).toBeGreaterThan(leaf.y + leaf.halfH);
		expect(scene.byId.get(0)!.utility).toBeNull();
		expect(scene.compact).toBe(false);
	});

	it('keeps levels in rows and children left to right under their parent', () => {
		const ys = new Set([2, 3, 4, 6, 7, 8, 10, 11, 12].map((id) => scene.byId.get(id)!.y));
		expect(ys.size).toBe(1);
		const xs = [1, 5, 9].map((id) => scene.byId.get(id)!.x);
		expect(xs[0]).toBeLessThan(xs[1]);
		expect(xs[1]).toBeLessThan(xs[2]);
		const root = scene.byId.get(0)!;
		expect(root.x).toBeCloseTo(xs[1], 5);
		for (const n of scene.nodes) {
			expect(n.x - n.halfW).toBeGreaterThanOrEqual(0);
			expect(n.x + n.halfW).toBeLessThanOrEqual(scene.width);
			expect(n.y + n.halfH).toBeLessThanOrEqual(scene.height);
		}
	});

	it('labels edges with actions beside them and the levels MAX and MIN', () => {
		expect(scene.edges).toHaveLength(12);
		const a1 = scene.edges.find((e) => e.child === 1)!;
		expect(a1.label).toMatchObject({ text: 'A1', anchor: 'end' });
		const a2 = scene.edges.find((e) => e.child === 5)!;
		expect(a2.label).toMatchObject({ text: 'A2', anchor: 'start' });
		expect(a1.y1).toBe(scene.byId.get(0)!.y + scene.byId.get(0)!.halfH);
		expect(scene.levels.map((l) => l.text)).toEqual(['MAX', 'MIN']);
		expect(scene.levelWidth).toBeGreaterThan(20);
		expect(gameTreeScene(SLIDE, { actions: false }).edges.every((e) => e.label === null)).toBe(
			true
		);
	});

	it('leaves room for value labels and α/β beside internal nodes', () => {
		const a1 = scene.byId.get(1)!;
		const a2 = scene.byId.get(5)!;
		expect(a1.valueX).toBeLessThan(a1.x - a1.halfW);
		expect(a1.sideX).toBeGreaterThan(a1.x + a1.halfW);
		// α and β of A1 end before the value label of A2 begins.
		expect(a2.x - a1.x).toBeGreaterThan(80);
	});

	it('draws multi-player trees with squares, tuple boxes, and player levels', () => {
		const multi = parseGameTree('order: 1 3 2 [[(1,2,6) (4,3,2)] [(6,1,2) (7,4,1)]]').tree!;
		const s = gameTreeScene(multi, { order: [1, 3, 2] });
		expect(s.nodes[0]).toMatchObject({ shape: 'square', player: 1 });
		expect(s.nodes[1]).toMatchObject({ shape: 'square', player: 3 });
		expect(s.nodes[2].box).not.toBeNull();
		expect(s.nodes[2].utility).toBe('1,2,6');
		expect(s.levels.map((l) => [l.text, l.player])).toEqual([
			['Player 1', 1],
			['Player 3', 3]
		]);
	});

	it('draws large trees compactly', () => {
		const big = gameTreeScene(randomGameTree({ branching: 3, depth: 4, seed: 1 }));
		expect(big.compact).toBe(true);
		expect(big.nodes[0].halfW).toBeLessThan(scene.nodes[0].halfW);
	});
});

describe('drawing helpers', () => {
	it('builds triangle points and crosses', () => {
		expect(trianglePoints({ x: 10, y: 10, halfW: 5, halfH: 4, shape: 'max' })).toBe(
			'10,6 15,14 5,14'
		);
		expect(trianglePoints({ x: 10, y: 10, halfW: 5, halfH: 4, shape: 'min' })).toBe(
			'5,6 15,6 10,14'
		);
		expect(crossPath(0, 0, 2)).toBe('M-2 -2L2 2M2 -2L-2 2');
	});

	it('writes values and level names', () => {
		expect(utilityText(-3)).toBe('-3');
		expect(utilityText([4, 3, 2])).toBe('4,3,2');
		expect(levelText(SLIDE, 1, [])).toBe('MIN');
	});

	it('opens small trees larger and large trees at 1', () => {
		expect(initialZoom(200, 100, 1000, 600)).toBe(MAX_FIT_ZOOM);
		expect(initialZoom(500, 100, 600, 600)).toBeCloseTo(596 / 500);
		expect(initialZoom(800, 100, 600, 600)).toBeCloseTo(596 / 800);
		expect(initialZoom(3000, 100, 600, 600)).toBe(1);
		expect(initialZoom(0, 0, 600, 600)).toBe(1);
	});
});
