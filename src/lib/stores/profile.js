
import { writable } from 'svelte/store';
import { getProfile } from '$lib/api/profile';

// For validating that the user has a profile
export const profile = writable(null);
export const profileLoading = writable(false); // Default false, don't load profile until initProfile called


// Initialises profile on page load, before rendering children
export async function initProfile() {
    profileLoading.set(true);

    try {
        // Call backend to get the user's profile, null if no profile
        const res = await getProfile();
        profile.set(res.data ?? null);

    } catch (err) {
        // Unexpected error -> set profile to null and stop loading
        profile.set(null);
    }

    profileLoading.set(false);
}
