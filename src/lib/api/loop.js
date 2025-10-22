
import request from "$lib/utils/request.js";

// Get paginated loops for the logged-in user
export function getUserLoops({ limit = 20, after_id = null } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (after_id) query.set("after_id", after_id);
    return request(`/loop/get-user-loops?${query.toString()}`, { method: "GET" });
}

// Get the LoopProfile for a given loop ID (the profile of the non-logged-in user in the loop)
export function getProfileFromLoop(loopId) {
    return request(`/loop/get-profile-from-loop/${loopId}`, {
        method: "GET"
    });
}

// Get the LoopProfile for a list of loop IDs (the profile of the non-logged-in user in each loop)
export function getProfilesFromLoops(loopIds) {
    return request(`/loop/get-profiles-from-loops`, {
        method: "POST",
        data: { loop_ids: loopIds }
    });
}

// Update the user's loop state (favourite / seen)
export function updateLoopState(loopId, { is_fav = null, is_seen = null } = {}) {
    // Build payload with only provided keys
    const data = {};
    if (is_fav !== null && is_fav !== undefined) data.is_fav = is_fav;
    if (is_seen !== null && is_seen !== undefined) data.is_seen = is_seen;

    return request(`/loop/update-state/${loopId}`, {
        method: "PATCH",
        data
    });
}

// Delete a loop entirely (must belong to the logged-in user)
export function deleteLoop(loopId) {
    return request(`/loop/delete/${loopId}`, {
        method: "DELETE"
    });
}
