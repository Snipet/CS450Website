import { resolve } from '$app/paths';
import type { Pathname, ResolvedPathname } from '$app/types';

export const site = {
	name: 'CMSC450 AI Tools',
	shortName: 'CMSC450',
	description:
		'Interactive tools for CMSC450 (artificial intelligence): rational agents, task environments, search problems, and uninformed and informed search.'
} as const;

export interface NavLink {
	href: '/' | '/notation' | '/lectures';
	label: string;
}

export const navLinks: NavLink[] = [
	{ href: '/', label: 'Tools' },
	{ href: '/notation', label: 'Notation' },
	{ href: '/lectures', label: 'Lectures' }
];

/** Document title for a page: "A* search · CMSC450", or the site name. */
export function pageTitle(title?: string): string {
	return title ? `${title} · ${site.shortName}` : site.name;
}

/** Resolved link to a tool page from its slug (the tool's route folder). */
export function toolHref(slug: string): ResolvedPathname {
	// Tool routes are added one folder at a time, so a slug is only known to be a
	// route at runtime; this is the one place that asserts it.
	return resolve(`/${slug}` as Pathname);
}
