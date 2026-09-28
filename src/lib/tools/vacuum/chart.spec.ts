import { describe, expect, it } from 'vitest';
import {
	areaPath,
	linePath,
	linearScale,
	nearestPoint,
	niceTicks,
	scorePoints,
	timeTicks
} from './chart';

describe('chart geometry', () => {
	it('starts the score line at 0 before the first step', () => {
		expect(scorePoints([1, 2, 4])).toEqual([
			{ t: 0, score: 0 },
			{ t: 1, score: 1 },
			{ t: 2, score: 2 },
			{ t: 3, score: 4 }
		]);
	});

	it('picks round ticks that cover the range', () => {
		expect(niceTicks(0, 18)).toEqual([0, 5, 10, 15, 20]);
		expect(niceTicks(0, 1)).toEqual([0, 0.5, 1]);
		expect(niceTicks(-3, 10)).toEqual([-5, 0, 5, 10]);
		expect(niceTicks(0, 0)).toEqual([0, 0.5, 1]);
		expect(niceTicks(5, 5)).toEqual([0, 2, 4, 6]);
		expect(niceTicks(Number.NaN, 3)).toEqual([0]);
		expect(niceTicks(10, 0)).toEqual(niceTicks(0, 10));
	});

	it('picks integer time ticks and ends at the last step', () => {
		expect(timeTicks(10)).toEqual([0, 2, 4, 6, 8, 10]);
		expect(timeTicks(40)).toEqual([0, 10, 20, 30, 40]);
		expect(timeTicks(3)).toEqual([0, 1, 2, 3]);
		expect(timeTicks(0)).toEqual([0]);
		expect(timeTicks(1)).toEqual([0, 1]);
		const t = timeTicks(37);
		expect(t[t.length - 1]).toBe(37);
	});

	it('maps domains to ranges', () => {
		const x = linearScale(0, 10, 40, 140);
		expect(x(0)).toBe(40);
		expect(x(5)).toBe(90);
		expect(linearScale(0, 20, 180, 10)(20)).toBe(10);
		expect(linearScale(3, 3, 0, 100)(3)).toBe(0);
	});

	it('draws line and area paths', () => {
		const pts = scorePoints([1, 3]);
		const x = (t: number) => t * 10;
		const y = (s: number) => 100 - s * 10;
		expect(linePath(pts, x, y)).toBe('M0 100 L10 90 L20 70');
		expect(areaPath(pts, x, y, 0)).toBe('M0 100 L10 90 L20 70 L20 100 L0 100 Z');
		expect(areaPath([], x, y, 0)).toBe('');
	});

	it('finds the nearest point for the crosshair', () => {
		const pts = scorePoints([1, 3, 6]);
		expect(nearestPoint(pts, 1.4)).toEqual({ t: 1, score: 1 });
		expect(nearestPoint(pts, 2.6)).toEqual({ t: 3, score: 6 });
		expect(nearestPoint(pts, -5)).toEqual({ t: 0, score: 0 });
		expect(nearestPoint(pts, 99)).toEqual({ t: 3, score: 6 });
		expect(nearestPoint([], 1)).toBeNull();
	});
});
