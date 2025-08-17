
import { writable } from 'svelte/store';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/utils/env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const user = writable(null);
export const session = writable(null);


// Intialize the auth store
export async function initAuth() {
    const { data } = await supabase.auth.getSession();
    session.set(data.session);
    user.set(data.session?.user ?? null);

    supabase.auth.onAuthStateChange((_event, newSession) => {
        session.set(newSession);
        user.set(newSession?.user ?? null);
    });
}

export async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
}

export async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
}

export async function signOut() {
    await supabase.auth.signOut();
    user.set(null);
    session.set(null);
}