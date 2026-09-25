/**
 * Creates the solver worker. Call from `onMount` (never at module top level):
 * returns null where Web Workers are unavailable.
 */
import type { SolverWorker } from './queue';

export function createSolverWorker(): SolverWorker | null {
	if (typeof Worker === 'undefined') return null;
	try {
		return new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
	} catch {
		return null;
	}
}
