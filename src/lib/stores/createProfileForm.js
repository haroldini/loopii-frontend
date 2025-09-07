
import { writable, derived, get } from "svelte/store";
import { createProfile, getProfile } from "$lib/api/profile";
import { profile } from "$lib/stores/profile";

///// --- Form state ---
export const name = writable("");
export const dob = writable("");
export const gender = writable("");
export const country = writable("");


///// --- UI state ---
export const isSubmitting = writable(false);
export const error = writable("");
export const success = writable(false);
export const done = writable(false);


///// --- Derived store to check if profile creation is ready to submit ---
export const readyToSubmit = derived(
    [name, dob, gender, country],
    ([$name, $dob, $gender, $country]) =>
        Boolean($name && $dob && $gender && $country)
);


// Submit function
export async function submitProfile() {
    isSubmitting.set(true);
    error.set("");
    success.set(false);
    done.set(false);

    try {
        const $name = get(name);
        const $dob = get(dob);
        const $gender = get(gender);
        const $country = get(country);

        if (!get(readyToSubmit)) {
            error.set("All fields are required");
            return;
        }

        // Call endpoint to create profile (request.js throws if not 2xx)
        const data = await createProfile({
            name: $name,
            dob: $dob,
            gender: $gender,
            country: $country,
        });

        // On success: update global profile store
        profile.set(data);
        success.set(true);

    } catch (err) {
        if (err.status === 409) {
            error.set("You already have a profile");
            success.set(true);

        } else if (err.status === 422) {
            if (err.message) {
                error.set(`Invalid profile data: ${err.message}`);
            } else {
                error.set("Invalid profile data");
            }
            success.set(false);
        } else {
            error.set(err.message || "Failed to create profile");
            success.set(false);
        }
    } finally {
        isSubmitting.set(false);
        done.set(true);
    }
}