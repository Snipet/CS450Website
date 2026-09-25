import type { Topic, ToolMeta } from './types';

/**
 * Each tool registers itself by adding `src/lib/tools/catalog/<slug>.ts` that
 * exports `const tool: ToolMeta`. No shared file needs editing.
 */
const modules = import.meta.glob<{ tool: ToolMeta }>('./catalog/*.ts', { eager: true });

export const tools: ToolMeta[] = Object.values(modules)
	.map((m) => m.tool)
	.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export function toolBySlug(slug: string): ToolMeta | undefined {
	return tools.find((t) => t.slug === slug);
}

/**
 * Topics in course order. `chapter` names the textbook part a lecture deck
 * covers; topics without lectures yet leave it out.
 */
export const topics: { id: Topic; title: string; blurb: string; chapter?: string }[] = [
	{
		id: 'intro',
		title: 'Introduction',
		blurb: 'Definitions of AI, the Turing test, and AI history',
		chapter: 'Chapter 1'
	},
	{
		id: 'agents',
		title: 'Rational agents',
		blurb: 'Agents, PEAS, and environment types',
		chapter: 'Chapter 2'
	},
	{
		id: 'search',
		title: 'Solving problems by searching',
		blurb: 'State spaces, tree search, and uninformed strategies',
		chapter: 'Chapter 3'
	},
	{
		id: 'informed',
		title: 'Informed search',
		blurb: 'Heuristics, greedy best-first search, and A*',
		chapter: 'Sections 3.5–3.6'
	},
	{
		id: 'csp',
		title: 'Constraint satisfaction',
		blurb: 'Variables, domains, and constraints'
	},
	{
		id: 'planning',
		title: 'Classical planning',
		blurb: 'Actions with preconditions and effects'
	},
	{
		id: 'games',
		title: 'Adversarial search',
		blurb: 'Minimax search and games'
	},
	{
		id: 'bayes',
		title: 'Probabilistic reasoning',
		blurb: 'Bayesian networks and pattern classifiers'
	},
	{
		id: 'mdp',
		title: 'Sequential decisions',
		blurb: 'Markov decision processes'
	},
	{
		id: 'learning',
		title: 'Reinforcement learning',
		blurb: 'Learning to act in unknown environments'
	}
];

export function toolsForTopic(topic: Topic): ToolMeta[] {
	return tools.filter((t) => t.topic === topic);
}
