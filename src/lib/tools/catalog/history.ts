import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'history',
	title: 'AI history',
	summary:
		'Charts the eras of AI from 1943 to the present on one timeline with the AI winters and dated events from the lecture, alongside the foundations of AI, historical themes, and the state of the art.',
	topic: 'intro',
	order: 20,
	cites: [{ deck: 'intro', slide: [19, 27] }],
	keywords: [
		'history',
		'timeline',
		'foundations',
		'Herbert Simon',
		'perceptron',
		'AI winter',
		'Lighthill Report',
		'expert systems',
		'neural networks',
		'deep learning',
		'big data',
		'boom and bust',
		'silver bullet',
		'AI effect',
		'state of the art'
	]
};
