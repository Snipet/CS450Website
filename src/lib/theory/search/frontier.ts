/**
 * Frontier data structures (Uninformed Search, slides 3, 5, 40): a FIFO queue
 * for BFS, a LIFO queue for DFS, and a priority queue for UCS, greedy
 * best-first and A*. The priority queue breaks ties first in, first out.
 *
 * All three support lazy removal (`remove`), used when a cheaper node for the
 * same state replaces a frontier node.
 */

export type FrontierKind = 'fifo' | 'lifo' | 'priority';

export interface Frontier {
	readonly kind: FrontierKind;
	/** Live entries (removed ones excluded). */
	readonly size: number;
	push(id: number, priority: number): void;
	/** Takes the next node off, or returns undefined when empty. */
	pop(): number | undefined;
	/** Removes a node that is on the frontier (no-op otherwise). */
	remove(id: number): void;
	/** Live entries in the order they would be taken off. */
	snapshot(): number[];
}

export function createFrontier(kind: FrontierKind): Frontier {
	if (kind === 'fifo') return new FifoFrontier();
	if (kind === 'lifo') return new LifoFrontier();
	return new PriorityFrontier();
}

class FifoFrontier implements Frontier {
	readonly kind = 'fifo';
	#items: number[] = [];
	#head = 0;
	#removed = new Set<number>();
	#live = 0;

	get size() {
		return this.#live;
	}
	push(id: number) {
		this.#items.push(id);
		this.#removed.delete(id);
		this.#live++;
	}
	pop() {
		while (this.#head < this.#items.length) {
			const id = this.#items[this.#head++];
			if (this.#removed.delete(id)) continue;
			this.#live--;
			if (this.#head > 1024 && this.#head * 2 > this.#items.length) {
				this.#items = this.#items.slice(this.#head);
				this.#head = 0;
			}
			return id;
		}
		return undefined;
	}
	remove(id: number) {
		for (let i = this.#head; i < this.#items.length; i++) {
			if (this.#items[i] === id && !this.#removed.has(id)) {
				this.#removed.add(id);
				this.#live--;
				return;
			}
		}
	}
	snapshot() {
		const out: number[] = [];
		for (let i = this.#head; i < this.#items.length; i++) {
			const id = this.#items[i];
			if (!this.#removed.has(id)) out.push(id);
		}
		return out;
	}
}

class LifoFrontier implements Frontier {
	readonly kind = 'lifo';
	#items: number[] = [];
	#removed = new Set<number>();
	#live = 0;

	get size() {
		return this.#live;
	}
	push(id: number) {
		this.#items.push(id);
		this.#removed.delete(id);
		this.#live++;
	}
	pop() {
		while (this.#items.length) {
			const id = this.#items.pop()!;
			if (this.#removed.delete(id)) continue;
			this.#live--;
			return id;
		}
		return undefined;
	}
	remove(id: number) {
		if (this.#items.includes(id) && !this.#removed.has(id)) {
			this.#removed.add(id);
			this.#live--;
		}
	}
	snapshot() {
		const out: number[] = [];
		for (let i = this.#items.length - 1; i >= 0; i--) {
			const id = this.#items[i];
			if (!this.#removed.has(id)) out.push(id);
		}
		return out;
	}
}

interface Entry {
	id: number;
	priority: number;
	seq: number;
}

const before = (a: Entry, b: Entry) =>
	a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq);

/** Binary min-heap on (priority, insertion order). */
class PriorityFrontier implements Frontier {
	readonly kind = 'priority';
	#heap: Entry[] = [];
	#seq = 0;
	#removed = new Set<number>();
	#live = 0;

	get size() {
		return this.#live;
	}
	push(id: number, priority: number) {
		const heap = this.#heap;
		heap.push({ id, priority, seq: this.#seq++ });
		this.#removed.delete(id);
		this.#live++;
		let i = heap.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (!before(heap[i], heap[p])) break;
			[heap[i], heap[p]] = [heap[p], heap[i]];
			i = p;
		}
	}
	pop() {
		while (this.#heap.length) {
			const top = this.#take();
			if (this.#removed.delete(top.id)) continue;
			this.#live--;
			return top.id;
		}
		return undefined;
	}
	#take(): Entry {
		const heap = this.#heap;
		const top = heap[0];
		const last = heap.pop()!;
		if (heap.length) {
			heap[0] = last;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1;
				const r = l + 1;
				let m = i;
				if (l < heap.length && before(heap[l], heap[m])) m = l;
				if (r < heap.length && before(heap[r], heap[m])) m = r;
				if (m === i) break;
				[heap[i], heap[m]] = [heap[m], heap[i]];
				i = m;
			}
		}
		return top;
	}
	remove(id: number) {
		if (this.#removed.has(id)) return;
		if (this.#heap.some((e) => e.id === id)) {
			this.#removed.add(id);
			this.#live--;
		}
	}
	snapshot() {
		return this.#heap
			.filter((e) => !this.#removed.has(e.id))
			.sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0))
			.map((e) => e.id);
	}
}
