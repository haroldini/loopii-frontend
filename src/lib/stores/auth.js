
import { writable, derived, get } from "svelte/store";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "$lib/utils/env";

import { updatePassword as _updatePassword, deleteAccount as _deleteAccount } from "$lib/api/account.js";
import { addNotification } from "$lib/stores/app";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- Auth state stores ---
export const user = writable(null);
export const session = writable(null);
export const resetToken = writable(null);
export const authState = writable("loading"); 
// "loading" | "unauthenticated" | "authenticated" | "recovery" | "error"

// For dangerous actions that require confirmation phrase
export const expectedPhrase = derived(user, ($user) => {
    const email = $user?.email ?? "";
    return `DELETE ${email}`;
});


// --- Auth initialisation ---
let authSub; // Singleton subscription to auth changes
export async function initAuth() {
    authState.set("loading");

    try {
        // Parse URL for potential recovery redirects
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        const type = hashParams.get("type") || queryParams.get("type");
        const access_token = hashParams.get("access_token") || queryParams.get("token");

        // Collect message params from URL
        const urlMsg =
            hashParams.get("message") ||
            queryParams.get("message") ||
            hashParams.get("error_description") ||
            queryParams.get("error_description");
        if (urlMsg) {
            const kind = /error|fail|denied/i.test(urlMsg) ? "error" : "success";
            addNotification({
                type: kind,
                variant: "banner",
                text: urlMsg,
            });
            history.replaceState(null, "", window.location.pathname + window.location.search);
        }

        // If this is a recovery flow and we have an access_token, set the session
        if (type === "recovery" && access_token) {
            const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token: hashParams.get("refresh_token")
            });
            if (error) {
                console.error("Error setting recovery session:", error.message);
                authState.set("error");
                return;
            }
            resetToken.set(access_token);
            authState.set("recovery");
            history.replaceState(null, "", window.location.pathname + window.location.search);
            return;
        }

        // Normal session lookup
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting session:", error.message);
            authState.set("error");
            return;
        }
        session.set(data.session);
        user.set(data.session?.user ?? null);
        authState.set(data.session?.user ? "authenticated" : "unauthenticated");

        // Subscribe to auth state changes once
        if (!authSub) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
                // console.log("auth event:", _event, newSession);
                session.set(newSession);
                user.set(newSession?.user ?? null);
                authState.set(newSession?.user ? "authenticated" : "unauthenticated");
            });
            authSub = subscription
        }

    } catch (err) {
        console.error("Unexpected error during auth init:", err);
        authState.set("error");
    } finally {
        if (get(authState) === "loading") {
            console.warn("Auth finished without setting state. Defaulting to unauthenticated");
            authState.set("unauthenticated");
        }
    }
}


// --- Error normalization ---
const ERR_FALLBACK = "Something went wrong";
function normalizeError(err, fallback = ERR_FALLBACK) {
    if (!err) return null;
    if (typeof err === "string") return err || fallback;
    if (typeof err.message === "string" && err.message) return err.message;
    try {
        const s = JSON.stringify(err);
        return s && s !== "{}" ? s : fallback;
    } catch {
        return fallback;
    }
}


// --- Helper to force unauth ---
export function forceUnauth() {
    try {
        const key = `sb-${SUPABASE_URL}-auth-token`;
        localStorage.removeItem(key);
    } catch (err) {
        console.warn("Failed to clear Supabase cache:", err);
    }
    authState.set("unauthenticated");
    user.set(null);
    session.set(null);
}


// --- Safe wrapper for Supabase auth calls ---
async function safeAuthCall(fn) {
    try {
        const { data, error } = await fn();
        if (error) {
            // If auth error, deauth user
            if (error.status === 401 || error.status === 403) {
                forceUnauth();
            }
            return { data: null, error: normalizeError(error) };
        }
        return { data, error: null };
    } catch (err) {
        console.error("Auth call failed:", err);
        return { data: null, error: normalizeError(err) };
    }
}


// --- Authentication actions ---

export function signInWithEmail(email, password) {
    return safeAuthCall(() =>
        supabase.auth.signInWithPassword({ email, password })
    );
}

export function signUpWithEmail(email, password) {
    return safeAuthCall(() =>
        supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
        })
    );
}

export function requestPasswordReset(email) {
    return safeAuthCall(() =>
        supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        })
    );
}

export async function resetPasswordWithToken(newPassword) {
    const { data, error } = await safeAuthCall(() =>
        supabase.auth.updateUser({ password: newPassword })
    );
    if (error) {
        console.error("Error resetting password with token:", error);
        return { data: null, error };
    } 

    // Revoke all sessions if password was reset successfully
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) {
        console.error("Error during global sign out:", signOutError);
        return { data: data, error: normalizeError(signOutError) };
    }
    return { data, error: null };
}

export async function signOut(scope = "local") {
    try {
        const { error } = await supabase.auth.signOut({ scope });
        if (error && error.code !== "session_not_found") {
            console.error(`Error signing out (${scope}):`, error);
            return { data: null, error: normalizeError(error) };
        }
    } catch (err) {
        console.error(`Unexpected error during signOut (${scope}):`, err);
        return { data: null, error: normalizeError(err) };
    } finally {
        forceUnauth();
    }

    return { data: null, error: null };
}


// --- Dangerous account modification actions ---

export async function updatePassword(currentPassword, newPassword) {
    try {
        // Backend verifies current password and updates Supabase
        const data = await _updatePassword({ currentPassword, newPassword });
        if (!data?.session) {
            forceUnauth();
            return { data: null, error: "Session expired after password update" };
        }

        // Update client with new session
        const { data: newSession, error } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });
        if (error || !newSession?.session?.user) {
            forceUnauth();
            return { data: null, error: "Session expired after password update" };
        }

        session.set(newSession.session);
        user.set(newSession.session.user);
        return { data, error: null };

    } catch (err) {
        // If auth error, deauth user
        if (err.status === 401 || err.status === 403) {
            forceUnauth();
        }
        return { data: null, error: normalizeError(err) };
    }
}


export async function updateEmail(newEmail) {
    try {
        // Verify session first
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session?.user) {
            forceUnauth();
            return { data: null, error: "No active user" };
        }

        // Attempt update
        const { data, error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) {
            if (error.status === 401 || error.status === 403) {
                forceUnauth();
            }
            return { data: null, error: normalizeError(error) };
        }

        // Fetch fresh session after update
        const { data: refreshed, error: refreshError } = await supabase.auth.getSession();
        if (refreshError || !refreshed?.session?.user) {
            forceUnauth();
            return { data: null, error: "Session invalid after email update" };
        }

        session.set(refreshed.session);
        user.set(refreshed.session.user);
        return { data, error: null };

    } catch (err) {
        return { data: null, error: normalizeError(err) };
    }
}

export async function deleteAccount(currentPassword, confirmPhrase) {

    // Verify confirmation phrase
    const expected = get(expectedPhrase);
    if ((confirmPhrase || "").trim().toUpperCase() !== expected.toUpperCase()) {
        return { data: null, error: `Type "${expected}" to confirm` };
    }

    try {
        // Delete account
        const data = await _deleteAccount({ currentPassword });
        forceUnauth();
        return { data, error: null };

    } catch (err) {
        // If auth error, deauth user
        if (err.status === 401 || err.status === 403) {
            forceUnauth();
        }
        // Other errors
        return { data: null, error: normalizeError(err) };
    }
}