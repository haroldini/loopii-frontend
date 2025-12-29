
import { writable, get } from "svelte/store";
import { getFeedProfiles, evaluatePeer } from "$lib/api/feed.js";
import { ENVIRONMENT } from "$lib/utils/env.js";


const isDev = ENVIRONMENT === "dev";


export const peer = writable(null);
export const peerQueue = writable([]);               // queue[0] is the current peer (not removed until evaluated)
export const peerStatus = writable("unloaded");      // "loading" | "loaded" | "empty" | "error" | "unloaded" | "hidden"
export const ongoingEvaluations = writable([]);

const QUEUE_BATCH_SIZE = 20;
const QUEUE_REFILL_AT = [QUEUE_BATCH_SIZE-5, 5];     // also refills when 0 remaining after decision made (handleDecision)

let fetchInFlight = null;


// Fetch a batch of feed profiles, excluding those in the queue or currently being evaluated.
export async function fetchPeerBatch() {
    if (fetchInFlight) return fetchInFlight;

    fetchInFlight = (async () => {
        try {
            const exclude_ids = [...get(peerQueue).map(p => p.id), ...get(ongoingEvaluations)];
            const peers = await getFeedProfiles({ exclude_ids, limit: QUEUE_BATCH_SIZE });

            const added = Array.isArray(peers) ? peers.length : 0;
            if (added > 0) {
                peerQueue.update(q => [...q, ...peers]);
            }

            return { ok: true, added };
        } catch (err) {
            if (isDev) console.error("fetchPeerBatch failed:", { status: err?.status, message: err?.message });
            const status = err?.status;
            if (status === 403) {
                peerStatus.set("hidden");
            }
            return {
                ok: false,
                added: 0,
                error: err?.message || String(err),
                status,
            };
        } finally {
            fetchInFlight = null;
        }
    })();

    return fetchInFlight;
}


// Set the current peer to the first in the queue, and manage fetching more if needed.
export function setNextPeer() {
    const queue = get(peerQueue);
    if (queue.length === 0) {
        peer.set(null);
        peerStatus.set("empty");
        return null;
    }
    
    peer.set(queue[0]);
    peerStatus.set("loaded");
    
    if (QUEUE_REFILL_AT.includes(queue.length)) {
        void fetchPeerBatch();
    }
    
    return queue[0];
}


// Initialize the peer store by fetching the first batch and setting the first peer.
export async function initPeerStore() {
    peerStatus.set("loading");

    const { ok, added, status } = await fetchPeerBatch();
    if (!ok) {
        peer.set(null);
        if (status === 403) {
            peerStatus.set("hidden");
        } else {
            peerStatus.set("error");
        }
        return;
    }

    if ((added === 0) && get(peerQueue).length === 0) {
        peer.set(null);
        peerStatus.set("empty");
        return;
    }

    setNextPeer();
}


// Handle user decision on current peer (connect or skip), advance to next peer instantly.
export function handleDecision(connect) {
    const current = get(peer);
    if (!current) return;

    const peerId = current.id;

    // Fire off evaluation in background
    (async () => {
        try {
            ongoingEvaluations.update(ids => [...ids, peerId])
            const result = await evaluatePeer(peerId, connect);
        } catch (err) {
            if (isDev) console.error("evaluatePeer failed:", { peerId, connect, status: err?.status, message: err?.message });
        } finally {
            ongoingEvaluations.update(ids => ids.filter(id => id !== peerId));
        }
    })();

    // Advance immediately
    peerQueue.update(q => q.slice(1));

    if (get(peerQueue).length === 0) {
        peer.set(null);
        peerStatus.set("loading");
        void (async () => {
            const { ok, added, status } = await fetchPeerBatch();

            if (!ok) {
                if (status === 403) {
                    peer.set(null);
                    peerStatus.set("hidden");
                } else {
                    peerStatus.set("error");
                }
                return;
            }
            if ((added === 0) && get(peerQueue).length === 0) {
                peerStatus.set("empty");
                return;
            }
            setNextPeer();
        })();
    } else {
        setNextPeer();
    }
}


// Reset the peer queue and force a fresh fetch
export async function refreshPeerStore() {
    fetchInFlight = null;
    peer.set(null);
    peerQueue.set([]);
    peerStatus.set("loading");
    await initPeerStore();
}
