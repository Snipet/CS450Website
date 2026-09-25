// The 8-puzzle. See docs/ARCHITECTURE.md §3.6 and §4.3.
export * from './types';
export {
	SIZE,
	CELLS,
	SLIDE_START,
	SLIDE_GOAL,
	PUZZLE_ACTIONS,
	OPPOSITE,
	isBoard,
	rowOf,
	colOf,
	tileAt,
	cellOf,
	blankCell,
	moves,
	applyMove,
	actionForCell,
	playMoves,
	formatBoard,
	parseBoard
} from './board';
export {
	PUZZLE_HEURISTICS,
	misplacedTiles,
	manhattanDistance,
	tileDistances,
	puzzleHeuristic
} from './heuristics';
export { REACHABLE_STATES, inversions, isSolvable } from './solvability';
export {
	PUZZLE_GRAPH_LIMITS,
	puzzleProblem,
	optimalSolutionLength,
	seededRandom,
	scrambleMoves,
	scramble
} from './problem';
