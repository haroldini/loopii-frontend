
import { writable } from 'svelte/store';
import { getUnseenProfile, evaluateProfile } from '$lib/api/profile.js';

export const profile = writable(null);
export const profileStatus = writable('loading');


// Fetch the next profile
export async function fetchProfile() {
    profileStatus.set('loading');
    try {
        const profileRes = await getUnseenProfile();
        console.log('Fetched profile:', profileRes);

        if (profileRes.success) {
            profile.set(profileRes.data);
            profileStatus.set(profileRes.data ? 'loaded' : 'empty');
        } else {
            profile.set(null);
            profileStatus.set('error');
        }
    } catch (err) {
        profile.set(null);
        profileStatus.set('error');
    }
}


// Handle decision on the current profile
export async function handleDecision(connect) {
    let current;
    profile.subscribe(p => current = p)();

    if (!current) return;

    try {
        console.log('Evaluating profile:', current.id, 'Connect:', connect);
        const res = await evaluateProfile(current.id, connect);
        if (!res.success) throw new Error(res.error);

        await fetchProfile();
    } catch (err) {
        profile.set(null);
        profileStatus.set('error');
    }
}


// Initialize the profile store
export function initProfileStore() {
    fetchProfile();
}
