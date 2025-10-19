
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