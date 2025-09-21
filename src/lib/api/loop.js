
import request from "$lib/utils/request.js";

// Get all loops for the logged-in user
export function getUserLoops() {
    return request("/loop/get-user-loops", {
        method: "GET"
    });
}

// Get the LoopProfile for a given loop ID (the profile of the non-logged-in user in the loop)
export function getProfileFromLoop(loopId) {
    return request(`/loop/get-profile-from-loop/${loopId}`, {
        method: "GET"
    });
}