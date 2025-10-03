
import { writable, derived, get } from "svelte/store";
import { createProfile, getProfile, createProfileInterests, createProfileSocials } from "$lib/api/profile";
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
export const avatarUrl = writable(null);
export const avatarFile = writable(null);

// Image helpers
export const avatarOriginalUrl = writable(null);
export const avatarCropState = writable(null);

///// --- UI state ---
export const currentPage = writable(0);
export const validationErrors = writable([]);
export const error = writable(null);
export const submissionProgress = writable(null);
export const profileFormState = writable("idle");
// "idle" | "submitting" | "success" | "exists" | "partial" | "error"

export const pageFields = {
    0: ["username", "dob", "gender", "country", "name", "location"],   // Create your profile
    1: ["bio", "interests", "latitude", "longitude"],                  // Help others find you
    2: ["socials"]                                                     // What your loops will see
};

///// --- Validation logic ---
export function validateProfile($username, $dob, $gender, $country, $name, $bio, $location, $selectedInterests, $socials) {
    const errors = [];
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

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
            const field = `socials.${idx}`;

            // Case 1: platform_id + handle
            if (s.platform_id) {
                if (!s.handle || !s.handle.trim()) {
                    errors.push({ field, message: "Handle required", display: true });
                } else if (s.handle.trim().length > 50) {
                    errors.push({ field, message: "Handle too long", display: true });
                }

            // Case 2: custom_platform + custom_link
            } else if (s.custom_platform || s.custom_link) {
                if (!s.custom_platform || !s.custom_platform.trim()) {
                    errors.push({ field, message: "Custom platform required", display: true });
                } else if (s.custom_platform.trim().length > 30) {
                    errors.push({ field, message: "Custom platform too long", display: true });
                }

                const link = s.custom_link?.trim();
                if (!link) {
                    errors.push({ field, message: "Custom link required", display: true });
                } else {
                    if (link.length > 150) {
                        errors.push({ field, message: "Custom link too long", display: true });
                    }
                    try {
                        const u = new URL(link);
                        const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
                        if (!domainRegex.test(u.hostname)) {
                            errors.push({ field, message: "Custom link must have a valid domain", display: true });
                        }
                    } catch {
                        errors.push({ field, message: "Custom link must be a valid URL", display: true });
                    }
                }

            // Neither case satisfied
            } else {
                errors.push({ field, message: "Must provide either platform+handle or custom platform+link", display: true });
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


///// --- Submit function ---
export async function submitProfile() {
    profileFormState.set("submitting")
    submissionProgress.set("Creating profile");
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

        // Step 1: Create the profile
        let createdProfile;
        try {
            submissionProgress.set("Creating profile");
            createdProfile = await createProfile({
                username: $username,
                dob: $dob,
                gender: $gender,
                country_code: $country,
                name: $name || null,
                bio: $bio || null,
                location: $location || null,
                latitude: $latitude || null,
                longitude: $longitude || null,
            });
        } catch (err) {
            // Handle profile already exists, proceed to app
            if (err.status === 409) {
                error.set("You already have a profile");
                profileFormState.set("exists");

            // Handle validation errors from backend
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
                profileFormState.set("error");

            // Unknown error
            } else {
                error.set(err.message || "Unexpected error creating profile");
                profileFormState.set("error");
            }
            return;
        }

        // Step 2: Add interests
        let interestsError = false;
        if ($selectedInterests && $selectedInterests.length > 0) {
            try {
                submissionProgress.set("Adding interests");
                await createProfileInterests({ interest_ids: $selectedInterests });
            } catch {
                interestsError = true;
            }
        }

        // Step 3: Add socials
        let socialsError = false;
        if ($socials && $socials.length > 0) {
            try {
                submissionProgress.set("Adding socials");
                await createProfileSocials({ socials: $socials });
            } catch {
                socialsError = true;
            }
        }

        // Step 4: Handle successful profile creation but interest/social errors - Proceed to app
        if (interestsError || socialsError) {
            let msg = "Profile created, but failed to add ";
            if (interestsError) msg += "interests ";
            if (interestsError && socialsError) msg += "and ";
            if (socialsError) msg += "socials ";
            msg += "— please try adding them later from your profile page.";
            error.set(msg);
            profileFormState.set("partial");
        } else {
            profileFormState.set("success");
        }

        // Step 5: Fetch and set the new profile in global store
        try {
            submissionProgress.set("Done. Getting your profile");
            const fetchedProfile = await getProfile();
            profile.set(fetchedProfile);
        } catch {
            // Ignore fetch errors, user can refresh to get profile
        }

    // Handle unexpected errors
    } catch (err) {
        error.set(err.message || "Unexpected error");
        profileFormState.set("error")
    } finally {
        submissionProgress.set(null);
        if (["exists", "success", "partial"].includes(get(profileFormState))) {
            resetFields();
        }
    }
}

function resetFields() {
    name.set(null);
    username.set(null);
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
    avatarUrl.set(null);
    avatarFile.set(null);

    // Image helpers
    avatarOriginalUrl.set(null);
    avatarCropState.set(null);
}

export function resetState() {
    error.set(null);
    validationErrors.set([]);
    currentPage.set(0);
    profileFormState.set("idle");
}