
<script>
    import { get } from 'svelte/store';

    import { 
        user, signInWithEmail, signUpWithEmail, requestPasswordReset, 
        resetPasswordWithToken, authIsRecovery, resetToken 
    } from '$lib/stores/auth';

    import { 
        subPage, email, confirmEmail, password, confirmPassword, 
        emailTouched, passwordTouched,
        validationErrors, error,
        readyToSubmit,
        toggleMode
    } from '$lib/stores/authForm';

    import { onMount } from 'svelte';

    // <-- REACTIVE RECOVERY CHECK
    $: if ($authIsRecovery && $resetToken) {
        subPage.set('reset');
    }

    // Function to handle the authentication page form complete, triggering correct auth function
    async function handleSubmit() {
        error.set('');
        validationErrors.set([]);
        try {
            if ($subPage === 'signup') {
                const { data, error: err } = await signUpWithEmail($email, $password);
                if (err) throw err;
            } else if ($subPage === 'login') {
                const { data, error: err } = await signInWithEmail($email, $password);
                if (err) throw err;
            } else if ($subPage === 'requestReset') {
                const { data, error: err } = await requestPasswordReset($email);
                if (err) throw err;
            } else if ($subPage === 'reset') {
                const { data, error: err } = await resetPasswordWithToken($resetToken, $password);
                if (err) throw err;
            }
        } catch (err) {
            error.set(err.message || err);
        }
    }

    const pageTitles = {
        signup: 'Sign Up',
        login: 'Login',
        requestReset: 'Reset Password',
        reset: 'Reset Password'
    };
</script>


{#if $user === null || $authIsRecovery}
    <div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px;">
        
        <h2 style="text-align:center;">{pageTitles[$subPage] ?? 'Unknown Page'}</h2>

        <form on:submit|preventDefault={handleSubmit} style="display:flex; flex-direction:column; gap:0.5rem;">
            
            <!-- Always show email, except reset -->
            {#if $subPage != 'reset'}
                <input placeholder="Email" value={$email} on:input={e => { email.set(e.target.value); emailTouched.set(true); }} />
            {/if}
            
            <!-- Only show confirm email on signup -->
            {#if $subPage === 'signup'}
                <input placeholder="Confirm Email" value={$confirmEmail} on:input={e => { confirmEmail.set(e.target.value); emailTouched.set(true); }} />
            {/if}
                
            <!-- Always show password, except requestReset -->
            {#if $subPage != 'requestReset'}
                <input type="password" placeholder="Password" value={$password} on:input={e => { password.set(e.target.value); passwordTouched.set(true); }} />
            {/if}
                
            <!-- Only show confirm password on signup or reset -->
            {#if $subPage === 'signup' || $subPage === 'reset'}
                <input type="password" placeholder="Confirm Password" value={$confirmPassword} on:input={e => { confirmPassword.set(e.target.value); passwordTouched.set(true); }} />
            {/if}

            <!-- Display the correct buttons -->
            <div style="margin-top:1rem; display:flex; justify-content:space-between;">
                {#if $subPage === 'signup'}
                    <button type="submit" disabled={!$readyToSubmit}>Sign Up</button>
                    <button type="button" on:click={() => toggleMode('login')}>Login instead</button>
                {:else if $subPage === 'login'}
                    <button type="submit" disabled={!$readyToSubmit}>Login</button>
                    <button type="button" on:click={() => toggleMode('signup')}>Sign up instead</button>
                    <button type="button" on:click={() => toggleMode('requestReset')}>Forgot password?</button>
                {:else if $subPage === 'requestReset'}
                    <button type="submit" disabled={!$readyToSubmit}>Send reset email</button>
                    <button type="button" on:click={() => toggleMode('login')}>Back to Login</button>
                {:else if $subPage === 'reset'}
                    <button type="submit" disabled={!$readyToSubmit}>Set New Password</button>
                {/if}
            </div>
        </form>


        {#each $validationErrors.filter(e => e.display) as err}
            <p style="color:red; margin-top:0.5rem;">{err.message}</p>
        {/each}

        {#if $error}
            <p style="color:red; margin-top:0.5rem;">{$error}</p>
        {/if}
    </div>
{/if}