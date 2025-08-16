
import request from '$lib/utils/request.js';

// Fetch an unseen profile
export function getUnseenProfile() {
    return request('/profile/get-unseen-profile');
}

// Decide whether to connect with a profile
export function evaluateProfile(profileId, connect) {
    return request('/profile/evaluate-profile', {
        method: 'POST',
        data: { profileId, connect }
    });
}