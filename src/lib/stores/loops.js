
import { writable, get } from "svelte/store";
import { getUserLoops } from "$lib/api/loop.js";

export const loops = writable([]);
export const loopsStatus = writable("unloaded");
// "unloaded" | "loading" | "loaded" | "error"


// Initialize the loops store by fetching the first batch and setting the first loop.
export async function initLoopsStore() {
    if (get(loopsStatus) !== "unloaded") return;
    await refreshLoopsStore();
}


// Fetch the user's loops and update the store accordingly.
export async function refreshLoopsStore() {
    loops.set([]);
    loopsStatus.set("loading");

    try {
        const data = await getUserLoops();
        loops.set(data);
        loopsStatus.set("loaded");
    } catch (err) {
        console.error("refreshLoopsStore error:", err);
        loops.set([]);
        loopsStatus.set("error");
    }
}
