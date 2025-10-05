
import { writable, get, derived } from "svelte/store";
import { supabase } from "$lib/stores/auth";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { getCountries, getInterests, getPlatforms } from "$lib/api/references";
import { getProfileFromLoop } from "$lib/api/loop";
import { refreshLoopsStore, selectedLoop } from "$lib/stores/loops";

import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";



// ----- Notifications -----

export const notifications = writable([]);

// Add a notification
export function addNotification(n) {
    const id = Date.now() + Math.random();
    notifications.update(list => [...list, { id, ...n }]);
    return id;
}

// Dismiss a notification
export function dismissNotification(id) {
    notifications.update(list => list.filter(n => n.id !== id));
}



// ----- References -----

export const allCountries = writable([]);
export const allInterests = writable([]);
export const allPlatforms = writable([]);
export const referencesLoaded = writable(false);


export async function initReferences() {
    if (get(referencesLoaded)) return; // already loaded

    try {
        const [countries, interests, platforms] = await Promise.all([
            getCountries(),
            getInterests(),
            getPlatforms(),
        ]);

        // Sort countries with US + GB pinned first
        const sortedCountries = [...countries].sort((a, b) => {
            if (a.code === "US") return -1;
            if (b.code === "US") return 1;
            if (a.code === "GB") return -1;
            if (b.code === "GB") return 1;
            return a.name.localeCompare(b.name);
        });

        allCountries.set(sortedCountries);
        allInterests.set(interests);
        allPlatforms.set(platforms);
        referencesLoaded.set(true);

    } catch (err) {
        console.error("Failed to load reference data", err);
    }
}


export const interestMap = derived(allInterests, list =>
    Object.fromEntries(list.map(i => [i.id, i.name]))
);

export const platformMap = derived(allPlatforms, list =>
    Object.fromEntries(list.map(p => [p.id, p]))
);

export const countryMap = derived(allCountries, list =>
    Object.fromEntries(list.map(c => [c.id, c]))
);



// ----- Real-time loop notifications -----

let loopChannel = null;
let authSyncBound = false;

export async function initLoopSub() {
    if (!browser || loopChannel) return;

    // Bind token once
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

    // get current user id for per-user topic
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    const topic = "realtime:loops:user:" + uid;
    const ch = supabase.channel(topic, { config: { private: true } });

    ch.on("broadcast", { event: "INSERT" }, async (payload) => {
        try {
        const newLoop = payload.payload?.record;
        if (!newLoop) { console.warn("No record in broadcast payload:", payload); return; }
        const profile = await getProfileFromLoop(newLoop.id);
        const notificationId = addNotification({
            type: "info",
            variant: "popup",
            text: "You have a new Loop!",
            component: ProfileCardPreview,
            props: {
            profile,
            onExpand: () => { selectedLoop.set(profile); goto("/loops"); dismissNotification(notificationId); }
            }
        });
        } catch (e) {
            console.error("Error handling new loop notification:", e);
        } finally {
            refreshLoopsStore(false);
        }
    }).subscribe((status, err) => {
        console.log("Loop broadcast channel:", status, err ?? "");
    });

    loopChannel = ch;
}

export function clearLoopSub() {
    if (loopChannel) {
        console.log("Unsubscribing from loop notifications");
        supabase.removeChannel(loopChannel);
        loopChannel = null;
    }
    // keep authSyncBound = true so we don’t rebind onAuthStateChange
}