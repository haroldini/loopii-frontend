
import { get } from "svelte/store";
import { API_URL } from "$lib/utils/env.js";
import { session } from "$lib/stores/auth.js"; 


/**
 * Generic request function to handle API calls.
 * - On success (2xx), returns parsed JSON directly.
 * - On failure (non-2xx), throws Error with .status and .message.
 */
async function request(endpoint, { method = "GET", data } = {}) {
    const url = `${API_URL}${endpoint}`;

    // Grab the current session from the store
    const currentSession = get(session);
    const token = currentSession?.access_token;

    // Construct options
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
    if (data) options.body = JSON.stringify(data);

    // Make request
    const response = await fetch(url, options);

    // Handle non-2xx responses. Prefer JSON error message if available, otherwise fallback to status text.
    if (!response.ok) {
        let message = response.statusText;
        try {
            const body = await response.json();
            if (body?.detail) message = body.detail;
        } catch {
            message = await response.text().catch(() => response.statusText);
        }

        const err = new Error(message || `HTTP ${response.status}`);
        err.status = response.status;
        throw err;
    }

    // Parse and return JSON response directly
    return await response.json();
}

export default request;