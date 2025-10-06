
import { writable, get, derived } from "svelte/store";
import { profile } from "$lib/stores/profile";
import { validateProfileFields } from "$lib/utils/validators";
import { normalizeProfile } from "$lib/utils/normalizers";
import { updateProfile } from "$lib/api/profile";
import { allCountries, allInterests, allPlatforms } from "./app";


// --- Form state ---
export const name = writable(null);
export const username = writable(null);
export const dob = writable(null);
export const gender = writable(null);
export const country = writable(null);
export const latitude = writable(null);
export const longitude = writable(null);
export const location = writable(null);
export const bio = writable(null);
export const selectedInterests = writable([]);
export const socials = writable([]);


// --- UI + Validation state ---
export const validationErrors = writable([]);
export const profileEditState = writable("idle");
// "idle" | "editing" | "saving" | "success" | "error"
export const error = writable(null);


// --- Begin editing ---
export function startEditing() {
    const current = get(profile);
    if (!current) return;

    const platforms = get(allPlatforms);

    // Clone socials deeply to avoid leaks
    const clonedSocials = current.socials ? structuredClone(current.socials) : [];

    // --- Enrich socials with platform names
    clonedSocials.forEach(social => {
        if (social.platform_id) {
            const platform = platforms.find(p => p.id === social.platform_id);
            if (platform) {
                social.name = platform.name;
            }
        }
    });

    // preload existing profile fields
    name.set(current.name || "");
    dob.set(current.dob || "");
    username.set(current.username || "");
    gender.set(current.gender || null);
    country.set(current.country_id || null);
    latitude.set(current.latitude || null);
    longitude.set(current.longitude || null);
    location.set(current.location || null);
    bio.set(current.bio || "");
    selectedInterests.set([...(current.interests || [])]);
    socials.set(clonedSocials);
    profileEditState.set("editing");
}


// --- Cancel editing ---
export function cancelEditing() {
    // clear all fields
    name.set(null);
    dob.set(null);
    username.set(null);
    gender.set(null);
    country.set(null);
    latitude.set(null);
    longitude.set(null);
    location.set(null);
    bio.set(null);
    selectedInterests.set([]);
    socials.set([]);

    // clear state
    validationErrors.set([]);
    error.set(null);
    profileEditState.set("idle");
}


// --- Validation ---
export function validateEditProfile() {

    const errors = validateProfileFields({
        name: get(name),
        dob: get(dob),
        username: get(username),
        gender: get(gender),
        country: get(country),
        latitude: get(latitude),
        longitude: get(longitude),
        location: get(location),
        bio: get(bio),
        interests: get(selectedInterests),
        socials: get(socials),
    });
    validationErrors.set(errors);
    return errors.length === 0;
}

// --- Derived: auto-validate on change ---
export const readyToSubmit = derived(
    [name, dob, username, gender, country, latitude, longitude, location, bio, selectedInterests, socials],
    ([$name, $dob, $username, $gender, $country, $latitude, $longitude, $location, $bio, $selectedInterests, $socials], set) => {
        const ok = validateEditProfile();
        set(ok);
    },
    false
);


// Helper for comparing new vs old profile data for partial updates
function valuesEqual(a, b) {
    // Handle nullish
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Handle floats (lat/lon)
    if (typeof a === "number" && typeof b === "number") {
        return Math.abs(a - b) < 1e-6; // small tolerance
    }

    // Handle dates (compare ISO only)
    if (a instanceof Date || b instanceof Date || /^\d{4}-\d{2}-\d{2}$/.test(a) || /^\d{4}-\d{2}-\d{2}$/.test(b)) {
        const da = typeof a === "string" ? a : a.toISOString().slice(0, 10);
        const db = typeof b === "string" ? b : b.toISOString().slice(0, 10);
        return da === db;
    }

    // Deep compare arrays/objects
    if (typeof a === "object" && typeof b === "object") {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    return a === b;
}


// --- Save changes ---
export async function saveEdits() {
    if (!get(readyToSubmit)) {
        error.set("Please fix errors before saving.");
        return;
    }

    profileEditState.set("saving");
    error.set(null);

    // Normalize
    const current = normalizeProfile(get(profile) || {});
    const fields = normalizeProfile({
        name: get(name),
        dob: get(dob),
        username: get(username),
        gender: get(gender),
        country_id: get(country),
        latitude: get(latitude),
        longitude: get(longitude),
        location: get(location),
        bio: get(bio),
        interests: get(selectedInterests),
        socials: get(socials),
    });

    // Filter out unchanged fields
    const changed = {};
    for (const key in fields) {
        const newVal = fields[key];
        const oldVal = current[key] ?? null;
        if (!valuesEqual(newVal, oldVal)) {
            changed[key] = newVal;
        }
    }
    if (Object.keys(changed).length === 0) {
        // Nothing changed, just exit
        profileEditState.set("idle");
        return;
    }

    // Submit update
    try {
        const updated = await updateProfile(changed);
        profile.set(updated);
        profileEditState.set("success");

    } catch (err) {
        profileEditState.set("error");
        error.set(err.message || "Unexpected error saving profile");
        console.error("Error updating profile:", err);
    }
}

// Socials UI functions
export function removeSocial(i) {
    socials.update(s => {
        s.splice(i, 1);
        return [...s];
    });
}

export function updateHandle(i, value) {
    socials.update(s => {
        s[i].handle = value;
        return [...s];
    });
}

export function updateCustomPlatform(i, value) {
    socials.update(s => {
        s[i].custom_platform = value;
        return [...s];
    });
}

export function updateCustomLink(i, value) {
    socials.update(s => {
        let v = value.trim();
        if (v && !/^https?:\/\//i.test(v)) {
            v = "https://" + v;  // normalize automatically
        }
        s[i].custom_link = v;
        return [...s];
    });
}