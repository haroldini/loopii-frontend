
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
