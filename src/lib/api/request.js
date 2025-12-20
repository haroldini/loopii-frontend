
import request from "$lib/utils/request.js";

// Fetch the authenticated user's incoming loop requests
export function getUserRequests({ limit = 20, after_id = null } = {}) {
	const params = new URLSearchParams();
	params.set("limit", limit.toString());
	if (after_id) params.set("after_id", after_id);
	return request(`/request/get-user-requests?${params.toString()}`, {
		method: "GET",
	});
}

// Fetch a loop request by decider profile ID for the authenticated user
export function getRequestByDecider(deciderId) {
    return request(`/request/get-request-by-decider/${deciderId}`, {
        method: "GET",
    });
}
