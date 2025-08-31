
import { writable, get } from 'svelte/store';
import { getUnseenPeers, evaluatePeer } from '$lib/api/feed.js';

export const peer = writable(null);
export const peerQueue = writable([]);            // queue[0] is the current peer (not removed until evaluated)
export const peerStatus = writable('empty');      // 'loading' | 'loaded' | 'empty' | 'error'
export const ongoingEvaluations = writable([]);

const QUEUE_BATCH_SIZE = 10;
const QUEUE_MIN = 5;

let isFetching = false;


/**
 * Fetch a batch of unseen peers from the API and append them to the queue.
 * Does not touch peerStatus directly - only returns result info.
*/
export async function fetchPeerBatch() {
    if (isFetching) return { ok: true, added: 0, skipped: true };
    isFetching = true;

    try {
        const exclude_ids = [...get(peerQueue).map(p => p.id), ...get(ongoingEvaluations)];
        const res = await getUnseenPeers({ exclude_ids, limit: QUEUE_BATCH_SIZE });

        if (res?.success) {
            const added = Array.isArray(res.data) ? res.data.length : 0;
            if (added > 0) {
                peerQueue.update(q => [...q, ...res.data]);
            }
            return { ok: true, added };
        }

        return { ok: false, added: 0, error: res?.error ?? 'Unknown error' };
    } catch (err) {
        console.error('fetchPeerBatch error:', err);
        return { ok: false, added: 0, error: err?.message || String(err) };
    } finally {
        isFetching = false;
    }
}

/**
 * Set the current peer to the first in the queue (without removing it).
 * If queue is running low, silently fetch more in the background.
*/
export function setNextPeer() {
    const queue = get(peerQueue);
    if (queue.length === 0) {
        peer.set(null);
        peerStatus.set('empty');   // only mark empty if no current and no queue
        return null;
    }
    
    peer.set(queue[0]);
    peerStatus.set('loaded');
    
    const remainingAfterCurrent = queue.length - 1;
    if (remainingAfterCurrent < QUEUE_MIN) {
        void fetchPeerBatch();
    }
    
    return queue[0];
}

/**
 * Initialize the peer store from scratch.
 * Sets peerStatus into 'loading', fetches peers, then either
 * assigns a peer or sets 'empty'/'error' if nothing available.
*/
export async function initPeerStore() {
    peerStatus.set('loading');

    const { ok, added } = await fetchPeerBatch();
    if (!ok) {
        peer.set(null);
        peerStatus.set('error');
        return;
    }

    if ((added === 0) && get(peerQueue).length === 0) {
        peer.set(null);
        peerStatus.set('empty');
        return;
    }

    setNextPeer();
}


/**
 * Handle a decision (connect or pass) on the current peer.
 * Moves on instantly, while evaluating the old peer in the background.
*/
export function handleDecision(connect) {
    const current = get(peer);
    if (!current) return;

    const peerId = current.id;

    // Fire off evaluation in background
    (async () => {
        try {
            ongoingEvaluations.update(ids => [...ids, peerId])
            const res = await evaluatePeer(peerId, connect);
            if (!res?.success) {
                console.error('Failed to evaluate peer:', res?.error);
            }
        } catch (err) {
            console.error('Error evaluating peer:', err);
        } finally {
            ongoingEvaluations.update(ids => ids.filter(id => id !== peerId));
        }
    })();

    // Advance immediately
    peerQueue.update(q => q.slice(1));

    if (get(peerQueue).length === 0) {
        peer.set(null);
        peerStatus.set('loading');
        void (async () => {
            const { ok, added } = await fetchPeerBatch();

            if (!ok) {
                peerStatus.set('error');
                return;
            }
            if ((added === 0) && get(peerQueue).length === 0) {
                peerStatus.set('empty');
                return;
            }
            setNextPeer();
        })();
    } else {
        setNextPeer();
    }
}