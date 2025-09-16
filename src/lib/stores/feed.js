
import { writable, get } from "svelte/store";
import { getUnseenPeers, evaluatePeer } from "$lib/api/feed.js";

export const peer = writable(null);
export const peerQueue = writable([]);               // queue[0] is the current peer (not removed until evaluated)
export const peerStatus = writable("unloaded");      // "loading" | "loaded" | "empty" | "error" | "unloaded"
export const ongoingEvaluations = writable([]);

const QUEUE_BATCH_SIZE = 10;
const QUEUE_MIN = 5;

let isFetching = false;


// Fetch a batch of unseen peers, excluding those in the queue or currently being evaluated.
export async function fetchPeerBatch() {
    if (isFetching) return { ok: true, added: 0, skipped: true };
    isFetching = true;

    try {
        const exclude_ids = [...get(peerQueue).map(p => p.id), ...get(ongoingEvaluations)];
        const peers = await getUnseenPeers({ exclude_ids, limit: QUEUE_BATCH_SIZE });

        const added = Array.isArray(peers) ? peers.length : 0;
        if (added > 0) {
            peerQueue.update(q => [...q, ...peers]);
        }
        return { ok: true, added };

    } catch (err) {
        console.error("fetchPeerBatch error:", err);
        return { ok: false, added: 0, error: err?.message || String(err) };
    } finally {
        isFetching = false;
    }
}


// Set the current peer to the first in the queue, and manage fetching more if needed.
export function setNextPeer() {
    const queue = get(peerQueue);
    if (queue.length === 0) {
        peer.set(null);
        peerStatus.set("empty");   // only mark empty if no current and no queue
        return null;
    }
    
    peer.set(queue[0]);
    peerStatus.set("loaded");
    
    const remainingAfterCurrent = queue.length - 1;
    if (remainingAfterCurrent < QUEUE_MIN) {
        void fetchPeerBatch();
    }
    
    return queue[0];
}


// Initialize the peer store by fetching the first batch and setting the first peer.
export async function initPeerStore() {
    peerStatus.set("loading");

    const { ok, added } = await fetchPeerBatch();
    if (!ok) {
        peer.set(null);
        peerStatus.set("error");
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
    console.log("handleDecision", { current, connect });
    if (!current) return;

    const peerId = current.id;

    // Fire off evaluation in background
    (async () => {
        try {
            ongoingEvaluations.update(ids => [...ids, peerId])
            const result = await evaluatePeer(peerId, connect);

            if (result.looped && result.peer) {
                console.log("Looped with peer:", result.peer);
            }
        } catch (err) {
            console.error("Error evaluating peer:", err);
        } finally {
            ongoingEvaluations.update(ids => ids.filter(id => id !== peerId));
        }
    })();

    // Advance immediately
    peerQueue.update(q => q.slice(1));
    console.log("Queue after decision:", get(peerQueue));

    if (get(peerQueue).length === 0) {
        peer.set(null);
        peerStatus.set("loading");
        void (async () => {
            const { ok, added } = await fetchPeerBatch();

            if (!ok) {
                peerStatus.set("error");
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
    isFetching = false;
    peer.set(null);
    peerQueue.set([]);
    peerStatus.set("loading");
    await initPeerStore();
}
