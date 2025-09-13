
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
    const token = get(session)?.access_token;

    // Build request options with headers and optional body
    const res = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
    });

    // Always read response body as text first, then try to parse JSON
    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

    // Handle error responses (non-2xx)
    if (!res.ok) {
        let message = res.statusText || "Request failed";

        // Normalize common FastAPI error shapes
        if (payload?.detail) {
            const d = payload.detail;
            if (Array.isArray(d)) message = d.map(x => x.msg || String(x)).join("; "); // Validation error array (422)
            else if (typeof d === "string") message = d; // Simple string detail
            else if (typeof d?.message === "string") message = d.message; // Structured object { code, message }
            else message = JSON.stringify(d); // Fallback: dump JSON
        }

        const err = new Error(message);
        err.status = res.status;
        err.data = payload;
        console.error("API error:", { endpoint, status: res.status, payload, err });
        throw err;
    }
    console.debug("API success:", { endpoint, status: res.status, payload });
    return payload ?? {};
}

export default request;