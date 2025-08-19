
import { writable, get } from 'svelte/store';
import { getUnseenPeer, evaluatePeer } from '$lib/api/peer.js';

export const peer = writable(null);
export const peerStatus = writable('empty'); // can be 'loading', 'loaded', 'empty', 'error', 'retrieved'


// Fetch the next peer
export async function fetchPeer() {
    // prevent spam if already loading
    if (get(peerStatus) === 'loading') return;

    peerStatus.set('loading');

    try {
        const peerRes = await getUnseenPeer();
        if (peerRes.success) {
            peer.set(peerRes.data);
            peerStatus.set(peerRes.data ? 'loaded' : 'empty');
        } else {
            peer.set(null);
            peerStatus.set('error');
        }
    } catch (err) {
        peer.set(null);
        peerStatus.set('error');
    } finally {
        if (get(peerStatus) === 'loading') peerStatus.set('retrieved');
    }
}


// Handle decision on the current peer
export async function handleDecision(connect) {
    let current;
    peer.subscribe(p => current = p)();

    if (!current) return;

    try {
        await fetchPeer();
        const res = await evaluatePeer(current.id, connect);
        if (!res.success) throw new Error(res.error);

    } catch (err) {
        peer.set(null);
        peerStatus.set('error');
    }
}


// Initialize the peer store
export function initPeerStore() {
    fetchPeer();
}
