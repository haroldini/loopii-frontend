
import request from '$lib/utils/request.js';

// Get all loops for the logged-in user
export function getUserLoops() {
    return request('/loop/get-user-loops', {
        method: 'GET'
    });
}
