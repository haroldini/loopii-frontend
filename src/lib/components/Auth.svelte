
<script>
  import { 
    user, signInWithEmail,  
  } from '$lib/stores/auth';
  import { 
    subPage, email, confirmEmail, password, confirmPassword,
    emailTouched, passwordTouched,
    validationErrors, error,
    readyToSubmit,
    toggleMode
  } from '$lib/stores/authForm';

  import { onMount } from 'svelte';
</script>


{#if $user === null}
    <div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px;">
        <h2 style="text-align:center;">{$subPage === 'signup' ? 'Sign Up' : 'Login'}</h2>

        <!-- ✅ Wrap inputs and buttons in a form -->
        <form 
            on:submit|preventDefault={handleSubmit} 
            style="display:flex; flex-direction:column; gap:0.5rem;"
        >
            <input
                placeholder="Email"
                value={$email}
                on:input={e => { email.set(e.target.value); emailTouched.set(true); }}
            />
            {#if $subPage === 'signup'}
                <input
                    placeholder="Confirm Email"
                    value={$confirmEmail}
                    on:input={e => { confirmEmail.set(e.target.value); emailTouched.set(true); }}
                />
            {/if}
            <input
                type="password"
                placeholder="Password"
                value={$password}
                on:input={e => { password.set(e.target.value); passwordTouched.set(true); }}
            />
            {#if $subPage === 'signup'}
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={$confirmPassword}
                    on:input={e => { confirmPassword.set(e.target.value); passwordTouched.set(true); }}
                />
            {/if}

            <div style="margin-top:1rem; display:flex; justify-content:space-between;">
                {#if $subPage === 'signup'}
                    <button type="submit" disabled={!$readyToSubmit}>Sign Up</button>
                    <button type="button" on:click={toggleMode}>Login instead</button>
                {:else}
                    <button type="submit" disabled={!$readyToSubmit}>Login</button>
                    <button type="button" on:click={toggleMode}>Sign up instead</button>
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