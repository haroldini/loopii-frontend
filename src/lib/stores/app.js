import { writable, get, derived } from "svelte/store";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { getCountries, getInterests, getPlatforms } from "$lib/api/references";
import { refreshLoopsStore, selectedLoop } from "$lib/stores/loops";
import { getProfileFromLoop } from "$lib/api/loop";

import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";


// ---------------- Reference Data ---------------- //

export const allCountries = writable([]);
export const allInterests = writable([]);
export const allPlatforms = writable([]);
export const referencesLoaded = writable(false);

export async function initReferences() {
    if (get(referencesLoaded)) return;

    try {
        const [countries, interests, platforms] = await Promise.all([
            getCountries(),
            getInterests(),
            getPlatforms(),
        ]);

        // Sort countries with US and GB first
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

export const interestMap = derived(allInterests, (list) =>
    Object.fromEntries(list.map((i) => [i.id, i.name]))
);
export const platformMap = derived(allPlatforms, (list) =>
    Object.fromEntries(list.map((p) => [p.id, p]))
);
export const countryMap = derived(allCountries, (list) =>
    Object.fromEntries(list.map((c) => [c.id, c]))
);

