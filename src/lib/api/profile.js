
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


// Create profile interests (list)
export function createProfileInterests(data) {
    return request("/profile/interests", {
        method: "POST",
        data
    });
}


// Create profile socials (list)
export function createProfileSocials(data) {
    return request("/profile/socials", {
        method: "POST",
        data
    });
}
