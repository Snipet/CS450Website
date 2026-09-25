// Search visualization components and helpers. See docs/ARCHITECTURE.md §3.2, §3.3, §5.3.
export { default as StateGraph } from './StateGraph.svelte';
export { default as SearchTree } from './SearchTree.svelte';
export { default as FrontierView } from './FrontierView.svelte';
export { default as StatusLegend } from './StatusLegend.svelte';

export {
	describeStep,
	describeResult,
	strategyName,
	strategyShort,
	queueName,
	priorityLabel,
	priorityPhrase,
	prioritySymbol,
	annotationText,
	defaultAnnotation,
	formatNumber,
	formatCount,
	type Annotation,
	type DescribeOptions
} from './describe';
export {
	layoutTree,
	type TreeLayout,
	type TreeLayoutNode,
	type TreeLayoutOptions
} from './tree-layout';
export {
	clampStep,
	iterationAt,
	iterationNodes,
	frontierOrder,
	exploredAfter,
	labelsByKey,
	solutionPathAt,
	currentNode,
	statusesAt,
	countStatuses,
	graphHighlightAt,
	type TreeNodeStatus
} from './tree-view';
export {
	graphLegend,
	treeLegend,
	LEGEND_ORDER,
	LEGEND_TEXT,
	type GraphHighlight,
	type LegendKey
} from './legend';
export { type NodeShape } from './graph-scene';
