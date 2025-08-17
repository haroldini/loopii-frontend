
<script>
    import { user, signInWithEmail, signUpWithEmail } from '$lib/stores/auth';
    import { writable } from 'svelte/store';

    let email = '';
    let password = '';
    const error = writable('');

    async function login() {
        error.set('');
        const { error: e } = await signInWithEmail(email, password);
        if (e) error.set(e.message);
    }

    async function signup() {
        error.set('');
        const { error: e } = await signUpWithEmail(email, password);
        if (e) error.set(e.message);
    }
</script>


{#if $user === null}
    <div style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:#fff; z-index:1000;">
        <div style="max-width:400px; width:100%; text-align:center; padding:1rem; box-shadow:0 0 10px rgba(0,0,0,0.1);">
            <h2>Login / Sign Up</h2>
            <input placeholder="Email" bind:value={email} style="width:100%; margin-bottom:0.5rem;" />
            <input type="password" placeholder="Password" bind:value={password} style="width:100%; margin-bottom:0.5rem;" />
            <button on:click={login} style="margin-right:0.5rem;">Login</button>
            <button on:click={signup}>Sign Up</button>
            {#if $error}
                <p style="color:red; margin-top:0.5rem;">{$error}</p>
            {/if}
        </div>
    </div>
{/if}