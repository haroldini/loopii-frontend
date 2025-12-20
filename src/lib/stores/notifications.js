
import { get } from "svelte/store";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { supabase } from "$lib/stores/auth.js";
import { getProfileFromLoop, updateLoopState } from "$lib/api/loop.js";
import { upsertLoopItem, selectedLoop, loops, adjustNewLoopsCount } from "$lib/stores/loops.js";
import { addToast } from "$lib/stores/popups.js";
import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";



// ---------------- Notification Type Resolver ---------------- //

function buildNotificationConfig(n, profile = null, loop = null) {
    const base = {
        variant: "banner",
        text: n.data?.message ?? "You have a new notification.",
        description: null,
        autoHideMs: 5000,
        component: null,
        props: {},
    };

    if (n.type === "loop") {
        const username =
            profile?.username ?? n.data?.profile_username ?? "someone";

        return {
            ...base,
            variant: "popup",
            text: `You looped with ${username}!`,
            description: "Click to view their profile.",
            autoHideMs: null,
            component: ProfileCardPreview,
            props: profile ? { profile, loop } : {},
        };
    }

    return base;
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
                    // Loop notification with profile card + navigation
                    if (n.type === "loop" && n.data?.loop_id) {
                        const loopId = n.data.loop_id;

                        // Try to get profile
                        let profile = null;
                        let loop = null;

                        try {
                            const data = await getProfileFromLoop(loopId);
                            profile = data?.profile ?? null;
                            loop = data?.loop ?? null;
                            if (!profile || !loop) {
                                console.error("Notification dropped: profile or loop not found", loopId);
                                return;
                            }
                        } catch (err) {
                            console.error("Notification dropped: failed to load profile/loop:", err);
                            return;
                        }

                        upsertLoopItem({ loop, profile });

                        const config = buildNotificationConfig(n, profile, loop);

                        const openLoop = async () => {
                            const allLoops = get(loops);
                            const match = allLoops.find((item) => item?.loop?.id === loopId);

                            if (match) {
                                const wasSeen = match.loop.is_seen;

                                selectedLoop.set(match);

                                loops.update((arr) =>
                                    arr.map((item) =>
                                        item.loop.id === loopId
                                            ? { ...item, loop: { ...item.loop, is_seen: true } }
                                            : item
                                    )
                                );

                                // If this loop was previously unseen, decrement the badge count
                                if (!wasSeen) {
                                    adjustNewLoopsCount();
                                }
                                updateLoopState(loopId, { is_seen: true }).catch(console.error);

                            } else {
                                const wasSeen = !!loop?.is_seen;
                                selectedLoop.set({ loop, profile });
                                if (!wasSeen) adjustNewLoopsCount();
                                updateLoopState(loopId, { is_seen: true }).catch(console.error);
                            }

                            goto("/loops");
                            return { success: true };
                        };

                        // Only now show the toast after data validated
                        addToast({
                            ...config,
                            data: { notificationId: n.id, type: n.type },
                            onAction: openLoop,
                        });
                    
                    // Other notification types
                    } else {
                        const config = buildNotificationConfig(n, profile);
                        addToast({
                            ...config,
                            data: { notificationId: n.id, type: n.type },
                        });
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
