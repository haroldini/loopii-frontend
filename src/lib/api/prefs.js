
import request from "$lib/utils/request.js";

// Update "who you see" (search preferences)
export function updateSearchPrefs(body) {
    return request("/prefs/search", {
        method: "PATCH",
        data: body
    });
}

// Update "who sees you" (visibility preferences)
export function updateVisibilityPrefs(body) {
    return request("/prefs/visibility", {
        method: "PATCH",
        data: body
    });
}
