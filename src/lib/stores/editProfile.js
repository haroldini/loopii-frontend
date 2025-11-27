
import { writable, get, derived } from "svelte/store";
import { profile } from "$lib/stores/profile.js";
import { validateProfileFields } from "$lib/utils/validators.js";
import { normalizeProfile } from "$lib/utils/normalizers.js";
import { updateProfile } from "$lib/api/profile.js";
import { allCountries, allInterests, allPlatforms } from "$lib/stores/app.js";
import { addToast } from "$lib/stores/popups.js";


// For user confirmation on changing certain fields
const COOLDOWN_FIELDS = ["username", "dob", "gender", "country_id"];
const COOLDOWN_LABELS = {
    username: "username",
    dob: "date of birth",
    gender: "gender",
    country_id: "country",
};
let pendingSave = null;


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
export const star_sign = writable(null);
export const mbti = writable(null);
export const loop_bio = writable(null);
export const looking_for = writable(null);


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
    const clonedSocials = current.socials ? structuredClone(current.socials) : [];

    clonedSocials.forEach((social) => {
        if (social.platform_id) {
            const platform = platforms.find((p) => p.id === social.platform_id);
            if (platform) {
                social.name = platform.name;
            }
        }
    });

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
    star_sign.set(current.star_sign || "");
    mbti.set(current.mbti || "");
    loop_bio.set(current.loop_bio || "");
    looking_for.set(current.looking_for || "");
    profileEditState.set("editing");
}


// --- Cancel editing ---
export function cancelEditing() {
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
    star_sign.set(null);
    mbti.set(null);
    loop_bio.set(null);
    looking_for.set(null);
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
        loop_bio: get(loop_bio),
        looking_for: get(looking_for),
    });
    validationErrors.set(errors);
    return errors.length === 0;
}


// --- Derived: auto-validate on change ---
export const readyToSubmit = derived(
    [
        name, dob, username, gender, country,
        latitude, longitude, location, bio,
        selectedInterests, socials,
        star_sign, mbti, loop_bio, looking_for,
    ],
    (_, set) => set(validateEditProfile()),
    false,
);



// --- Comparison helper ---
function valuesEqual(a, b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    if (typeof a === "number" && typeof b === "number") {
        return Math.abs(a - b) < 1e-6;
    }

    if (
        a instanceof Date ||
        b instanceof Date ||
        (typeof a === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a)) ||
        (typeof b === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b))
    ) {
        const da = typeof a === "string" ? a : a.toISOString().slice(0, 10);
        const db = typeof b === "string" ? b : b.toISOString().slice(0, 10);
        return da === db;
    }

    if (typeof a === "object" && typeof b === "object") {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    return a === b;
}


// --- Derived: track whether there are unsaved changes ---
export const hasChanges = derived(
    [
        profile, name, dob, username, gender, country,
        latitude, longitude, location, bio,
        selectedInterests, socials,
        star_sign, mbti, loop_bio, looking_for,
    ],
    ([
        $profile, $name, $dob, $username, $gender, $country,
        $latitude, $longitude, $location, $bio,
        $selectedInterests, $socials,
        $star_sign, $mbti, $loop_bio, $looking_for,
    ], set) => {
        if (!$profile) return set(false);

        const current = normalizeProfile($profile);
        const fields = normalizeProfile({
            name: $name, dob: $dob, username: $username, gender: $gender,
            country_id: $country, latitude: $latitude, longitude: $longitude,
            location: $location, bio: $bio,
            interests: $selectedInterests, socials: $socials,
            star_sign: $star_sign, mbti: $mbti,
            loop_bio: $loop_bio, looking_for: $looking_for,
        });

        const changed = Object.keys(fields).some(
            (k) => !valuesEqual(fields[k], current[k] ?? null)
        );

        set(changed);
    },
    false,
);


// Helper to save changes to profile
async function performProfileUpdate(changed) {
    profileEditState.set("saving");
    error.set(null);

    try {
        const updated = await updateProfile(changed);
        profile.set(updated);
        profileEditState.set("success");
        startEditing();
        addToast({
            text: "Profile updated successfully.",
            autoHideMs: 3000,
        });
    } catch (err) {
        profileEditState.set("error");
        error.set(err.message || "Unexpected error saving profile");
        console.error("Error updating profile:", err);
        addToast({
            text: "Failed to update profile.",
            description: err.message || "We couldn't save your changes. Please try again later.",
            autoHideMs: 5000,
        });
    }
}


// --- Save changes ---
export async function saveEdits() {
    if (!get(readyToSubmit)) {
        error.set("Please fix errors before saving");
        return;
    }

    error.set(null);

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
        star_sign: get(star_sign),
        mbti: get(mbti),
        loop_bio: get(loop_bio),
        looking_for: get(looking_for),
    });

    const changed = {};
    for (const key in fields) {
        const newVal = fields[key];
        const oldVal = current[key] ?? null;
        if (!valuesEqual(newVal, oldVal)) {
            changed[key] = newVal;
        }
    }

    if (Object.keys(changed).length === 0) {
        profileEditState.set("editing");
        return;
    }

    const cooldownFieldsEdited = Object.keys(changed).filter((k) =>
        COOLDOWN_FIELDS.includes(k)
    );

    if (cooldownFieldsEdited.length > 0) {
        const labels = cooldownFieldsEdited.map((k) => COOLDOWN_LABELS[k] || k);

        let listText;
        if (labels.length === 1) listText = labels[0];
        else if (labels.length === 2) listText = labels.join(" and ");
        else listText = `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

        pendingSave = { changed };

        addToast({
            variant: "modal",
            text: "Confirm important changes",
            description: `You're about to change your ${listText}. These fields cannot be changed again for a while.`,
            autoHideMs: null,
            actions: [
                {
                    label: "Cancel",
                    variant: "secondary",
                },
                {
                    label: "Confirm changes",
                    variant: "danger",
                    onClick: () => {
                        confirmCooldownSave();
                    },
                },
            ],
        });

        return;
    }

    await performProfileUpdate(changed);
}


// --- Confirm cooldown save ---
export async function confirmCooldownSave() {
    if (!pendingSave) return;

    const { changed } = pendingSave;
    pendingSave = null;

    await performProfileUpdate(changed);
}


// --- Socials helpers ---
export function removeSocial(i) {
    socials.update((s) => {
        s.splice(i, 1);
        return [...s];
    });
}

export function updateHandle(i, value) {
    socials.update((s) => {
        s[i].handle = value;
        return [...s];
    });
}
