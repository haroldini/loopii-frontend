
import { writable, get } from "svelte/store";
import { getUserRequests } from "$lib/api/feed.js";


// Store of pending loop requests: [{ decision, profile }]
export const loopRequests = writable([]);
export const selectedRequest = writable(null);
export const loopRequestsTotal = writable(0);
export const newRequestsCount = writable(0);

// Adjust the pending requests badge by a delta (default -1). Clamped to 0.
export function adjustNewRequestsCount(delta = -1) {
	newRequestsCount.update((n) => {
		const next = n + delta;
		return next < 0 ? 0 : next;
	});
}

export const loopRequestsState = writable({
	limit: 18,
	end: false,
	loading: false,
	initialized: false,
	cursorId: null,
});

export const loopRequestsStatus = writable("unloaded");


// Initialize requests on first visit
export async function initLoopRequestsStore() {
	if (get(loopRequestsStatus) !== "unloaded") return;
	await loadInitialLoopRequests();
}


// Load initial loop requests
export async function loadInitialLoopRequests() {
	const s = get(loopRequestsState);
	if (s.loading) return;
	loopRequestsState.set({ ...s, loading: true });
	loopRequestsStatus.set("loading");

	try {
		const {
			items,
			has_more,
			next_cursor,
			total,
		} = await getUserRequests({ limit: s.limit });

		loopRequests.set(items || []);
		loopRequestsTotal.set(total || 0);
		newRequestsCount.set(total || 0);

		loopRequestsState.set({
			...s,
			loading: false,
			initialized: true,
			end: !has_more,
			cursorId: next_cursor,
		});
		loopRequestsStatus.set("loaded");
	} catch (err) {
		console.error("Failed to load loop requests:", err);
		loopRequestsStatus.set("error");
		loopRequestsState.update((x) => ({ ...x, loading: false }));
	}
}


// Load more loop requests (pagination)
export async function loadMoreLoopRequests() {
	const s = get(loopRequestsState);
	if (s.loading || s.end) return;
	loopRequestsState.set({ ...s, loading: true });

	try {
		const {
			items,
			has_more,
			next_cursor,
			total,
		} = await getUserRequests({
			limit: s.limit,
			after_id: s.cursorId,
		});

		loopRequests.update((prev) => [...prev, ...(items || [])]);
		if (total !== undefined) {
			loopRequestsTotal.set(total);
			newRequestsCount.set(total);
		}

		loopRequestsState.set({
			...s,
			loading: false,
			end: !has_more,
			cursorId: next_cursor ?? s.cursorId,
		});
	} catch (err) {
		console.error("Failed to load more loop requests:", err);
		loopRequestsState.update((x) => ({ ...x, loading: false }));
	}
}


// Refresh loop requests (reload from scratch)
export async function refreshLoopRequestsStore() {
	const s = get(loopRequestsState);
	if (s.loading) return;

	loopRequestsStatus.set("loading");
	loopRequestsState.set({ ...s, loading: true });
	loopRequests.set([]);

	try {
		loopRequestsState.set({
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
		} = await getUserRequests({ limit: s.limit });

		loopRequests.set(items || []);
		loopRequestsTotal.set(total || 0);
		newRequestsCount.set(total || 0);

		loopRequestsState.set({
			...s,
			end: !has_more,
			loading: false,
			initialized: true,
			cursorId: next_cursor,
		});
		loopRequestsStatus.set("loaded");
	} catch (err) {
		console.error("Failed to refresh loop requests:", err);
		loopRequestsStatus.set("error");
		loopRequestsState.update((x) => ({ ...x, loading: false }));
	}
}
