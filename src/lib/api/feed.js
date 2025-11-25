
import request from "$lib/utils/request.js";

// Fetch feed profiles
export function getFeedProfiles({ exclude_ids = [], limit = 1 } = {}) {
    return request("/feed/get-feed", {
        method: "POST",
        data: { exclude_ids, limit }
    });
}

// Decide whether to connect with a peer
export function evaluatePeer(peerId, connect) {
    return request("/feed/evaluate-peer", {
        method: "POST",
        data: { peerId, connect }
    });
}

// Fetch the authenticated user's incoming loop requests
export function getUserRequests({ limit = 20, after_id = null } = {}) {
	const params = new URLSearchParams();
	params.set("limit", limit.toString());
	if (after_id) params.set("after_id", after_id);
	return request(`/feed/get-user-requests?${params.toString()}`, {
		method: "GET",
	});
}