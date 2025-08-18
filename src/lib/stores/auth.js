
import { writable } from 'svelte/store';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/utils/env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For authentication
export const user = writable(null);
export const session = writable(null);
export const authLoading = writable(true);

// For password reset redirects
export const authIsRecovery = writable(false);
export const resetToken = writable(null);


// Initialise authentication on page load, before rendering children
export async function initAuth() {
    authLoading.set(true);

    // Parse URL for potential recovery redirects
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    const type = hashParams.get('type') || queryParams.get('type');
    const access_token = hashParams.get('access_token') || queryParams.get('token');

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
            resetToken.set(access_token);
        }
    }

    // Determine auth state
    const { data } = await supabase.auth.getSession();
    session.set(data.session);
    user.set(data.session?.user ?? null);

    supabase.auth.onAuthStateChange((_event, newSession) => {
        session.set(newSession);
        user.set(newSession?.user ?? null);
    });

    authLoading.set(false);
}


export async function signInWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    } catch (error) {
        return { data: null, error: 'A network error occurred' };
    }
}

export async function signUpWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        return { data, error };
    } catch (error) {
        return { data: null, error: 'A network error occurred' };
    }
}

export async function requestPasswordReset(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        return { data, error };
    } catch (err) {
        return { data: null, error: 'A network error occurred' };
    }
}

export async function resetPasswordWithToken(token, newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
            accessToken: token
        });
        return { data, error };
    } catch (err) {
        return { data: null, error: 'A network error occurred' };
    }
}

export async function signOut() {
    try {
        await supabase.auth.signOut();
        user.set(null);
        session.set(null);
    } catch (error) {
        return { error: 'A network error occurred' };
    }
}

