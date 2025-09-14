
<script>
    import { get } from "svelte/store";
    import { goto } from "$app/navigation";

    import { 
        user, signInWithEmail, signUpWithEmail, requestPasswordReset, 
        resetPasswordWithToken, resetToken, authState
    } from "$lib/stores/auth";

    import { 
        email, confirmEmail, password, confirmPassword, 
        emailTouched, passwordTouched, isSubmitting, subPage, showForm,
        validationErrors, error, authFormStatus, readyToSubmit,
        toggleMode, resetAuthForm, toggleForm, resetSensitive
    } from "$lib/stores/authForm";

    import { onMount } from "svelte";

    // <-- REACTIVE RECOVERY CHECK
    $: if ($authState === "recovery" && $resetToken) {
        subPage.set("reset");
    }

    // Function to handle the authentication page form complete, triggering correct auth function
    async function handleSubmit() {
        isSubmitting.set(true); // Prevent accidental double submission

        error.set("");
        authFormStatus.set("");
        validationErrors.set([]);

        let result;

        try {
            if ($subPage === "signup") {
                authFormStatus.set("signingUp")
                result = await signUpWithEmail($email, $password);
                if (!result.error && result.data.user) {
                    authFormStatus.set("signedUp");
                    toggleForm(false);
                }
                else authFormStatus.set("signUpFailed")

            } else if ($subPage === "login") {
                authFormStatus.set("loggingIn")
                result = await signInWithEmail($email, $password);
                if (!result.error && result.data.session) {
                    authFormStatus.set("loggedIn");
                    resetAuthForm()
                }
                else authFormStatus.set("loginFailed")
                
            } else if ($subPage === "requestReset") {
                authFormStatus.set("sendingResetRequest")
                result = await requestPasswordReset($email);
                if (!result.error) {
                    authFormStatus.set("resetEmailSent");
                    toggleForm(false);
                }
                else authFormStatus.set("resetRequestFailed")

            } else if ($subPage === "reset") {
                authFormStatus.set("resettingPassword")
                result = await resetPasswordWithToken($password);
                if (!result.error && result.data.user) {
                    authFormStatus.set("passwordReset");
                }
                else {
                    authFormStatus.set("resetPasswordFailed")
                }
            }

            // Show error if exists
            if (result.error) {
                error.set(result.error || "Something went wrong");
            }
        } finally {
            if (!$error) {
                // Don't reset form yet for email confirmations
                if (!["resetEmailSent", "signedUp"].includes($authFormStatus)) {
                    resetSensitive(); 
                }
            }
            isSubmitting.set(false);
        }
    }

    const pageTitles = {
        signup: "Sign Up",
        login: "Login",
        requestReset: "Reset Password",
        reset: "Reset Password"
    };
</script>

<p>{$subPage}</p>
<p>{$authFormStatus}</p>
<p>{$isSubmitting}</p>
<p>{$readyToSubmit}</p>

<div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px;">
    
    <h2 style="text-align:center;">{pageTitles[$subPage] ?? "Unknown Page"}</h2>

    <!-- Form for login / signup / reset / requestReset fields -->
    {#if $showForm}
        <form on:submit|preventDefault={handleSubmit} style="display:flex; flex-direction:column; gap:0.5rem;">
            
            <!-- Always show email, except reset -->
            {#if $subPage != "reset"}
                <input placeholder="Email" value={$email} on:input={e => { email.set(e.target.value); emailTouched.set(true); }} />
            {/if}
            
            <!-- Only show confirm email on signup -->
            {#if $subPage === "signup"}
                <input placeholder="Confirm Email" value={$confirmEmail} on:input={e => { confirmEmail.set(e.target.value); emailTouched.set(true); }} />
            {/if}
                
            <!-- Always show password, except requestReset -->
            {#if $subPage != "requestReset"}
                <input type="password" placeholder="Password" value={$password} on:input={e => { password.set(e.target.value); passwordTouched.set(true); }} />
            {/if}
                
            <!-- Only show confirm password on signup or reset -->
            {#if $subPage === "signup" || $subPage === "reset"}
                <input type="password" placeholder="Confirm Password" value={$confirmPassword} on:input={e => { confirmPassword.set(e.target.value); passwordTouched.set(true); }} />
            {/if}

            <!-- Display the correct buttons -->
            <div style="margin-top:1rem; display:flex; justify-content:space-between;">
                {#if $subPage === "signup"}
                    <button type="submit" disabled={!$readyToSubmit || $isSubmitting}>Sign Up</button>
                    <button type="button" on:click={() => toggleMode("login")}>Login instead</button>
                {:else if $subPage === "login"}
                    <button type="submit" disabled={!$readyToSubmit || $isSubmitting}>Login</button>
                    <button type="button" on:click={() => toggleMode("signup")}>Sign up instead</button>
                    <button type="button" on:click={() => toggleMode("requestReset")}>Forgot password?</button>
                {:else if $subPage === "requestReset"}
                    <button type="submit" disabled={!$readyToSubmit || $isSubmitting}>Send reset email</button>
                    <button type="button" on:click={() => toggleMode("login")}>Back to Login</button>
                {:else if $subPage === "reset"}
                    <button type="submit" disabled={!$readyToSubmit || $isSubmitting}>Set New Password</button>
                {/if}
            </div>
        </form>
    {/if}


    <!-- Status / Feedback Box -->
    {#if $validationErrors.filter(e => e.display).length || $error || $authFormStatus}
        <div style="margin-top:1rem; padding:0.75rem; border-radius:6px; background:#f9f9f9;">

            <!-- Validation errors (field-level, usually multiple) -->
            {#each $validationErrors.filter(e => e.display) as err}
                <p style="color:#d00; margin:0.25rem 0;">{err.message}</p>
            {/each}

            <!-- Auth status messages -->

            <!-- Login -->
            {#if $authFormStatus === "loggingIn"}
                <p>Logging in…</p>
            {:else if $authFormStatus === "loggedIn"}
                <p style="color:green;">Login successful!</p>
            {:else if $authFormStatus === "loginFailed"}
                <p style="color:#d00;">Login failed</p>


            <!-- Signup -->
            {:else if $authFormStatus === "signingUp"}
                <p>Creating your account…</p>
            {:else if $authFormStatus === "signedUp"}
            <p style="color:green;">
                Confirmation email sent! Check your inbox ({$email}) to verify your account.
            </p>
            {#if !$showForm}
                <p>
                    Click
                    <span
                        role="button"
                        tabindex="0"
                        on:click={() => toggleForm(true)}
                        on:keydown={(e) => e.key === "Enter" && toggleForm(true)}
                        style="color:blue; cursor:pointer; text-decoration:underline;"
                    >
                        here
                    </span>
                    if you need to resend the email.
                </p>
            {/if}
            <p>
                If you don’t receive it, your email may already be in use — Try
                <span
                    role="button"
                    tabindex="0"
                    on:click={() => toggleMode("login")}
                    on:keydown={(e) => e.key === "Enter" && toggleMode("login")}
                    style="color:blue; cursor:pointer; text-decoration:underline;"
                >
                    logging in
                </span>
                instead.
            </p>
            {:else if $authFormStatus === "signUpFailed"}
                <p style="color:#d00;">Sign up failed</p>


            <!-- Password reset request -->
            {:else if $authFormStatus === "sendingResetRequest"}
                <p>Sending password reset email…</p>
            {:else if $authFormStatus === "resetEmailSent"}
                <p style="color:green;">Password reset email sent! Check your inbox ({$email}) to set a new password.</p>
                {#if !$showForm}
                    <p>
                        Click
                        <span
                            role="button"
                            tabindex="0"
                            on:click={() => toggleForm(true)}
                            on:keydown={(e) => e.key === "Enter" && toggleForm(true)}
                            style="color:blue; cursor:pointer; text-decoration:underline;"
                        >
                            here
                        </span> to resend the email.
                    </p>
                {/if}
            {:else if $authFormStatus === "resetRequestFailed"}
                <p style="color:#d00;">Could not send reset email</p>
                

            <!-- Password update -->
            {:else if $authFormStatus === "resettingPassword"}
                <p>Updating your password…</p>
            {:else if $authFormStatus === "passwordReset"}
                <p style="color:green;">Password updated successfully!</p>
            {:else if $authFormStatus === "resetPasswordFailed"}
                <p style="color:#d00;">Password reset failed</p>
            {/if}

            <!-- API error (single) -->
            {#if $error}
                <p style="color:#d00; margin:0.25rem 0;">{$error}</p>
            {/if}

        </div>
    {/if}

    {#if $authFormStatus === "passwordReset"}
        <button type="button" on:click={() => window.location.replace("/")}>Continue to loopii</button>
    {/if}
</div>