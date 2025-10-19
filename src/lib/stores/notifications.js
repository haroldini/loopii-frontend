
import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { supabase } from "$lib/stores/auth";

import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteAllReadNotifications } from "$lib/api/notifications";
import { getProfileFromLoop, getProfilesFromLoops } from "$lib/api/loop";
import { refreshLoopsStore, selectedLoop } from "$lib/stores/loops";
import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";


// ---------------- Core Store ---------------- //

export const notifications = writable([]); 
// Structure: [{ id, type, data, is_read, created_at, profile_id?, showPopup, autoHideMs, variant, component?, props?, onAction? }]

export const inboxState = writable({
    limit: 20,
    end: false,
    loading: false,
    initialized: false,
    cursorId: null,
});


export const totalCount = writable(0);
export const totalUnread = writable(0);


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
        const { items, has_more, next_cursor, total_count, unread_count } = await getNotifications({ limit: s.limit });

        totalCount.set(total_count ?? 0);
        totalUnread.set(unread_count ?? 0);

        const enriched = await hydrateLoopNotifications(items.map(resolveNotificationBehavior));

        notifications.set(enriched);

        inboxState.set({
            ...s,
            end: !has_more,
            loading: false,
            initialized: true,
            cursorId: next_cursor,
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
        const { items, has_more, next_cursor, total_count, unread_count } = await getNotifications({
            limit: s.limit,
            after_id: s.cursorId,
        });

        totalCount.set(total_count ?? get(totalCount));
        totalUnread.set(unread_count ?? get(totalUnread));

        const enriched = await hydrateLoopNotifications(items.map(resolveNotificationBehavior));

        notifications.update((prev) => [...prev, ...enriched]);

        inboxState.set({
            ...s,
            end: !has_more,
            loading: false,
            cursorId: next_cursor ?? s.cursorId,
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
    const prev = get(notifications);
    const current = prev.find((n) => n.id === notificationId);

    
    notifications.update((list) =>
        list.map((n) =>
            n.id === notificationId
                ? { ...n, is_read: true, showPopup: false }
                : n
        )
    );

    // If it’s already read, skip the API entirely
    if (!current || current.is_read) return;

    // Optimistically update unread count
    totalUnread.update((count) => Math.max(0, count - 1));

    try {
        await markNotificationRead(notificationId);
        // success — nothing more to do
    } catch (e) {
        console.error("Failed to mark notification as read:", e);
        notifications.set(prev);
        totalUnread.update((count) => count + 1); // rollback
    }
}


// ---------------- Bulk Actions ---------------- //

export async function markAllReadHandler() {
    const prev = get(notifications);
    const unreadBefore = get(totalUnread);

    // Optimistically mark all read
    notifications.update((list) =>
        list.map((n) => ({ ...n, is_read: true, showPopup: false }))
    );
    totalUnread.set(0);

    try {
        await markAllNotificationsRead();
    } catch (err) {
        console.error("Failed to mark all as read:", err);
        notifications.set(prev);
        totalUnread.set(unreadBefore);
    }
}

export async function deleteAllReadHandler() {
    const prev = get(notifications);
    const totalBefore = get(totalCount);

    // Optimistically remove read notifications
    notifications.update((list) => list.filter((n) => !n.is_read));
    const remaining = get(notifications).length;
    totalCount.set(remaining);

    try {
        await deleteAllReadNotifications();
    } catch (err) {
        console.error("Failed to delete all read:", err);
        notifications.set(prev);
        totalCount.set(totalBefore);
    }
}


// ---------------- Notification Type Resolver ---------------- //

function resolveNotificationBehavior(n) {
    const resolved = {
        ...n,
        text: n.data?.message ?? "You have a new notification.",
        description: null,
        variant: "banner",
        autoHideMs: 5000,
        showPopup: false,
        component: null,
        props: {},
        onAction: () => markAsRead(n.id),
        onDismiss: () => markAsRead(n.id),
    };

    if (n.type === "loop") {
        const loopId = n.data?.loop_id ?? null;
        const username =
            n.props?.profile?.username ?? n.data?.profile_username ?? "someone";

        resolved.text = `You looped with ${username}!`;
        resolved.description = "Click to view their profile.";

        resolved.variant = "popup";
        resolved.autoHideMs = null;
        resolved.component = ProfileCardPreview;
        resolved.showPopup = false;

        resolved.onAction = async () => {
            selectedLoop.set(n.props?.profile ?? null);
            markAsRead(n.id);
            goto("/loops");
        };
    }

    return resolved;
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
                    // Base notification (no popup yet)
                    let newNotif = resolveNotificationBehavior(n);
                    newNotif = { ...newNotif, showPopup: false };

                    // Insert into store so inbox updates immediately
                    notifications.update((prev) => [
                        newNotif,
                        ...prev.filter((x) => x.id !== n.id)
                    ]);

                    // Update total counts
                    totalCount.update((c) => c + 1);
                    if (!n.is_read) totalUnread.update((c) => c + 1);

                    // If it's a loop, wait for profile before showing popup
                    if (n.type === "loop" && n.data?.loop_id) {
                        const profile = await getProfileFromLoop(n.data.loop_id);

                        const openLoop = () => {
                            selectedLoop.set(profile);
                            goto("/loops");
                            markAsRead(n.id);
                        };

                        notifications.update((list) =>
                            list.map((x) =>
                                x.id === n.id
                                    ? {
                                          ...x,
                                          component: ProfileCardPreview,
                                          props: { profile },
                                          onAction: openLoop,
                                          showPopup: true
                                      }
                                    : x
                            )
                        );

                        refreshLoopsStore(false);
                    } else {
                        // Non-loop notifications show immediately
                        notifications.update((list) =>
                            list.map((x) =>
                                x.id === n.id
                                    ? { ...x, showPopup: true }
                                    : x
                            )
                        );
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

