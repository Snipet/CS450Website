/**
 * The checklist as reactive state, saved to localStorage. Call `load()` from
 * `onMount` (localStorage does not exist while prerendering) and keep the
 * cleanup it returns: it stops listening for changes made in other tabs.
 * Storage can be unavailable (blocked, private windows); then `saved` is
 * false and the checks last until the page is closed.
 */
import { SvelteSet } from 'svelte/reactivity';
import { CHECKLIST_KEY, readChecklist, writeChecklist, type ChecklistData } from './checklist';

export class Checklist {
	readonly checked = new SvelteSet<string>();
	hideChecked = $state(false);
	/** Whether the stored checklist has been read. */
	loaded = $state(false);
	/** Whether changes reach localStorage. */
	saved = $state(true);

	readonly #order: readonly string[];
	readonly #known: Pick<ReadonlySet<string>, 'has'>;
	readonly #key: string;

	constructor(order: readonly string[], key = CHECKLIST_KEY) {
		this.#order = order;
		this.#known = { has: (id) => order.includes(id) };
		this.#key = key;
	}

	#apply(data: ChecklistData) {
		for (const id of [...this.checked]) if (!data.checked.has(id)) this.checked.delete(id);
		for (const id of data.checked) this.checked.add(id);
		this.hideChecked = data.hideChecked;
	}

	#save() {
		try {
			const data = { checked: this.checked, hideChecked: this.hideChecked };
			localStorage.setItem(this.#key, writeChecklist(data, this.#order));
			this.saved = true;
		} catch {
			this.saved = false;
		}
	}

	/** Reads the stored checklist and follows changes from other tabs; returns the cleanup. */
	load(): () => void {
		try {
			this.#apply(readChecklist(localStorage.getItem(this.#key), this.#known));
		} catch {
			this.saved = false;
		}
		this.loaded = true;
		const onStorage = (e: StorageEvent) => {
			if (e.key === this.#key || e.key === null)
				this.#apply(readChecklist(e.newValue, this.#known));
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}

	has(id: string): boolean {
		return this.checked.has(id);
	}

	set(id: string, value: boolean) {
		if (!this.#known.has(id)) return;
		if (value) this.checked.add(id);
		else this.checked.delete(id);
		this.#save();
	}

	setHideChecked(value: boolean) {
		this.hideChecked = value;
		this.#save();
	}

	clear() {
		this.checked.clear();
		this.#save();
	}
}
