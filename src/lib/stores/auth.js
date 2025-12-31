
import { writable, derived, get } from "svelte/store";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ENVIRONMENT } from "$lib/utils/env.js";

import { updatePassword as _updatePassword, deleteAccount as _deleteAccount } from "$lib/api/account.js";
import { addToast } from "$lib/stores/popups.js";
import { solveCaptcha } from "$lib/utils/captcha.js";


const isDev = ENVIRONMENT === "dev";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- Auth state stores ---
export const user = writable(null);
export const session = writable(null);
export const resetToken = writable(null);
export const authState = writable("loading"); 
// "loading" | "unauthenticated" | "authenticated" | "recovery" | "error" | "timeout"


// For dangerous actions that require confirmation phrase
export const expectedPhrase = derived(user, ($user) => {
    const email = $user?.email ?? "";
    return `DELETE ${email}`;
});

// Helper for parsing captcha required errors
export function isCaptchaRequired(errMsg) {
    return (errMsg || "").toLowerCase().includes("captcha verification process failed");
}


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
            addToast({
                variant: "banner",
                text: "Notice",
                description: urlMsg,
                autoHideMs: null,
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
                if (isDev) console.error("Error setting recovery session:", error?.message || error);
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
            if (isDev) console.error("Error getting session:", error?.message || error);
            authState.set("error");
            return;
        }
        session.set(data.session);
        user.set(data.session?.user ?? null);
        authState.set(data.session?.user ? "authenticated" : "unauthenticated");

        // Subscribe to auth state changes once
        if (!authSub) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
                session.set(newSession);
                user.set(newSession?.user ?? null);
                authState.set(newSession?.user ? "authenticated" : "unauthenticated");
            });
            authSub = subscription
        }

    } catch (err) {
        authState.set("error");
        addToast({
            variant: "banner",
            text: "Couldn't sign you in.",
            description: "Please refresh the page or try again later.",
            autoHideMs: null,
        });
    } finally {
        if (get(authState) === "loading") {
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
        if (isDev) console.warn("Failed to clear Supabase cache:", err);
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
            if (error?.status === 403) {
                forceUnauth();
                addToast({
                    variant: "banner",
                    text: "Session expired.",
                    description: "Please sign in again to continue.",
                    autoHideMs: null,
                });
            }
            return { data: null, error: normalizeError(error) };
        }
        return { data, error: null };
    } catch (err) {
        return { data: null, error: normalizeError(err) };
    }
}


// --- Authentication actions ---

export function signInWithEmail(email, password, captchaToken) {
    return safeAuthCall(() =>
        supabase.auth.signInWithPassword({
            email,
            password,
            ...(captchaToken ? { options: { captchaToken } } : {}),
        })
    );
}

export function signUpWithEmail(email, password, captchaToken) {
    return safeAuthCall(() =>
        supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
                ...(captchaToken ? { captchaToken } : {}),
            },
        })
    );
}

export function requestPasswordReset(email, captchaToken) {
    return safeAuthCall(() =>
        supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
            ...(captchaToken ? { captchaToken } : {}),
        })
    );
}

export async function resetPasswordWithToken(newPassword) {
    const { data, error } = await safeAuthCall(() =>
        supabase.auth.updateUser({ password: newPassword })
    );
    if (error) {
        return { data: null, error };
    } 

    // Revoke all sessions if password was reset successfully
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) {
        addToast({
            variant: "banner",
            text: "Password reset.",
            description: "We couldn't sign you out everywhere. If you're on a shared device, sign out manually.",
            autoHideMs: null,
        });
        return { data: data, error: normalizeError(signOutError) };
    }
    return { data, error: null };
}

export async function signOut(scope = "local") {
    try {
        const { error } = await supabase.auth.signOut({ scope });
        if (error && error.code !== "session_not_found") {
            return { data: null, error: normalizeError(error) };
        }
        if (scope === "global") {
            addToast({
                variant: "banner",
                text: "Signed out everywhere.",
                autoHideMs: null,
            });
        }
    } catch (err) {
        if (scope === "global") {
            addToast({
                variant: "banner",
                text: "Couldn't sign you out everywhere.",
                description: normalizeError(err),
                autoHideMs: null,
            });
        }
        return { data: null, error: normalizeError(err) };
    } finally {
        forceUnauth();
    }

    return { data: null, error: null };
}


// --- Dangerous account modification actions ---

export async function updatePassword(currentPassword, newPassword) {
    try {
        // ----- Main PW update block -----
        let data;
        try {
            data = await _updatePassword({ currentPassword, newPassword });
        } catch (err) {

            // Captcha required error
            if (err?.status === 428) {
                let token;
                try {
                    token = await solveCaptcha();
                } catch (e) {
                    return { data: null, error: "Captcha required. Please try again" };
                }
                // Try again with captcha
                data = await _updatePassword({ currentPassword, newPassword, captchaToken: token });
            
            // Other backend error
            } else {
                throw err;
            }
        }

        // Revoke session & prompt login
        try {
            await supabase.auth.signOut({ scope: "global" });
        } catch {}
        forceUnauth();
        addToast({
            variant: "banner",
            text: "Password updated.",
            description: "Please sign in again to continue.",
            autoHideMs: null,
        });
        return { data, error: null };

    } catch (err) {
        // If auth error, deauth user
        if (err?.status === 403) {
            forceUnauth();
            addToast({
                variant: "banner",
                text: "Session expired.",
                description: "Please sign in again to update your password.",
                autoHideMs: null,
            });
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
            addToast({
                variant: "banner",
                text: "Session expired.",
                description: "Please sign in again to update your email.",
                autoHideMs: null,
            });
            return { data: null, error: "Please sign in again to update your email" };
        }

        // Attempt update
        const { data, error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) {
            if (error?.status === 403) {
                forceUnauth();
                addToast({
                    variant: "banner",
                    text: "Session expired.",
                    description: "Please sign in again to update your email.",
                    autoHideMs: null,
                });
            }
            return { data: null, error: normalizeError(error) };
        }
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
        let data;
        try {
            data = await _deleteAccount({ currentPassword });
        } catch (err) {
            const msg = normalizeError(err);

            // Captcha required error
            if (isCaptchaRequired(msg) || err?.status === 428) {
                let token;
                try {
                    token = await solveCaptcha({
                        message: "Captcha required to delete your account.",
                    });
                } catch (e) {
                    return { data: null, error: "Captcha required. Please try again" };
                }
                // Try again with captcha
                data = await _deleteAccount({ currentPassword, captchaToken: token });
            
            // Other backend error
            } else {
                throw err;
            }
        }

        forceUnauth();
        addToast({
            variant: "banner",
            text: "Account deleted.",
            description: "Your account has been permanently removed.",
            autoHideMs: null,
        });
        return { data, error: null };

    } catch (err) {
        // If auth error, deauth user
        if (err?.status === 403) {
            forceUnauth();
            addToast({
                variant: "banner",
                text: "Failed to delete account.",
                description: "Sorry, your session has expired. Please sign in to try again.",
                autoHideMs: null,
            });
        }
        // Other errors
        return { data: null, error: normalizeError(err) };
    }
}
