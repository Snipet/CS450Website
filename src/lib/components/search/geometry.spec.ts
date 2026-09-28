import { describe, expect, it } from 'vitest';
import {
	arrowHead,
	boundaryDistance,
	boundaryPoint,
	dist,
	fitCamera,
	grow,
	overlapArea,
	panBy,
	project,
	quadAt,
	segmentHitsBox,
	textWidth,
	unit,
	unproject,
	zoomAbout,
	type Camera,
	type Extent
} from './geometry';

describe('text and vectors', () => {
	it('estimates text widths', () => {
		expect(textWidth('abc', 10, 'mono')).toBeCloseTo(18);
		expect(textWidth('393=140+253', 11, 'mono')).toBeCloseTo(72.6);
		// Narrow letters are narrower than wide ones; weight adds a little.
		expect(textWidth('iii', 13)).toBeLessThan(textWidth('mmm', 13));
		expect(textWidth('Arad', 13, 'sans', 600)).toBeGreaterThan(textWidth('Arad', 13));
		expect(textWidth('', 13)).toBe(0);
		// "Rimnicu Vilcea" at 13 px is roughly 90–100 px in Inter.
		expect(textWidth('Rimnicu Vilcea', 13)).toBeGreaterThan(85);
		expect(textWidth('Rimnicu Vilcea', 13)).toBeLessThan(105);
	});

	it('dist and unit', () => {
		expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
		expect(unit(3, 4)).toEqual({ x: 0.6, y: 0.8 });
		expect(unit(0, 0)).toEqual({ x: 1, y: 0 });
	});

	it('quadAt interpolates a quadratic Bézier', () => {
		const p0 = { x: 0, y: 0 };
		const c = { x: 10, y: 20 };
		const p2 = { x: 20, y: 0 };
		expect(quadAt(p0, c, p2, 0)).toEqual(p0);
		expect(quadAt(p0, c, p2, 1)).toEqual(p2);
		expect(quadAt(p0, c, p2, 0.5)).toEqual({ x: 10, y: 10 });
	});
});

describe('outlines', () => {
	const circle = { kind: 'stadium', halfW: 10, r: 10 } as const;
	const pill = { kind: 'stadium', halfW: 30, r: 10 } as const;
	const square = { kind: 'square', half: 5 } as const;

	it('boundary distances of circles, pills, and squares', () => {
		expect(boundaryDistance(circle, { x: 1, y: 0 })).toBeCloseTo(10);
		expect(boundaryDistance(circle, unit(1, 1))).toBeCloseTo(10);
		expect(boundaryDistance(pill, { x: 1, y: 0 })).toBeCloseTo(30);
		expect(boundaryDistance(pill, { x: 0, y: -1 })).toBeCloseTo(10);
		// Through the flat top: y = 10 at a shallow angle within the straight part.
		const d = unit(1, 1);
		expect(boundaryDistance(pill, d) * d.y).toBeCloseTo(10);
		// Through the rounded end: the point lies on the cap circle.
		const e = unit(4, 1);
		const t = boundaryDistance(pill, e);
		expect(Math.hypot(e.x * t - 20, e.y * t)).toBeCloseTo(10);
		expect(boundaryDistance(square, { x: 1, y: 0 })).toBe(5);
		expect(boundaryDistance(square, unit(1, 1))).toBeCloseTo(5 * Math.SQRT2);
		expect(boundaryDistance(square, { x: 0, y: 0 })).toBe(5);
	});

	it('boundaryPoint', () => {
		const p = boundaryPoint({ x: 100, y: 50 }, circle, { x: 200, y: 50 });
		expect(p.x).toBeCloseTo(110);
		expect(p.y).toBeCloseTo(50);
	});

	it('arrowHead is a closed path with its tip first', () => {
		const d = arrowHead({ x: 10, y: 20 }, 0);
		expect(d.startsWith('M10 20L')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		// Pointing right: the base is 9 px to the left of the tip.
		expect(d).toContain('L1 24');
		expect(d).toContain('L1 16');
	});
});

describe('boxes and segments', () => {
	const box = { x: 0, y: 0, width: 10, height: 10 };
	it('overlapArea and grow', () => {
		expect(overlapArea(box, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
		expect(overlapArea(box, { x: 10, y: 0, width: 5, height: 5 })).toBe(0);
		expect(grow(box, 2)).toEqual({ x: -2, y: -2, width: 14, height: 14 });
	});

	it('segmentHitsBox', () => {
		expect(segmentHitsBox({ x: -5, y: 5 }, { x: 15, y: 5 }, box)).toBe(true);
		expect(segmentHitsBox({ x: -5, y: -5 }, { x: -1, y: 20 }, box)).toBe(false);
		expect(segmentHitsBox({ x: 2, y: 2 }, { x: 3, y: 3 }, box)).toBe(true);
		expect(segmentHitsBox({ x: 21, y: 0 }, { x: 0, y: 21 }, box)).toBe(false);
		expect(segmentHitsBox({ x: 12, y: 0 }, { x: 0, y: 12 }, box)).toBe(true);
	});
});

describe('camera', () => {
	const vp = { width: 400, height: 300 };
	const cam: Camera = { cx: 100, cy: 50, k: 2 };

	it('project and unproject are inverse', () => {
		expect(project(cam, vp, { x: 100, y: 50 })).toEqual({ x: 200, y: 150 });
		expect(project(cam, vp, { x: 110, y: 50 })).toEqual({ x: 220, y: 150 });
		const p = { x: 37, y: -12 };
		const back = unproject(cam, vp, project(cam, vp, p));
		expect(back.x).toBeCloseTo(p.x);
		expect(back.y).toBeCloseTo(p.y);
	});

	it('zoomAbout keeps the anchor fixed; panBy moves by pixels', () => {
		const about = { x: 50, y: 60 };
		const before = unproject(cam, vp, about);
		const z = zoomAbout(cam, vp, 1.5, about);
		expect(z.k).toBeCloseTo(3);
		const after = unproject(z, vp, about);
		expect(after.x).toBeCloseTo(before.x);
		expect(after.y).toBeCloseTo(before.y);
		expect(zoomAbout(cam, vp, NaN, about)).toEqual(cam);
		const p = panBy(cam, 20, -10);
		expect(project(p, vp, { x: 100, y: 50 })).toEqual({ x: 220, y: 140 });
	});

	it('fitCamera fits points plus their pixel extents', () => {
		const ext: Extent = { left: 10, right: 10, top: 10, bottom: 10 };
		const items = [
			{ x: 0, y: 0, ext },
			{ x: 100, y: 0, ext },
			{ x: 0, y: 50, ext }
		];
		const c = fitCamera(items, { width: 240, height: 1000 }, { pad: 10, maxK: 10 });
		// Width: 100·k + 10 + 10 = 240 − 2·10 → k = 2.
		expect(c.k).toBeCloseTo(2);
		expect(c.cx).toBeCloseTo(50);
		expect(c.cy).toBeCloseTo(25);
		for (const it of items) {
			const p = project(c, { width: 240, height: 1000 }, it);
			expect(p.x - 10).toBeGreaterThanOrEqual(10 - 1e-9);
			expect(p.x + 10).toBeLessThanOrEqual(230 + 1e-9);
		}
		// Uneven extents: a wide label on the right needs room only on that side.
		const wide = fitCamera(
			[
				{ x: 0, y: 0, ext: { left: 5, right: 5, top: 5, bottom: 5 } },
				{ x: 100, y: 0, ext: { left: 5, right: 85, top: 5, bottom: 5 } }
			],
			{ width: 300, height: 300 },
			{ pad: 0, maxK: 10 }
		);
		expect(wide.k).toBeCloseTo(2.1);
		// Capped magnification, a lone point, and no points.
		expect(fitCamera(items, { width: 10_000, height: 10_000 }).k).toBe(1.6);
		const lone = fitCamera([{ x: 5, y: 7, ext }], vp);
		expect([lone.cx, lone.cy, lone.k].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([5, 7, 1.6]);
		expect(fitCamera([], vp)).toEqual({ cx: 0, cy: 0, k: 1 });
		// Many points use the widest extents on every side.
		const many = Array.from({ length: 700 }, (_, i) => ({ x: i, y: 0, ext }));
		expect(fitCamera(many, { width: 719, height: 100 }, { pad: 0 }).k).toBeCloseTo(1);
	});
});
