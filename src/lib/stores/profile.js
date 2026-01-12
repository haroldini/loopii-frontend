
import { writable, get } from "svelte/store";

import { getProfile } from "$lib/api/profile.js";
import { authState, forceUnauth } from "$lib/stores/auth.js";
import { ENVIRONMENT } from "$lib/utils/env.js";


const isDev = ENVIRONMENT === "dev";


// For profile data and state
export const profile = writable(null);
export const profileState = writable("idle");
// "idle" | "loading" | "missing" | "loaded" | "error" | "timeout"


// Reset profile on deauth
authState.subscribe((state) => {
    if (state === "unauthenticated") {
        resetProfile();
    }
});

// Refresh profile when account_restricted error occurs
let _refreshInFlight = false;

export async function refreshProfileSilently() {
    if (_refreshInFlight) return;
    _refreshInFlight = true;

    try {
        const data = await getProfile();
        if (data) {
            profile.set(data);
            if (get(profileState) !== "loaded") {
                profileState.set("loaded");
            }
        }
    } catch (err) {
        if (isDev) console.warn("refreshProfileSilently failed:", err);
    } finally {
        _refreshInFlight = false;
    }
}

if (typeof window !== "undefined") {
    window.addEventListener("account_restricted", () => {
        refreshProfileSilently();
    });
}


// Initialize the profile by fetching it from the API.
export async function initProfile() {
    profileState.set("loading");

    try {
        // Fetch profile
        const data = await getProfile(); // request.js throws on non-2xx
        if (data) {
            profile.set(data);
            profileState.set("loaded");
        } else {
            profile.set(null);
            profileState.set("missing");
        }

    } catch (err) {
        if (err.status === 401) {
            // Force unauth if auth error
            forceUnauth();
            profile.set(null);
            profileState.set("idle");
            return;
        } else if (err.status === 404) {
            // No profile
            profile.set(null);
            profileState.set("missing");
            return;
        }

        // Other errors
        if (isDev) console.error("initProfile failed:", err);
        profile.set(null);
        profileState.set("error");
    }
}

// Helper to reset profile
export function resetProfile() {
    profile.set(null);
    profileState.set("idle");
}
