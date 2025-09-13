
import { writable, derived, get } from "svelte/store";
import { createProfile, getProfile } from "$lib/api/profile";
import { getCountries, getInterests } from "$lib/api/references";
import { profile } from "$lib/stores/profile";

///// --- Form state ---
export const username = writable("");
export const dob = writable("");
export const gender = writable("");
export const country = writable("");
export const name = writable("");
export const bio = writable("");
export const location = writable("");
export const selectedInterests = writable([]);

///// --- UI state ---
export const validationErrors = writable([]);
export const error = writable("");
export const profileFormState = writable("idle");
// "idle" | "submitting" | "success" | "exists" | "error"


// Stores for reference data
export const allCountries = writable([]);
export const allInterests = writable([]);


// Init function to load references
export async function initReferences() {
    try {
        const [countries, interests] = await Promise.all([
            getCountries(),
            getInterests()
        ]);
        allCountries.set(countries);
        allInterests.set(interests);

    } catch (err) {
        console.error("Failed to load reference data", err);
    }
}


///// --- Validation logic ---
export function validateProfile($username, $dob, $gender, $country) {
    const errors = [];
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    // Username required + format
    if (!$username) {
        errors.push({ message: "Username is required", display: false });
    } else {
        if ($username.length < 3 || $username.length > 30) {
            errors.push({ message: "Username must be 3–30 characters", display: true });
        }
        if (!usernameRegex.test($username)) {
            errors.push({ message: "Username may only contain letters, numbers, underscores", display: true });
        }
    }

    // DOB required + range
    if (!$dob) {
        errors.push({ message: "Date of birth is required", display: false });
    } else {
        const d = new Date($dob);
        if (d > new Date()) {
            errors.push({ message: "Date of birth cannot be in the future", display: true });
        }
        if (d < new Date("1900-01-01")) {
            errors.push({ message: "Date of birth must be after 1900", display: true });
        }
    }

    // Gender required
    if (!$gender) {
        errors.push({ message: "Gender is required", display: false });
    }

    // Country required
    if (!$country) {
        errors.push({ message: "Country is required", display: false });
    }

    validationErrors.set(errors);
    return errors.length === 0;
}

///// --- Derived store to check if profile is ready ---
export const readyToSubmit = derived(
    [username, dob, gender, country],
    ([$username, $dob, $gender, $country], set) => {
        set(validateProfile($username, $dob, $gender, $country));
    },
    false
);


///// --- Submit function ---
export async function submitProfile() {
    profileFormState.set("submitting")
    error.set("");
    
    try {
        const $username = get(username);
        const $dob = get(dob);
        const $gender = get(gender);
        const $country = get(country).toUpperCase();
        const $name = get(name);
        const $bio = get(bio);
        const $location = get(location);
        const $selectedInterests = get(selectedInterests);

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
            interest_ids: $selectedInterests || []
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

            // Handle FastAPI validation errors
            if (Array.isArray(detail) && detail.length > 0) {
            validationMsg = detail.map(d => d.msg || String(d)).join("; ");

            // Handle response = message
            } else if (typeof detail === "string") {
            validationMsg = detail;

            // Handle response contains message
            } else if (detail?.message) {
            validationMsg = detail.message;
            }
            error.set(validationMsg);
            profileFormState.set("error")
        } else {
            error.set(err.message || "Unexpected error");
            profileFormState.set("error")
        }
    }
}

function resetFields() {
    name.set("");
    dob.set("");
    gender.set("");
    country.set("");
}

export function resetState() {
    isSubmitting.set(false);
    error.set("");
    success.set(false);
    done.set(false);
    validationErrors.set([]);
}