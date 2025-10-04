
import { get } from "svelte/store";
import { API_URL } from "$lib/utils/env.js";
import { session } from "$lib/stores/auth.js"; 


/**
 * Generic request function to handle API calls.
 * - On success (2xx), returns parsed JSON directly.
 * - On failure (non-2xx), throws Error with .status and .message.
 */
async function request(endpoint, { method = "GET", data, body } = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = get(session)?.access_token;

    // Build headers
    const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Only set Content-Type if not sending FormData
    if (!(body instanceof FormData) && data) {
        headers["Content-Type"] = "application/json";
    }

    // Build fetch options
    const options = {
        method,
        headers,
    };

    if (data) options.body = JSON.stringify(data);
    if (body) options.body = body;

    const res = await fetch(url, options);

    // Always read response body as text first, then try to parse JSON
    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

    // Handle error responses
    if (!res.ok) {
        let message = res.statusText || "Request failed";

        if (payload?.detail) {
            const d = payload.detail;
            if (Array.isArray(d)) message = d.map(x => x.msg || String(x)).join("; ");
            else if (typeof d === "string") message = d;
            else if (typeof d?.message === "string") message = d.message;
            else message = JSON.stringify(d);
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