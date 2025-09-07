
import request from "$lib/utils/request.js";

// Get the logged-in user's profile
export function getProfile() {
    return request("/profile/me", {
        method: "GET"
    });
}

// Create a new profile
export function createProfile(data) {
    return request("/profile/create", {
        method: "POST",
        data
    });
}

// Update profile
export function updateProfile(data) {
    return request("/profile/update", {
        method: "POST",
        data
    });
}
