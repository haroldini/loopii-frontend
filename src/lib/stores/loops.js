
import { writable, get } from "svelte/store";
import { getUserLoops } from "$lib/api/loop.js";

export const loops = writable([]);
export const selectedLoop = writable(null);
export const loopsTotal = writable(0);
export const newLoopsCount = writable(0);

// Adjust the backend-driven unseen loops badge by a delta (default -1). Clamped to 0.
export function adjustNewLoopsCount(delta = -1) {
	newLoopsCount.update((n) => {
		const next = n + delta;
		return next < 0 ? 0 : next;
	});
}

export const loopsState = writable({
	limit: 18,
	end: false,
	loading: false,
	initialized: false,
	cursorId: null,
});

export const loopsStatus = writable("unloaded");


// --- Helper: sort favourites first, then newest ---
function sortLoops(items) {
	return [...items].sort((a, b) => {
		const favA = a.loop?.is_favourite ? 1 : 0;
		const favB = b.loop?.is_favourite ? 1 : 0;
		if (favA !== favB) return favB - favA; // favourites first
		return new Date(b.loop.created_at) - new Date(a.loop.created_at); // newest first
	});
}


// Initialize loops on first visit
export async function initLoopsStore() {
	if (get(loopsStatus) !== "unloaded") return;
	await loadInitialLoops();
}


// Load initial loops
export async function loadInitialLoops() {
	const s = get(loopsState);
	if (s.loading) return;
	loopsState.set({ ...s, loading: true });
	loopsStatus.set("loading");

	try {
		const {
			items,
			has_more,
			next_cursor,
			total,
			unseen_total,
		} = await getUserLoops({ limit: s.limit });

		loops.set(sortLoops(items));
		loopsTotal.set(total || 0);
		newLoopsCount.set(unseen_total || 0);

		loopsState.set({
			...s,
			loading: false,
			initialized: true,
			end: !has_more,
			cursorId: next_cursor,
		});
		loopsStatus.set("loaded");
	} catch (err) {
		console.error("Failed to load loops:", err);
		loopsStatus.set("error");
		loopsState.update((x) => ({ ...x, loading: false }));
	}
}


// Load more loops (pagination)
export async function loadMoreLoops() {
	const s = get(loopsState);
	if (s.loading || s.end) return;
	loopsState.set({ ...s, loading: true });

	try {
		const {
			items,
			has_more,
			next_cursor,
			total,
			unseen_total,
		} = await getUserLoops({
			limit: s.limit,
			after_id: s.cursorId,
		});

		loops.update((prev) => sortLoops([...prev, ...items]));
		if (total !== undefined) loopsTotal.set(total);
		if (unseen_total !== undefined) newLoopsCount.set(unseen_total || 0);

		loopsState.set({
			...s,
			loading: false,
			end: !has_more,
			cursorId: next_cursor ?? s.cursorId,
		});
	} catch (err) {
		console.error("Failed to load more loops:", err);
		loopsState.update((x) => ({ ...x, loading: false }));
	}
}


// Refresh loops (reload from scratch)
export async function refreshLoopsStore() {
	const s = get(loopsState);
	if (s.loading) return;

	loopsStatus.set("loading");
	loopsState.set({ ...s, loading: true });
	loops.set([]);

	try {
		loopsState.set({
			limit: s.limit,
			end: false,
			loading: true,
			initialized: false,
			cursorId: null,
		});

		const {
			items,
			has_more,
			next_cursor,
			total,
			unseen_total,
		} = await getUserLoops({ limit: s.limit });

		loops.set(sortLoops(items));
		loopsTotal.set(total || 0);
		newLoopsCount.set(unseen_total || 0);

		loopsState.set({
			...s,
			end: !has_more,
			loading: false,
			initialized: true,
			cursorId: next_cursor,
		});
		loopsStatus.set("loaded");
	} catch (err) {
		console.error("Failed to refresh loops:", err);
		loopsStatus.set("error");
		loopsState.update((x) => ({ ...x, loading: false }));
	}
}
