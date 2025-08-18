<script>
    import { user } from '$lib/stores/auth';
    import { writable, derived } from 'svelte/store';

    // Stores for managing auth page state
    const subPage = writable('login'); // 'login' or 'signup'
    const validationErrors = writable([]); // To display unfulfilled validation requirements
    const error = writable(''); // To display authentication errors

    // Stores for form inputs
    const email = writable('');
    const confirmEmail = writable('');
    const password = writable('');
    const confirmPassword = writable('');

    // Stores to track if inputs have been touched
    const emailTouched = writable(false);
    const passwordTouched = writable(false);

    // Derived store to check if the form is ready to submit
    // This will be true when required fields are filled and validated
    // Also updates validationErrors store
    const readyToSubmit = derived(
        [subPage, email, confirmEmail, password, confirmPassword],
        ([$subPage, $email, $confirmEmail, $password, $confirmPassword], set) => {
            const errors = [];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            // Required fields (hide these errors, but block button)
            if (!$email) errors.push({ message: 'Email is required', display: false });
            if ($subPage === 'signup' && !$confirmEmail) errors.push({ message: 'Confirm Email is required', display: false });
            if (!$password) errors.push({ message: 'Password is required', display: false });
            if ($subPage === 'signup' && !$confirmPassword) errors.push({ message: 'Confirm Password is required', display: false });

            // Format / complexity errors (display these)
            if ($email && !emailRegex.test($email)) errors.push({ message: 'Email is not valid', display: true });
            if ($password && $subPage === 'signup') {
                if ($password.length < 8) errors.push({ message: 'Password must be at least 8 characters', display: true });
                if (!/[a-z]/.test($password)) errors.push({ message: 'Password must contain a lowercase letter', display: true });
                if (!/[A-Z]/.test($password)) errors.push({ message: 'Password must contain an uppercase letter', display: true });
                if (!/[0-9]/.test($password)) errors.push({ message: 'Password must contain a number', display: true });
            }

            // Mismatches (display these)
            if ($subPage === 'signup') {
                if ($email && $confirmEmail && $email !== $confirmEmail) errors.push({ message: 'Emails do not match', display: true });
                if ($password && $confirmPassword && $password !== $confirmPassword) errors.push({ message: 'Passwords do not match', display: true });
            }

            validationErrors.set(errors);
            set(errors.length === 0);
        },
        false
    );

    // Function to toggle between login and signup
    function toggleMode() {
        subPage.update(s => s === 'login' ? 'signup' : 'login');
        confirmEmail.set('');
        confirmPassword.set('');
        error.set('');
        validationErrors.set([]);
        emailTouched.set(false);
        passwordTouched.set(false);
    }

    // Function to handle submission of the login/signup form
    async function handleSubmit() {
        error.set('');

        const $sub = $subPage;
        const $em = $email;
        const $pw = $password;

        if ($sub === 'signup') {
            const { data, error: err } = await import('$lib/stores/auth').then(m => m.signUpWithEmail($em, $pw));
            if (err) {
                error.set(err.message);
            } else {
                // On successful signup, automatically sign in
                user.set(data.user);
            }
        } else {
            const { data, error: err } = await import('$lib/stores/auth').then(m => m.signInWithEmail($em, $pw));
            if (err) {
                error.set(err.message);
            } else {
                user.set(data.user);
            }
        }
    }

</script>

{#if $user === null}
    <div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px;">
        <h2 style="text-align:center;">{$subPage === 'signup' ? 'Sign Up' : 'Login'}</h2>

        <div style="display:flex; flex-direction:column; gap:0.5rem;">

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

        </div>

        <div style="margin-top:1rem; display:flex; justify-content:space-between;">
            {#if $subPage === 'signup'}
                <button disabled={!$readyToSubmit} on:click={handleSubmit}>Sign Up</button>
                <button on:click={toggleMode}>Login instead</button>
            {:else}
                <button disabled={!$readyToSubmit} on:click={handleSubmit}>Login</button>
                <button on:click={toggleMode}>Sign up instead</button>
            {/if}
        </div>
        {#each $validationErrors.filter(e => e.display) as err}
            <p style="color:red; margin-top:0.5rem;">{err.message}</p>
        {/each}

        {#if $error}
            <p style="color:red; margin-top:0.5rem;">{$error}</p>
        {/if}
    </div>
{/if}
