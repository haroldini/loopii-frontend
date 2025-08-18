
import { writable } from 'svelte/store';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/utils/env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const user = writable(null);
export const session = writable(null);
export const authLoading = writable(true);


export async function initAuth() {
    authLoading.set(true);

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

export async function signOut() {
    try {
        await supabase.auth.signOut();
        user.set(null);
        session.set(null);
    } catch (error) {
        return { error: 'A network error occurred' };
    }
}