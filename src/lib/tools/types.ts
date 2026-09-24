import type { Citation } from '$lib/lectures';

/**
 * Where a tool sits in the course. The home page groups tools by topic and the
 * course map shows every topic, including ones later lectures will fill in.
 */
export type Topic =
	| 'intro'
	| 'agents'
	| 'search'
	| 'informed'
	| 'csp'
	| 'planning'
	| 'games'
	| 'bayes'
	| 'mdp'
	| 'learning';

export interface ToolMeta {
	/** URL path without leading slash, e.g. 'search' → /search. Must match the route folder. */
	slug: string;
	title: string;
	/** One plain sentence describing what the tool does (no teaching claims). */
	summary: string;
	topic: Topic;
	/** Sort order within the topic (ascending). */
	order: number;
	/** Lecture material the tool follows. */
	cites: Citation[];
	/** Search keywords. */
	keywords?: string[];
}
