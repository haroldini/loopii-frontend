
import request from '$lib/utils/request.js';

// Fetch an unseen peer
export function getUnseenPeers({ exclude_ids = [], limit = 1 } = {}) {
    return request('/peer/get-unseen-peers', {
        method: 'POST',
        data: { exclude_ids, limit }
    });
}

// Decide whether to connect with a peer
export function evaluatePeer(peerId, connect) {
    return request('/peer/evaluate-peer', {
        method: 'POST',
        data: { peerId, connect }
    });
}