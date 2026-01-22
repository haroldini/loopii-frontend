
import { writable, get, derived } from "svelte/store";
import { browser } from "$app/environment";

import { getAllReferences } from "$lib/api/references.js";


// ---------------- Appearance prefs (theme + style) ---------------- //

function createSelectPreference({
    storageKey,
    options,
    defaultValue,
    datasetKey,
}) {
    const allowed = new Set((options || []).map((o) => o.value));
    const fallback = allowed.has(defaultValue) ? defaultValue : (options?.[0]?.value ?? "");

    function normalize(value) {
        if (typeof value !== "string") return fallback;
        const cleaned = value.trim();
        return allowed.has(cleaned) ? cleaned : fallback;
    }

    function readFromDom() {
        if (!browser) return fallback;
        const raw = document.documentElement.dataset?.[datasetKey];
        return normalize(raw || fallback);
    }

    function applyToDom(value) {
        if (!browser) return;

        // Keep DOM clean: omit dataset when using default
        if (value === fallback) {
            delete document.documentElement.dataset[datasetKey];
        } else {
            document.documentElement.dataset[datasetKey] = value;
        }
    }

    const store = writable(fallback);

    function init() {
        if (!browser) return;

        let initial = fallback;

        try {
            const saved = localStorage.getItem(storageKey);
            if (saved != null) {
                initial = saved;
            } else {
                initial = readFromDom();
            }
        } catch (e) {
            initial = readFromDom();
        }

        initial = normalize(initial);
        store.set(initial);
        applyToDom(initial);
    }

    function setValue(value) {
        const next = normalize(value);
        store.set(next);
        applyToDom(next);

        try {
            localStorage.setItem(storageKey, next);
        } catch (e) {}
    }

    if (browser) init();

    return { store, init, setValue };
}


// ---------------- Theme ---------------- //

export const themeOptions = [
    { value: "dark", label: "Nightbloom (Default)" },
    { value: "midnight", label: "Midnight" },
    { value: "arcade", label: "Arcade" },
    { value: "moonmilk", label: "Moonmilk" },
    { value: "ember", label: "Ember" },
    { value: "cloud", label: "Cloud" },
    { value: "raspberry", label: "Raspberry" },
    { value: "amethyst", label: "Amethyst" },
    { value: "roseQuartz", label: "Rose Quartz" },
    { value: "peach", label: "Peach" },
];

const themePref = createSelectPreference({
    storageKey: "theme",
    options: themeOptions,
    defaultValue: "dark",
    datasetKey: "theme",
});

export const theme = themePref.store;
export function initTheme() { return themePref.init(); }
export function setTheme(value) { return themePref.setValue(value); }


// ---------------- Style ---------------- //

export const styleOptions = [
    { value: "pixel", label: "Pixel (Default)" },
    { value: "clean", label: "Clean" },
];

const stylePref = createSelectPreference({
    storageKey: "style",
    options: styleOptions,
    defaultValue: "pixel",
    datasetKey: "style",
});

export const style = stylePref.store;
export function initStyle() { return stylePref.init(); }
export function setStyle(value) { return stylePref.setValue(value); }

if (browser) {
    initTheme();
    initStyle();
}

// ---------------- Icons ---------------- //

const PLATFORM_ICONS = {
    "discord": "mingcute:discord-fill",
    "twitter / x": "mingcute:social-x-fill",
    "tiktok": "mingcute:tiktok-fill",
    "reddit": "mingcute:reddit-fill",
    "instagram": "mingcute:instagram-fill",
    "threads": "mingcute:threads-fill",
    "bluesky": "mingcute:bluesky-social-fill",
    "snapchat": "mingcute:snapchat-fill",
};

export const GENDER_ICONS = {
    male: "material-symbols:male-rounded",
    female: "material-symbols:female-rounded",
    other: "material-symbols:transgender-rounded",
};

export const UI_ICONS = {
    "animSpinner": "svg-spinners:ring-resize",
    "animLoading": "svg-spinners:gooey-balls-2",
    "animLoading2": "svg-spinners:gooey-balls-1",
    "animLoadingDots": "svg-spinners:3-dots-move",
    "animFailed": "line-md:emoji-frown",
    "animSuccess": "line-md:check-all",
    "animEmailCheck": "line-md:email-check",
    "animEmailSent": "line-md:email-arrow-right",

    "refresh": "mdi:refresh",
    "refreshError": "mdi:cloud-off-outline",
    "eyeClose": "mdi:eye-off-outline",
    "eyeOpen": "mdi:eye",
    "settings": "mdi:cog",
    "filtersEmpty": "mdi:account-off-outline",
    "loopsEmpty": "mdi:heart-off-outline",
    "editProfile": "mdi:account-edit",
    "resetPassword": "mdi:lock-open-check-outline",
    "accountAction": "mdi:account-cog",
    "link": "mdi:link-variant",
    "at": "mdi:at",
    "stars": "mdi:creation-outline",
    "star": "mdi:star-outline",
    "starFilled": "mdi:star",
    "github": "mdi:github",
    "bug": "mdi:bug",
    "terms": "mdi:file-document-outline",
    "privacy": "mdi:shield-lock-outline",
    "email": "mdi:email-outline",
    "report": "mdi:flag-outline",
    
    "delete": "mdi:delete",
    "minus": "mdi:minus",
    "chevronDown": "meteor-icons:chevron-down",
    "chevronUp": "meteor-icons:chevron-up",
    "chevronLeft": "meteor-icons:chevron-left",
    "chevronRight": "meteor-icons:chevron-right",
    "error": "mdi:alert-circle-outline",
    "alert": "mdi:alert-outline",
    "logout": "mdi:logout",
    "login": "mdi:login",
    "swap": "mdi:swap-horizontal",
    "close": "meteor-icons:xmark",
    "heart": "mdi:heart",
    "heartOutline": "mdi:heart-outline",
    "tune": "mdi:tune-variant",
    "signUp": "mdi:emoticon-plus-outline",
    "arrowLeft": "mdi:arrow-left",
    "arrowRight": "mdi:arrow-right",
    "send": "mdi:send",
    "check": "mdi:check",
    "upload": "mdi:upload",

    "online": "mdi:checkbox-marked-circle",
    "offline": "mdi:checkbox-blank-circle",

    "audioRecord": "mdi:circle",
    "audioPlay": "mdi:play",
    "audioStop": "mdi:stop",
    "audioPause": "mdi:pause",
    "audioRecordCircle": "mdi:record-circle",
    "audioDeleteCircle": "mdi:delete-circle",

    "image": "mdi:image-outline",
    "imageAdd": "mdi:image-plus-outline",
    "imageRemove": "mdi:image-remove-outline",
    "imageReplace": "mdi:image-refresh-outline",
    "imagePfp": "mdi:account-star",
    "imagePfpSet": "mdi:account-star-outline",

    "pinAdd": "mdi:map-marker",
    "pinRemove": "mdi:map-marker-remove",

    "compass": "mdi-compass-outline",
    "sticker": "mdi-sticker-emoji",
    "starFace": "mdi:star-face",
};

// ---------------- Reference Data ---------------- //

export const allCountries = writable([]);
export const allInterests = writable([]);
export const allPlatforms = writable([]);

// "unloaded" | "loading" | "loaded" | "error" | "timeout"
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
            throw new Error("Invalid reference data");
        }

        // Sort countries with US and GB first
        const sortedCountries = [...countries].sort((a, b) => {
            if (a.code === "US") return -1;
            if (b.code === "US") return 1;
            if (a.code === "GB") return -1;
            if (b.code === "GB") return 1;
            return String(a.name || "").localeCompare(String(b.name || ""));
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

