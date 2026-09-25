import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'approaches',
	title: 'Approaches to AI',
	summary:
		'Lays out the four definitions of AI (thinking or acting, humanly or rationally), poses the Winograd schema questions, and sorts AI applications into the four approaches on a shareable board.',
	topic: 'intro',
	order: 10,
	cites: [{ deck: 'intro', slide: [2, 18] }],
	keywords: [
		'definitions of AI',
		'intelligence',
		'acting humanly',
		'thinking humanly',
		'thinking rationally',
		'acting rationally',
		'Turing test',
		'total Turing test',
		'Winograd schema',
		'strong AI',
		'weak AI',
		'Chinese Room',
		'cognitive modeling',
		'cognitive science',
		'laws of thought',
		'logic',
		'rational agent'
	]
};
