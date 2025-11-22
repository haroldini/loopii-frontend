
import { writable, get, derived } from "svelte/store";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { getCountries, getInterests, getPlatforms } from "$lib/api/references.js";
import { refreshLoopsStore, selectedLoop } from "$lib/stores/loops.js";
import { getProfileFromLoop } from "$lib/api/loop.js";

import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";


// ---------------- Icons ---------------- //

const PLATFORM_ICONS = {
	"discord": "/platforms/discord.svg",
	"twitter / x": "/platforms/twitter.svg",
	"tiktok": "/platforms/tiktok.svg",
	"snapchat": "/platforms/snapchat.svg",
	"reddit": "/platforms/reddit.svg",
	"instagram": "/platforms/instagram.svg",
	"threads": "/platforms/threads.svg",
	"bluesky": "/platforms/bluesky.svg",
};

export const GENDER_ICONS = {
    male: {
        icon: "/genders/male.svg",
        color: "#4A90E2", // soft blue
    },
    female: {
        icon: "/genders/female.svg",
        color: "#E94E77", // rose pink
    },
    other: {
        icon: "/genders/other.svg",
        color: "#9B59B6", // violet / neutral
    },
};

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

        // Attach flag URLs by country code
        const countriesWithFlags = sortedCountries.map((c) => ({
            ...c,
            flag_url: c.code ? `/flags/${c.code.toLowerCase()}.svg` : null,
        }));

		// Attach static icons by normalized name
		const platformsWithIcons = platforms.map(p => {
			const key = p.name.trim().toLowerCase();
			return {
				...p,
				icon_url: PLATFORM_ICONS[key] || null,
			};
		});

        allCountries.set(countriesWithFlags);
        allInterests.set(interests);
        allPlatforms.set(platformsWithIcons);
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

