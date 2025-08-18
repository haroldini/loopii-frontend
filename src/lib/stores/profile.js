
import { writable, get } from 'svelte/store';
import { getUnseenProfile, evaluateProfile } from '$lib/api/profile.js';

export const profile = writable(null);
export const profileStatus = writable('empty'); // can be 'loading', 'loaded', 'empty', 'error', 'retrieved'


// Fetch the next profile
export async function fetchProfile() {
    // prevent spam if already loading
    if (get(profileStatus) === 'loading') return;

    profileStatus.set('loading');

    try {
        const profileRes = await getUnseenProfile();
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
    } finally {
        if (get(profileStatus) === 'loading') profileStatus.set('retrieved');
    }
}


// Handle decision on the current profile
export async function handleDecision(connect) {
    let current;
    profile.subscribe(p => current = p)();

    if (!current) return;

    try {
        await fetchProfile();
        const res = await evaluateProfile(current.id, connect);
        if (!res.success) throw new Error(res.error);

    } catch (err) {
        profile.set(null);
        profileStatus.set('error');
    }
}


// Initialize the profile store
export function initProfileStore() {
    fetchProfile();
}
