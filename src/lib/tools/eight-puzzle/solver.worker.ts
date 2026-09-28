/**
 * Runs 8-puzzle solvers off the main thread. Each message is a
 * `SolverRequest`; the answer is a `SolverResponse`. Requests are handled one
 * at a time in the order they arrive; the page cancels by terminating the
 * worker.
 */
import { handleRequest, type SolverRequest } from './solvers';

addEventListener('message', (event: MessageEvent<SolverRequest>) => {
	postMessage(handleRequest(event.data));
});
