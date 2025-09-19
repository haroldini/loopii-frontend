
import { writable, get, derived } from "svelte/store";
import { getCountries, getInterests, getPlatforms } from "$lib/api/references";

// Stores for app-wide notifications
export const loopNotification = writable(null); 


// Reference data stores, loader and maps
export const allCountries = writable([]);
export const allInterests = writable([]);
export const allPlatforms = writable([]);
export const referencesLoaded = writable(false);


export async function initReferences() {
    if (get(referencesLoaded)) return; // already loaded

    try {
        const [countries, interests, platforms] = await Promise.all([
            getCountries(),
            getInterests(),
            getPlatforms(),
        ]);

        // Sort countries with US + GB pinned first
        const sortedCountries = [...countries].sort((a, b) => {
            if (a.code === "US") return -1;
            if (b.code === "US") return 1;
            if (a.code === "GB") return -1;
            if (b.code === "GB") return 1;
            return a.name.localeCompare(b.name);
        });

        allCountries.set(sortedCountries);
        allInterests.set(interests);
        allPlatforms.set(platforms);
        referencesLoaded.set(true);

    } catch (err) {
        console.error("Failed to load reference data", err);
    }
}


export const interestMap = derived(allInterests, list =>
    Object.fromEntries(list.map(i => [i.id, i.name]))
);

export const platformMap = derived(allPlatforms, list =>
    Object.fromEntries(list.map(p => [p.id, p]))
);