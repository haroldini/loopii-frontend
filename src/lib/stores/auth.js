
import { writable, derived, get } from 'svelte/store';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/utils/env';

import { updatePassword as _updatePassword, deleteAccount as _deleteAccount } from '$lib/api/account.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For authentication
export const user = writable(null);
export const session = writable(null);
export const authLoading = writable(true);

//  For dangerous actions that require confirmation phrase
export const expectedPhrase = derived(user, ($user) => {
    const email = $user?.email ?? "";
    return `DELETE ${email}`;
});

// For password reset redirects & supabase messages
export const authIsRecovery = writable(false);
export const resetToken = writable(null);
export const urlNotice = writable("");

// Module scope singleton to avoid multiple initialisations
let authSub;


// Initialise authentication on page load, before rendering children
export async function initAuth() {
    authLoading.set(true);

    // Parse URL for potential recovery redirects
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    const type = hashParams.get('type') || queryParams.get('type');
    const access_token = hashParams.get('access_token') || queryParams.get('token');

    // Collect message params from URL
    const urlMsg =
        hashParams.get("message") ||
        queryParams.get("message") ||
        hashParams.get("error_description") ||
        queryParams.get("error_description");
    if (urlMsg) {
        const kind = /error|fail|denied/i.test(urlMsg) ? "error" : "success";
        urlNotice.set({ text: urlMsg, type: kind });
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    // If this is a recovery flow and we have an access_token, set the session
    if (type === 'recovery' && access_token) {
        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token: hashParams.get('refresh_token')
        });
        if (error) {
            console.error('Error setting recovery session:', error.message);
        } else {
            authIsRecovery.set(true);
            history.replaceState(null, "", window.location.pathname + window.location.search);
            resetToken.set(access_token);
        }
    }

    // Determine auth state
    const { data } = await supabase.auth.getSession();
    session.set(data.session);
    user.set(data.session?.user ?? null);

    // Listen for auth changes
    if (!authSub) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            session.set(newSession);
            user.set(newSession?.user ?? null);
        });
        authSub = subscription
    }

    authLoading.set(false);
}


export async function signInWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    } catch (error) {
        return { data: null, error: { message: "A network error occurred" } };
    }
}

export async function signUpWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin }
        });
        return { data, error };
    } catch (error) {
        return { data: null, error: { message: "A network error occurred" } };
    }
}

export async function requestPasswordReset(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        return { data, error };
    } catch (err) {
        return { data: null, error: { message: "A network error occurred" } };
    }
}

export async function resetPasswordWithToken(newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        return { data, error };
    } catch (err) {
        return { data: null, error: { message: "A network error occurred" } };
    }
}

export async function signOut() {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        return { data: null, error: { message: "A network error occurred" } };
    } finally {
        user.set(null);
        session.set(null);
    }
}

export async function updatePassword(currentPassword, newPassword) {
    try {
        const res = await _updatePassword({ currentPassword, newPassword });
        if (res.data) {
            await supabase.auth.setSession({
                access_token: res.data.access_token,
                refresh_token: res.data.refresh_token
            });
            session.set(res.data);
            user.set(res.data.user ?? null);
            return { data: res.data, error: null };
        } else {
            return { data: null, error: { message: res.error || "Could not update password" } };
        }
    } catch {
        return { data: null, error: { message: "A network error occurred" } };
    }
}

export async function updateEmail(newEmail) {
    try {
        // 1. Verify session
        const { data: sessionData } = await supabase.auth.getSession();
        const currentEmail = sessionData?.session?.user?.email;
        if (!currentEmail) {
            return { data: null, error: { message: "No active user" } };
        }

        // 2. Prevent updating to the same email
        if (currentEmail === newEmail) {
            return { data: null, error: { message: "New email must be different from current email" } };
        }

        // 3. Update to new email - Supabase will send a confirmation link
        const { data, error } = await supabase.auth.updateUser({ email: newEmail });
        return { data, error };
    } catch (err) {
        return { data: null, error: { message: "A network error occurred" } };
    }
}

export async function deleteAccount(currentPassword, confirmPhrase) {
        // Validate confirmation phrase
        const expected = get(expectedPhrase);
        if ((confirmPhrase || "").trim().toUpperCase() !== expected.toUpperCase()) {
            return { data: null, error: { message: `Type '${expected}' to confirm` } };
        }

        // Call backend to delete account
        const res = await _deleteAccount({ currentPassword });

        if (!res.success) return { data: null, error: { message: res.error || "Could not delete account" } };
        return { data: res.data, error: null };

}