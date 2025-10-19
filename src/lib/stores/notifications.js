
import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { supabase } from "$lib/stores/auth";

import { getNotifications, markNotificationRead } from "$lib/api/notifications";
import { getProfileFromLoop, getProfilesFromLoops } from "$lib/api/loop";
import { refreshLoopsStore, selectedLoop } from "$lib/stores/loops";
import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";


// ---------------- Core Store ---------------- //

export const notifications = writable([]); 
// Structure: [{ id, type, data, is_read, created_at, profile_id?, showPopup, autoHideMs, variant, component?, props?, onAction? }]

export const inboxState = writable({
    limit: 20,
    offset: 0,
    end: false,
    loading: false,
    initialized: false
});

export const unreadCount = derived(notifications, (list) =>
    list.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0)
);


// ---------------- Inbox Management ---------------- //

async function hydrateLoopNotifications(list) {
    // Get all unique loop IDs from notifications
    const loopIds = Array.from(
        new Set(
            list
                .filter((n) => n.type === "loop" && n.data?.loop_id)
                .map((n) => n.data.loop_id)
        )
    );

    if (loopIds.length === 0) return list;

    try {
        // Fetch the associated profiles in one batch
        const profilesMap = await getProfilesFromLoops(loopIds);

        // Return a new list with hydrated data
        return list.map((n) => {
            if (n.type === "loop" && n.data?.loop_id) {
                const profile = profilesMap[n.data.loop_id];
                if (profile) {
                    const openLoop = () => {
                        selectedLoop.set(profile);
                        goto("/loops");
                        markAsRead(n.id);
                    };
                    return {
                        ...n,
                        component: ProfileCardPreview,
                        props: { profile },
                        onAction: openLoop,
                    };
                }
            }
            return n;
        });
    } catch (err) {
        console.error("Failed to hydrate loop notifications:", err);
        return list; // fallback gracefully
    }
}


export async function loadInitialNotifications() {
    const s = get(inboxState);
    if (s.loading) return;
    inboxState.set({ ...s, loading: true });

    try {
        const limit = s.limit;
        const list = await getNotifications({ limit, offset: 0 });

        const enriched = await hydrateLoopNotifications(
            list.map((n) => ({
                ...n,
                showPopup: false,
                autoHideMs: null,
                variant: n.type === "loop" ? "popup" : "banner",
                component: null,
                props: null,
                onAction: null
            }))
        );

        notifications.set(enriched);

        inboxState.set({
            limit,
            offset: list.length,
            end: list.length < limit,
            loading: false,
            initialized: true
        });
    } catch (e) {
        console.error("Failed to load notifications:", e);
        inboxState.update((x) => ({ ...x, loading: false, initialized: true }));
    }
}


export async function loadMoreNotifications() {
    const s = get(inboxState);
    if (s.loading || s.end) return;
    inboxState.set({ ...s, loading: true });

    try {
        const list = await getNotifications({ limit: s.limit, offset: s.offset });

        // Map to hydrate structure
        const mapped = list.map((n) => ({
            ...n,
            showPopup: false,
            autoHideMs: null,
            variant: n.type === "loop" ? "popup" : "banner",
            component: null,
            props: null,
            onAction: null,
        }));

        // Hydrate any loop-type notifications with profile data
        const enriched = await hydrateLoopNotifications(mapped);

        // Append them to the store
        notifications.update((prev) => [...prev, ...enriched]);

        inboxState.set({
            ...s,
            offset: s.offset + list.length,
            end: list.length < s.limit,
            loading: false
        });
    } catch (e) {
        console.error("Failed to load more notifications:", e);
        inboxState.update((x) => ({ ...x, loading: false }));
    }
}

export function resetInbox() {
    notifications.set([]);
    inboxState.set({
        limit: 20,
        offset: 0,
        end: false,
        loading: false,
        initialized: false
    });
}


// ---------------- Mark as Read ---------------- //

export async function markAsRead(notificationId) {
    let prev;
    notifications.update((list) => {
        prev = list;
        return list.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, showPopup: false } : n
        );
    });

    try {
        await markNotificationRead(notificationId);
    } catch (e) {
        console.error("Failed to mark notification as read:", e);
        notifications.set(prev);
    }
}


// ---------------- Popup visibility ---------------- //

export function dismissNotification(notificationId) {
    notifications.update((list) =>
        list.map((n) =>
            n.id === notificationId ? { ...n, showPopup: false } : n
        )
    );
}


// ---------------- Realtime Subscription ---------------- //

let notificationChannel = null;
let authSyncBound = false;

export async function initNotificationSub() {
    if (!browser || notificationChannel) return;

    // Ensure auth token bound to Supabase Realtime
    if (!authSyncBound) {
        const { data } = await supabase.auth.getSession();
        const jwt = data?.session?.access_token;
        if (jwt) await supabase.realtime.setAuth(jwt);

        supabase.auth.onAuthStateChange((_e, s) => {
            const t = s?.access_token;
            if (t) supabase.realtime.setAuth(t);
        });

        authSyncBound = true;
    }

    // Current user
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    // Subscribe to user notifications
    const ch = supabase
        .channel("user-notifications")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${uid}`
            },
            async (payload) => {
                const n = payload.new;
                console.log("New notification received:", n);

                try {
                    // Insert new notification into store with popup display defaults.
                    const newNotif = {
                        ...n,
                        showPopup: true,
                        autoHideMs: n.type === "loop" ? null : 5000,
                        variant: n.type === "loop" ? "popup" : "banner",
                        component: null,
                        props: null,
                        onAction: null
                    };

                    notifications.update((prev) => [
                        newNotif,
                        ...prev.filter((x) => x.id !== n.id)
                    ]);

                    // Handle display logic
                    if (n.type === "loop") {
                        const profile = await getProfileFromLoop(n.data?.loop_id ?? null);

                        // Define the action once so both component-driven and popup-click paths can use it. // NEW
                        const openLoop = () => {
                            selectedLoop.set(profile);
                            goto("/loops");
                            markAsRead(n.id);
                        };

                        // Render popup with profile preview and wire action.
                        notifications.update((list) =>
                            list.map((x) =>
                                x.id === n.id
                                    ? {
                                          ...x,
                                          component: ProfileCardPreview,
                                          props: {
                                              profile,
                                          },
                                          onAction: openLoop
                                      }
                                    : x
                            )
                        );

                        refreshLoopsStore(false);
                    }

                } catch (err) {
                    console.error("Error handling notification payload:", err);
                }
            }
        )
        .subscribe((status, err) => {
            console.log("Notification channel:", status, err ?? "");
        });

    notificationChannel = ch;
}


export function clearNotificationSub() {
    if (notificationChannel) {
        console.log("Unsubscribing from notifications");
        supabase.removeChannel(notificationChannel);
        notificationChannel = null;
    }
}
