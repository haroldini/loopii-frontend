
import { get } from 'svelte/store';

import { API_URL } from '$lib/utils/env.js';
import { session } from '$lib/stores/auth.js'; 


// Generic request function to handle API calls
async function request(endpoint, { method = 'GET', data } = {}) {
    const url = `${API_URL}${endpoint}`;

    // Grab the current session from the store
    const currentSession = get(session);
    const token = currentSession?.access_token;

    // Construct options
    const options = {
        method,
        headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
    if (data) options.body = JSON.stringify(data);

    // Make request
    const response = await fetch(url, options);

    // Throw on non-200 responses
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    // Parse JSON
    const json = await response.json();

    // Normalize to expected frontend structure
    // If backend did not include success/data/error, wrap it
    if (
        typeof json.success === 'boolean' &&
        'data' in json &&
        'error' in json
    ) {
        return json; // already standard
    } else {
        return { success: true, data: json, error: null };
    }
}

export default request;
