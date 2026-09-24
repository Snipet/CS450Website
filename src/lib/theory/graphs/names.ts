/**
 * "Name order" for states: case-insensitive, with digit runs compared by
 * value (q2 < q10), then by code point so the order is total. The slides list
 * successors alphabetically: f → c, G; S → d, e, p; Arad → Sibiu, Timisoara, Zerind.
 */
export function compareNames(x: string, y: string): number {
	const ax = x.toLowerCase().match(/\d+|\D+/g) ?? [];
	const ay = y.toLowerCase().match(/\d+|\D+/g) ?? [];
	for (let i = 0; i < Math.min(ax.length, ay.length); i++) {
		const a = ax[i];
		const b = ay[i];
		if (a === b) continue;
		const da = /^\d/.test(a);
		const db = /^\d/.test(b);
		if (da && db) {
			const d = Number(a) - Number(b) || a.length - b.length;
			if (d) return d < 0 ? -1 : 1;
			continue;
		}
		return a < b ? -1 : 1;
	}
	if (ax.length !== ay.length) return ax.length - ay.length < 0 ? -1 : 1;
	return x < y ? -1 : x > y ? 1 : 0;
}
