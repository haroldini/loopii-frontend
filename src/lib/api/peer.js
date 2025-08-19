
import request from '$lib/utils/request.js';

// Fetch an unseen peer
export function getUnseenPeer() {
    return request('/peer/get-unseen-peer');
}

// Decide whether to connect with a peer
export function evaluatePeer(peerId, connect) {
    return request('/peer/evaluate-peer', {
        method: 'POST',
        data: { peerId, connect }
    });
}