
import { writable, derived, get } from "svelte/store";
import { createProfile, getProfile } from "$lib/api/profile";
import { allCountries, allInterests, allPlatforms } from "$lib/stores/app";
import { profile } from "$lib/stores/profile";

///// --- Form state ---
export const username = writable(null);
export const dob = writable(null);
export const gender = writable(null);
export const country = writable(null);
export const name = writable(null);
export const bio = writable(null);
export const location = writable(null);
export const latitude = writable(null);
export const longitude = writable(null);
export const selectedInterests = writable([]);
export const socials = writable([]);

///// --- UI state ---
export const currentPage = writable(0);
export const validationErrors = writable([]);
export const error = writable(null);
export const profileFormState = writable("idle");
// "idle" | "submitting" | "success" | "exists" | "error"

export const pageFields = {
    0: ["username", "dob", "gender", "country", "name", "location"],   // Create your profile
    1: ["bio", "interests", "latitude", "longitude"],                  // Help others find you
    2: ["socials"]                                                     // What your loops will see
};

///// --- Validation logic ---
export function validateProfile($username, $dob, $gender, $country, $name, $bio, $location, $selectedInterests, $socials) {
    const errors = [];
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    console.log("validating")

    // Username required + format
    if (!$username) {
        errors.push({ field: "username", message: "Username is required", display: false });
    } else {
        if ($username.length < 3 || $username.length > 30) {
            errors.push({ field: "username", message: "Username must be 3–30 characters", display: true });
        }
        if (!usernameRegex.test($username)) {
            errors.push({ field: "username", message: "Username may only contain letters, numbers, underscores", display: true });
        }
    }

    // DOB required + range
    if (!$dob) {
        errors.push({ field: "dob", message: "Date of birth is required", display: false });
    } else {
        const d = new Date($dob);
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

        if (d > today) {
            errors.push({ field: "dob", message: "Date of birth cannot be in the future", display: true });
        }
        if (d < new Date("1900-01-01")) {
            errors.push({ field: "dob", message: "Date of birth must be after 1900", display: true });
        }
        if (d > minDate) {
            errors.push({ field: "dob", message: "You must be at least 13 years old", display: true });
        }
    }

    // Gender required
    if (!$gender) {
        errors.push({ field: "gender", message: "Gender is required", display: false });
    }

    // Country required
    if (!$country) {
        errors.push({ field: "country", message: "Country is required", display: false });
    }

    // Display Name length (optional)
    if ($name && $name.length > 30) {
        errors.push({ field: "name", message: "Display name must be 30 characters or fewer", display: true });
    }

    // Bio length (optional)
    if ($bio && $bio.length > 500) {
        errors.push({ field: "bio", message: "Bio must be 500 characters or fewer", display: true });
    }

    // Location length (optional)
    if ($location && $location.length > 50) {
        errors.push({ field: "location", message: "Location must be 50 characters or fewer", display: true });
    }

    // Interests max count
    if ($selectedInterests && $selectedInterests.length > 20) {
        errors.push({ field: "interests", message: "You can select up to 20 interests", display: true });
    }

    // Socials validation
    if ($socials && $socials.length > 0) {
        $socials.forEach((s, idx) => {
            // Required
            if (!s.link || !s.link.trim()) {
                errors.push({ field: `socials.${idx}`, message: "Link required", display: true });
            } else {
                const link = s.link.trim();
                if (link.length > 150) {
                    errors.push({ field: `socials.${idx}`, message: "Link too long", display: true });
                }

                // URL format check
                try {
                    const url = new URL(link);
                    if (!["https:"].includes(url.protocol)) {
                        errors.push({ field: `socials.${idx}`, message: "Link must start with https://", display: true });
                    }
                } catch {
                    errors.push({ field: `socials.${idx}`, message: "Invalid URL format", display: true });
                }
            }

            // Platform required
            if (!s.platform_id && (!s.custom_platform || !s.custom_platform.trim())) {
                errors.push({ field: `socials.${idx}`, message: "Platform required", display: true });
            }

            // Custom platform length
            if (s.custom_platform && s.custom_platform.length > 30) {
                errors.push({ field: `socials.${idx}`, message: "Custom platform too long", display: true });
            }
        });
    }

    validationErrors.set(errors);
    return errors.length === 0;
}

///// --- Derived store to check if profile is ready for submission---
export const readyToSubmit = derived(
    [currentPage, username, dob, gender, country, name, bio, location, selectedInterests, socials],
    ([$currentPage, $username, $dob, $gender, $country, $name, $bio, $location, $selectedInterests, $socials]) => {
        const allValid = validateProfile(
            $username, $dob, $gender, $country, $name, $bio, $location, $selectedInterests, $socials
        );
        if ($currentPage === 2) return allValid;

        // Other pages: only require this page's fields to be error-free
        const fields = pageFields[$currentPage] || [];
        const pageErrors = get(validationErrors).filter(e => fields.includes(e.field));
        return pageErrors.length === 0;
    },
    false
);


// Socials UI functions
export function removeSocial(i) {
    socials.update(s => {
        s.splice(i, 1);
        return [...s];
    });
}

export function updateLink(i, value) {
    socials.update(s => {
        s[i].link = value;
        return [...s];
    });

    console.log(get(socials))
}

export function updateCustomPlatform(i, value) {
    socials.update(s => {
        s[i].custom_platform = value;
        return [...s];
    });
    console.log(get(socials))
}


///// --- Submit function ---
export async function submitProfile() {
    profileFormState.set("submitting")
    error.set(null);
    
    try {
        const $username = get(username);
        const $dob = get(dob);
        const $gender = get(gender);
        const $country = get(country).toUpperCase();
        const $name = get(name);
        const $bio = get(bio);
        const $location = get(location);
        const $latitude = get(latitude);
        const $longitude = get(longitude);
        const $selectedInterests = get(selectedInterests);
        const $socials = get(socials);

        if (!get(readyToSubmit)) {
            error.set("Please fix validation errors");
            return;
        }

        const data = await createProfile({
            username: $username,
            dob: $dob,
            gender: $gender,
            country_code: $country,
            name: $name || null,
            bio: $bio || null,
            location: $location || null,
            latitude: $latitude || null,
            longitude: $longitude || null,
            interest_ids: $selectedInterests || [],
            socials: $socials || [] 
        });

        profile.set(data);
        profileFormState.set("success");

    } catch (err) {

        // 409 for profile already exists
        if (err.status === 409) {
            error.set("You already have a profile");
            profileFormState.set("exists")

        // 422 for invalid payload / FastAPI validation error
        } else if (err.status === 422) {
            let validationMsg = "Invalid profile data";
            const detail = err.data?.detail;

            // Link FastAPI validation errors
            if (Array.isArray(detail) && detail.length > 0) {
            validationMsg = detail.map(d => d.msg || String(d)).join("; ");

            // Link response = message
            } else if (typeof detail === "string") {
            validationMsg = detail;

            // Link response contains message
            } else if (detail?.message) {
            validationMsg = detail.message;
            }
            error.set(validationMsg);
            profileFormState.set("error")
        } else {
            error.set(err.message || "Unexpected error");
            profileFormState.set("error")
        }
    } finally {
        if (["exists", "success"].includes(profileFormState)) {
            resetFields();
        }
    }
}

function resetFields() {
    name.set(null);
    dob.set(null);
    gender.set(null);
    country.set(null);
    name.set(null);
    bio.set(null);
    location.set(null);
    latitude.set(null)
    longitude.set(null)
    selectedInterests.set([])
    socials.set([])
}

export function resetState() {
    error.set(null);
    validationErrors.set([]);
    currentPage.set(0);
    profileFormState.set("idle");
}