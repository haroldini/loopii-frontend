
import { writable, get } from "svelte/store";
import { getUserLoops, deleteLoop as apiDeleteLoop } from "$lib/api/loop.js";
import { addToast } from "$lib/stores/popups.js";
import { ENVIRONMENT } from "$lib/utils/env.js";


const isDev = ENVIRONMENT === "dev";


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
	limit: 20,
	end: false,
	loading: false,
	initialized: false,
	cursorId: null,
});


export const loopsStatus = writable("unloaded");
export const loopDeleteConfirmEnabled = writable(true);


// --- Helper: sort favourites first, then newest ---
function sortLoops(items) {
    return (items || []).slice().sort((a, b) => {
        const favA = a?.loop?.is_favourite ? 1 : 0;
        const favB = b?.loop?.is_favourite ? 1 : 0;
        if (favA !== favB) return favB - favA;

        const aTime = a?.loop?.created_at ? new Date(a.loop.created_at).getTime() : 0;
        const bTime = b?.loop?.created_at ? new Date(b.loop.created_at).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;

        const aId = String(a?.loop?.id ?? "");
        const bId = String(b?.loop?.id ?? "");
        return bId.localeCompare(aId);
    });
}

// --- Helper: dedupe by loop.id ---
function dedupeByLoopId(items) {
    const map = new Map();
	for (const it of items || []) {
        const id = it?.loop?.id;
        if (id) map.set(id, it);
    }
    return [...map.values()];
}


// --- Public: upsert one loop item (used by notifications) ---
export function upsertLoopItem(item) {
    const loopId = item?.loop?.id;
    if (!loopId) return;

    let wasPresent = false;

    loops.update((prev) => {
        wasPresent = prev.some((x) => x?.loop?.id === loopId);

        // merge if exists, else append
        const merged = wasPresent
            ? prev.map((x) => {
                  if (x?.loop?.id !== loopId) return x;
                  return {
                      ...x,
                      ...item,
                      loop: { ...(x.loop || {}), ...(item.loop || {}) },
                      profile: item.profile ?? x.profile,
                  };
              })
            : [...prev, item];

        return sortLoops(dedupeByLoopId(merged));
    });

    if (!wasPresent) {
        loopsTotal.update((n) => n + 1);
        if (!item.loop?.is_seen) newLoopsCount.update((n) => n + 1);
    }
}


export async function initLoopsStore() {
	if (get(loopsStatus) !== "unloaded") return;
	await loadInitialLoops();
}


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
			limit: s.limit,
			loading: false,
			initialized: true,
			end: !has_more,
			cursorId: next_cursor,
		});
		loopsStatus.set("loaded");
	} catch (err) {
		if (isDev) console.error("loadInitialLoops failed:", { status: err?.status, message: err?.message });
		loopsStatus.set("error");
		loopsState.update((x) => ({ ...x, loading: false }));
	}
}


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

		loops.update((prev) => sortLoops(dedupeByLoopId([...prev, ...(items || [])])));
		if (total !== undefined) loopsTotal.set(total);
		if (unseen_total !== undefined) newLoopsCount.set(unseen_total || 0);

		loopsState.set({
			limit: s.limit,
			loading: false,
			end: !has_more,
			cursorId: next_cursor ?? s.cursorId,
		});
	} catch (err) {
		if (isDev) console.error("loadMoreLoops failed:", { status: err?.status, message: err?.message });
		loopsState.update((x) => ({ ...x, loading: false }));
	}
}


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
			limit: s.limit,
			end: !has_more,
			loading: false,
			initialized: true,
			cursorId: next_cursor,
		});
		loopsStatus.set("loaded");
	} catch (err) {
		if (isDev) console.error("refreshLoopsStore failed:", { status: err?.status, message: err?.message });
		loopsStatus.set("error");
		loopsState.update((x) => ({ ...x, loading: false }));
	}
}


// --- Local removal helper (used by optimistic delete) ---
function removeLoopLocally(loopId) {
	let removedLoop = null;

	loops.update((arr) => {
		const next = [];
		for (const item of arr) {
			if (item.loop?.id === loopId) {
				removedLoop = item.loop;
			} else {
				next.push(item);
			}
		}
		return next;
	});

	if (removedLoop) {
		loopsTotal.update((n) => (n > 0 ? n - 1 : 0));

		// If it was unseen, decrement unseen badge
		if (!removedLoop.is_seen) {
			adjustNewLoopsCount(); // default delta -1
		}

		// Clear selected loop if it was this one
		selectedLoop.update((sl) =>
			sl?.loop?.id === loopId ? null : sl
		);
	}

	return removedLoop;
}


// --- Perform delete once user has confirmed ---
async function performLoopDelete(loopId) {
	if (!loopId) return;

	// Snapshot state for potential rollback
	const prevLoops = get(loops);
	const prevTotal = get(loopsTotal);
	const prevNewCount = get(newLoopsCount);
	const prevSelected = get(selectedLoop);

	// Optimistic local removal
	const removed = removeLoopLocally(loopId);
	if (!removed) {
		// Nothing to delete locally; still try API but no visible change
	}

	try {
		await apiDeleteLoop(loopId);
	} catch (err) {
		if (isDev) console.error("performLoopDelete failed:", { status: err?.status, message: err?.message, loopId });

		// Roll back optimistic changes
		loops.set(prevLoops);
		loopsTotal.set(prevTotal);
		newLoopsCount.set(prevNewCount);
		selectedLoop.set(prevSelected);

		addToast({
			text: "Failed to delete loop.",
			description: "We couldn't remove this loop. Please try again later.",
			autoHideMs: 5000,
		});
	}
}


// --- Public: confirm + delete helper ---
// Call this from the UI instead of calling the API directly.
export function confirmLoopDelete(loopId) {
	if (!loopId) return;

	if (!get(loopDeleteConfirmEnabled)) {
		void performLoopDelete(loopId);
		return;
	}

	addToast({
		variant: "modal",
		text: "Delete loop?",
		description: "This will permanently remove this loop from your account.",
		autoHideMs: null,
		actions: [
			{
				label: "Cancel",
				variant: "secondary",
			},
			{
				label: "Delete loop",
				variant: "danger",
				onClick: () => {
					void performLoopDelete(loopId);
				},
			},
			{
				label: "Don't ask again",
				variant: "danger",
				onClick: () => {
					loopDeleteConfirmEnabled.set(false);
					void performLoopDelete(loopId);
				},
			},
		],
	});
}


// Reset preference so confirmation is shown again
export function resetLoopDeleteConfirmPreference() {
	loopDeleteConfirmEnabled.set(true);
}
