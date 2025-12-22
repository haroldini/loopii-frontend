
import { writable, get, derived } from "svelte/store";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { getAllReferences } from "$lib/api/references.js";
import { refreshLoopsStore, selectedLoop } from "$lib/stores/loops.js";
import { getProfileFromLoop } from "$lib/api/loop.js";

import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";


// ---------------- Theme ---------------- //

const THEME_STORAGE_KEY = "theme";

function normalizeTheme(value) {
    const allowed = new Set(themeOptions.map((t) => t.value));
    const fallback = themeOptions[0]?.value || "dark";

    if (typeof value !== "string") return fallback;

    const cleaned = value.trim();
    return allowed.has(cleaned) ? cleaned : fallback;
}

export const theme = writable("dark");

export const themeOptions = [
    { value: "dark", label: "Dark (Default)" },
    { value: "light", label: "Light" },
];

function applyThemeToDom(value) {
    if (!browser) return;

    if (value === "light") {
        document.documentElement.dataset.theme = "light";
    } else {
        delete document.documentElement.dataset.theme;
    }
}

export function initTheme() {
    if (!browser) return;

    let initial = "dark";

    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
            initial = saved;
        } else if (document.documentElement.dataset.theme === "light") {
            initial = "light";
        }
    } catch (e) {
        if (document.documentElement.dataset.theme === "light") {
            initial = "light";
        }
    }

    initial = normalizeTheme(initial);

    theme.set(initial);
    applyThemeToDom(initial);
}

export function setTheme(value) {
    const next = normalizeTheme(value);

    theme.set(next);
    applyThemeToDom(next);

    try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
    }
}

if (browser) {
    initTheme();
}


// ---------------- Icons ---------------- //

const PLATFORM_ICONS = {
    "discord": "meteor-icons:discord",
    "twitter / x": "meteor-icons:x",
    "tiktok": "meteor-icons:tiktok",
    "reddit": "meteor-icons:reddit",
    "instagram": "meteor-icons:instagram",
    "threads": "meteor-icons:threads",
    "bluesky": "meteor-icons:bluesky",
    "snapchat": "mingcute:snapchat-line",
};

export const GENDER_ICONS = {
    male: "material-symbols:male-rounded",
    female: "material-symbols:female-rounded",
    other: "material-symbols:transgender-rounded",
};

export const UI_ICONS = {
    "animSpinner": "svg-spinners:tadpole",
    "animLoading": "svg-spinners:gooey-balls-2",
    "animLoadingDots": "svg-spinners:3-dots-move",
    "animFailed": "line-md:emoji-frown",
    "animSuccess": "line-md:check-all",
    "animEmailCheck": "line-md:email-check",
    "animEmailSent": "line-md:email-arrow-right",

    "refresh": "mdi:refresh",
    "logout": "mdi:logout",
    "login": "mdi:login",
    "swap": "mdi:swap-horizontal",
    "close": "meteor-icons:xmark",
    "heart": "mdi:heart-outline",
    "tune": "mdi:tune-variant",
    "resetPassword": "mdi:lock-open-check-outline",
    "signUp": "mdi:emoticon-plus-outline",
    "arrowLeft": "mdi:arrow-left",
    "arrowRight": "mdi:arrow-right",
    "send": "mdi:send",

    "imageAdd": "mdi:image-plus-outline",
    "imageRemove": "mdi:image-remove-outline",
};

// ---------------- Reference Data ---------------- //

export const allCountries = writable([]);
export const allInterests = writable([]);
export const allPlatforms = writable([]);

// "unloaded" | "loading" | "loaded" | "error"
export const referencesStatus = writable("unloaded");

export async function initReferences({ force = false } = {}) {
    const s = get(referencesStatus);
    if (!force && (s === "loading" || s === "loaded")) return;

    referencesStatus.set("loading");

    try {
        const data = await getAllReferences();

        const countries = data?.countries ?? [];
        const interests = data?.interests ?? [];
        const platforms = data?.platforms ?? [];

        if (!Array.isArray(countries) || !Array.isArray(interests) || !Array.isArray(platforms)) {
            throw new Error("Invalid references payload");
        }

        // Sort countries with US and GB first
        const sortedCountries = [...countries].sort((a, b) => {
            if (a.code === "US") return -1;
            if (b.code === "US") return 1;
            if (a.code === "GB") return -1;
            if (b.code === "GB") return 1;
            return a.name.localeCompare(b.name);
        });

        // Attach flag icons by country code
        const countriesWithFlags = sortedCountries.map((c) => ({
            ...c,
            flag_icon: c.code ? `circle-flags:${c.code.toLowerCase()}` : null,
        }));

        // Attach static icons by normalized name
        const platformsWithIcons = platforms.map((p) => {
            const key = (p.name ?? "").trim().toLowerCase();
            return {
                ...p,
                icon_url: PLATFORM_ICONS[key] || null,
            };
        });

        allCountries.set(countriesWithFlags);
        allInterests.set(interests);
        allPlatforms.set(platformsWithIcons);

        referencesStatus.set("loaded");
    } catch (err) {
        console.error("Failed to load reference data", err);
        allCountries.set([]);
        allInterests.set([]);
        allPlatforms.set([]);
        referencesStatus.set("error");
    }
}

export function retryReferences() {
    return initReferences({ force: true });
}

export const interestMap = derived(allInterests, (list) =>
    Object.fromEntries((list || []).map((i) => [i.id, i.name]))
);

export const platformMap = derived(allPlatforms, (list) =>
    Object.fromEntries((list || []).map((p) => [p.id, p]))
);

export const countryMap = derived(allCountries, (list) =>
    Object.fromEntries((list || []).map((c) => [c.id, c]))
);

