/**
 * Data behind the questions at the end of the task-environments page.
 */
import {
	SEARCH_SETTING,
	SLIDE_17_IDS,
	compareProfile,
	environmentExample,
	valueInfo,
	type Dimension,
	type EnvironmentProfile
} from '$lib/theory/agents/environments';

export interface SearchFit {
	id: string;
	name: string;
	/** No dimension differs from the search setting (unset ones are listed in `missing`). */
	fits: boolean;
	/** Values that differ, as lower-case names: "partially observable", "stochastic". */
	differs: string[];
	/** Dimensions of the search setting the example leaves unset. */
	missing: Dimension[];
}

/**
 * How each example compares with the setting of the search lectures (fully
 * observable, deterministic, discrete, known; Solving Problems by Searching,
 * slides 3–4).
 */
export function searchSettingFits(ids: readonly string[] = SLIDE_17_IDS): SearchFit[] {
	return ids.flatMap((id) => {
		const example = environmentExample(id);
		if (!example) return [];
		const cmp = compareProfile(example.profile, SEARCH_SETTING);
		return [
			{
				id,
				name: example.name,
				fits: cmp.differs.length === 0,
				differs: cmp.differs.map((d) =>
					(valueInfo(d, example.profile[d])?.name ?? '').toLowerCase()
				),
				missing: cmp.missing
			}
		];
	});
}

/** A poker classification for the group-work question (this site's, not the slides'). */
export const POKER: {
	name: string;
	values: EnvironmentProfile;
	reasons: Record<Dimension, string>;
} = {
	name: 'Poker',
	values: {
		observable: 'partially',
		deterministic: 'stochastic',
		episodic: 'sequential',
		static: 'static',
		discrete: 'discrete',
		agents: 'multi',
		known: 'known'
	},
	reasons: {
		observable: 'The other players’ cards are hidden.',
		deterministic:
			'Cards are dealt at random (and the other players’ bets are not up to the agent).',
		episodic: 'Bets earlier in a hand change what the later bets can do.',
		static: 'Nothing changes while a player decides.',
		discrete: 'Finitely many cards, bets, and actions.',
		agents: 'Two or more players.',
		known: 'The rules of the game are known to the players.'
	}
};
