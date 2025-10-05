
import { writable, get, derived } from "svelte/store";
import { profile } from "$lib/stores/profile";
import { validateProfileFields } from "$lib/utils/validators";
import { allCountries, allInterests, allPlatforms } from "./app";


// --- Form state ---
export const name = writable(null);
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
export const submissionProgress = writable([]); // array of strings of fields being submitted


// --- Begin editing ---
export function startEditing() {
    const current = get(profile);
    if (!current) return;

    // find the country code matching the stored id
    let countryCode = null;
    const countries = get(allCountries);
    if (current.country_id) {
        const match = countries.find(c => c.id === current.country_id);
        if (match) countryCode = match.code;
    }

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
    gender.set(current.gender || null);
    country.set(countryCode || null);
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
    [name, dob, gender, country, latitude, longitude, location, bio, selectedInterests, socials],
    ([$name, $dob, $gender, $country, $latitude, $longitude, $location, $bio, $selectedInterests, $socials], set) => {
        const ok = validateEditProfile();
        set(ok);
    },
    false
);


// --- Save changes ---
export async function saveEdits() {
	if (!get(readyToSubmit)) {
		error.set("Please fix errors before saving.");
		return;
	}

    profileEditState.set("saving");
    error.set(null);

    try {

        const sanitizedSocials = get(socials).map(({ platform_id, handle, custom_platform, custom_link }) => ({
            platform_id,
            handle,
            custom_platform,
            custom_link
        }));

        // TODO: replace with real API call
        console.log("Saving profile edits:", {
            name: get(name),
            dob: get(dob),
            gender: get(gender),
            country: get(country),
            latitude: get(latitude),
            longitude: get(longitude),
            location: get(location),
            bio: get(bio),
            interests: get(selectedInterests),
            socials: get(socials),
        });

        // // Simulate successful save
        // await new Promise((r) => setTimeout(r, 500));

        // Get a fresh copy of the current profile

        // // Update the global profile store
        // profile.set({
        //     ...current,
        //     name: $name,
        // });

        profileEditState.set("success");
    } catch (err) {
        error.set(err.message || "Unexpected error saving profile");
        profileEditState.set("error");
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