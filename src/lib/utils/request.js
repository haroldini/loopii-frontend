
import { get } from "svelte/store";
import { API_URL, ENVIRONMENT } from "$lib/utils/env.js";
import { session } from "$lib/stores/auth.js";


const isDev = ENVIRONMENT === "dev";


function stripTrailingFullStop(message) {
    if (typeof message !== "string") return message;
    const trimmed = message.trim();

    // Strip exactly one trailing "." (leave ".." / "..." intact)
    if (trimmed.endsWith(".") && !trimmed.endsWith("..")) {
        return trimmed.slice(0, -1).trim();
    }

    return trimmed;
}


function parseErrorMessage(payload, fallback) {
    let message = fallback || "Request failed";

    const detail = payload?.detail;
    if (!detail) {
        return stripTrailingFullStop(message);
    }

    if (Array.isArray(detail)) {
        message = detail
            .map((x) => {
                const msg = x?.msg ?? String(x);

                const loc = Array.isArray(x?.loc)
                    ? x.loc
                        .filter(Boolean)
                        .filter((p) => p !== "body" && p !== "query" && p !== "path")
                        .join(".")
                    : null;

                return loc ? `${loc}: ${msg}` : msg;
            })
            .join("; ");

        return stripTrailingFullStop(message);
    }

    if (typeof detail === "string") {
        return stripTrailingFullStop(detail);
    }

    if (typeof detail?.message === "string") {
        return stripTrailingFullStop(detail.message);
    }

    try {
        return stripTrailingFullStop(JSON.stringify(detail));
    } catch {
        return stripTrailingFullStop(message);
    }
}


/**
 * Generic request function to handle API calls.
 * - On success (2xx), returns parsed JSON directly.
 * - On failure (non-2xx), throws Error with .status and .message.
 */
async function request(endpoint, { method = "GET", data, body } = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = get(session)?.access_token;

    const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const isFormData = body instanceof FormData;

    if (!isFormData && data) {
        headers["Content-Type"] = "application/json";
    }

    const options = {
        method,
        headers,
    };

    if (data) options.body = JSON.stringify(data);
    if (body) options.body = body;

    let res;
    let text = "";
    let payload = null;

    try {
        res = await fetch(url, options);
        text = await res.text();

        try {
            payload = text ? JSON.parse(text) : null;
        } catch {
            payload = null;
        }
    } catch (err) {
        const e = new Error("Network error");
        e.status = 0;
        e.data = null;

        if (isDev) {
            console.error("API error:", {
                endpoint,
                method,
                url,
                status: 0,
                requestBody: data ?? (isFormData ? "[FormData]" : null),
                response: null,
                error: err?.message || String(err),
            });
        }

        throw e;
    }

    if (!res.ok) {
        const message = parseErrorMessage(payload, res.statusText);

        const err = new Error(message);
        err.status = res.status;
        err.data = payload;

        if (isDev) {
            console.error("API error:", {
                endpoint,
                method,
                url,
                status: res.status,
                requestBody: data ?? (isFormData ? "[FormData]" : null),
                response: payload ?? (text ? "[non-json]" : null),
            });
        }

        throw err;
    }

    if (isDev) {
        console.debug("API success:", {
            endpoint,
            method,
            url,
            status: res.status,
            requestBody: data ?? (isFormData ? "[FormData]" : null),
            response: payload ?? (text ? "[non-json]" : null),
        });
    }

    return payload ?? {};
}

export default request;
