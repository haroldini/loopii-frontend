
import { writable, get } from "svelte/store";
import { getUserRequests } from "$lib/api/request.js";
import { ENVIRONMENT } from "$lib/utils/env.js";


const isDev = ENVIRONMENT === "dev";


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


// --- Helper: sort newest first by decision.created_at ---
function sortRequests(items) {
	return (items || []).slice().sort((a, b) => {
		const aTime = a?.decision?.created_at ? new Date(a.decision.created_at).getTime() : 0;
		const bTime = b?.decision?.created_at ? new Date(b.decision.created_at).getTime() : 0;
		if (aTime !== bTime) return bTime - aTime;

		// stable-ish tie-breaker
		const aId = String(a?.decision?.id ?? "");
		const bId = String(b?.decision?.id ?? "");
		return bId.localeCompare(aId);
	});
}

// --- Helper: dedupe by decision.id (keeps last occurrence) ---
function dedupeByDecisionId(items) {
	const map = new Map();
	for (const it of items || []) {
		const id = it?.decision?.id;
		if (id) map.set(id, it);
	}
	return [...map.values()];
}

// --- Public: upsert one request item (used by notifications) ---
export function upsertRequestItem(item) {
	const decisionId = item?.decision?.id;
	if (!decisionId) return;

	let wasPresent = false;

	loopRequests.update((prev) => {
		wasPresent = prev.some((x) => x?.decision?.id === decisionId);

		const merged = wasPresent
			? prev.map((x) => {
					if (x?.decision?.id !== decisionId) return x;
					return {
						...x,
						...item,
						decision: { ...(x.decision || {}), ...(item.decision || {}) },
						profile: item.profile ?? x.profile,
					};
			  })
			: [...prev, item];

		return sortRequests(dedupeByDecisionId(merged));
	});

	// counts are "pending requests", so increment only if it's a new request
	if (!wasPresent) {
		loopRequestsTotal.update((n) => n + 1);
		newRequestsCount.update((n) => n + 1);
	}
}

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
		const { items, has_more, next_cursor, total } = await getUserRequests({ limit: s.limit });

		loopRequests.set(sortRequests(dedupeByDecisionId(items || [])));
		loopRequestsTotal.set(total || 0);
		newRequestsCount.set(total || 0);

		loopRequestsState.set({
			limit: s.limit,
			loading: false,
			initialized: true,
			end: !has_more,
			cursorId: next_cursor,
		});
		loopRequestsStatus.set("loaded");
	} catch (err) {
		if (isDev) console.error("loadInitialLoopRequests failed:", { status: err?.status, message: err?.message });
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
		const { items, has_more, next_cursor, total } = await getUserRequests({
			limit: s.limit,
			after_id: s.cursorId,
		});

		loopRequests.update((prev) =>
			sortRequests(dedupeByDecisionId([...prev, ...(items || [])]))
		);

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
		if (isDev) console.error("loadMoreLoopRequests failed:", { status: err?.status, message: err?.message });
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

		const { items, has_more, next_cursor, total } = await getUserRequests({ limit: s.limit });

		loopRequests.set(sortRequests(dedupeByDecisionId(items || [])));
		loopRequestsTotal.set(total || 0);
		newRequestsCount.set(total || 0);

		loopRequestsState.set({
			limit: s.limit,
			end: !has_more,
			loading: false,
			initialized: true,
			cursorId: next_cursor,
		});
		loopRequestsStatus.set("loaded");
	} catch (err) {
		if (isDev) console.error("refreshLoopRequestsStore failed:", { status: err?.status, message: err?.message });
		loopRequestsStatus.set("error");
		loopRequestsState.update((x) => ({ ...x, loading: false }));
	}
}
