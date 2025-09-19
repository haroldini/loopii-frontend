
import { writable, get } from "svelte/store";
import { getUserLoops } from "$lib/api/loop.js";

export const loops = writable([]);
export const selectedLoop = writable(null); // Which loop to open on load
export const loopsStatus = writable("unloaded");
// "unloaded" | "loading" | "quietLoading" | "loaded" | "error"


// Initialize the loops store by fetching the first batch and setting the first loop.
export async function initLoopsStore() {
    if (get(loopsStatus) !== "unloaded") return;
    await refreshLoopsStore();
}


// Fetch the user's loops and update the store accordingly.
export async function refreshLoopsStore(show_loading = true) {

    // Only show loading state if specified
    if (show_loading) {
        loopsStatus.set("loading");
    } else {
        loopsStatus.set("quietLoading");
    }

    try {
        const data = await getUserLoops();
        loops.set(data);
        loopsStatus.set("loaded");

    } catch (err) {
        console.error("refreshLoopsStore error:", err);
        loopsStatus.set("error");
    }
}
