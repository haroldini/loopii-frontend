
import { writable, get } from "svelte/store";
import { getUserLoops } from "$lib/api/loop.js";


export const loops = writable([]);
export const selectedLoop = writable(null);
export const loopsState = writable({
    limit: 24,
    end: false,
    loading: false,
    initialized: false,
    cursorId: null,
});
export const loopsStatus = writable("unloaded");


// Initialize loops on first visit
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
        const { items, has_more, next_cursor } = await getUserLoops({ limit: s.limit });
        loops.set(items);

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


export async function loadMoreLoops() {
    const s = get(loopsState);
    if (s.loading || s.end) return;
    loopsState.set({ ...s, loading: true });

    try {
        const { items, has_more, next_cursor } = await getUserLoops({
            limit: s.limit,
            after_id: s.cursorId,
        });

        loops.update((prev) => [...prev, ...items]);

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

        const { items, has_more, next_cursor } = await getUserLoops({ limit: s.limit });
        loops.set(items);

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