
<script>
    import { get } from "svelte/store";
    import { goto } from "$app/navigation";

    import { 
        user, signInWithEmail, signUpWithEmail, requestPasswordReset, 
        resetPasswordWithToken, resetToken, authState
    } from "$lib/stores/auth.js";

    import { 
        email, confirmEmail, password, confirmPassword, 
        emailTouched, passwordTouched, isSubmitting, subPage, showForm,
        validationErrors, error, authFormStatus, readyToSubmit,
        toggleMode, resetAuthForm, toggleForm, resetSensitive
    } from "$lib/stores/authForm.js";

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


<h2>{pageTitles[$subPage] ?? "Unknown Page"}</h2>


{#if $showForm}
    <form class="form" on:submit|preventDefault={handleSubmit}>
        {#if $subPage !== "reset"}
            <div class="field">
                <label class="field__label" for="auth-email">Email</label>
                <input
                    id="auth-email"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    value={$email}
                    on:input={(e) => {
                        email.set(e.target.value);
                        emailTouched.set(true);
                    }}
                />
            </div>
        {/if}

        {#if $subPage === "signup"}
            <div class="field">
                <label class="field__label" for="auth-confirm-email">Confirm email</label>
                <input
                    id="auth-confirm-email"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    value={$confirmEmail}
                    on:input={(e) => {
                        confirmEmail.set(e.target.value);
                        emailTouched.set(true);
                    }}
                />
            </div>
        {/if}

        {#if $validationErrors.find((e) => e.field === "email" && e.display)}
            <p class="field__error">
                {$validationErrors.find((e) => e.field === "email" && e.display).message}
            </p>
        {/if}

        {#if $subPage !== "requestReset"}
            <div class="field">
                <label class="field__label" for="auth-password">Password</label>
                <input
                    id="auth-password"
                    type="password"
                    autocomplete={$subPage === "signup" ? "new-password" : "current-password"}
                    placeholder="Password"
                    value={$password}
                    on:input={(e) => {
                        password.set(e.target.value);
                        passwordTouched.set(true);
                    }}
                />
            </div>
        {/if}

        {#if $subPage === "signup" || $subPage === "reset"}
            <div class="field">
                <label class="field__label" for="auth-confirm-password">Confirm password</label>
                <input
                    id="auth-confirm-password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Confirm password"
                    value={$confirmPassword}
                    on:input={(e) => {
                        confirmPassword.set(e.target.value);
                        passwordTouched.set(true);
                    }}
                />
            </div>
        {/if}

        {#if $validationErrors.find((e) => e.field === "password" && e.display)}
            <p class="field__error">
                {$validationErrors.find((e) => e.field === "password" && e.display).message}
            </p>
        {/if}

        <div class="form__actions">
            {#if $subPage === "signup"}
                <button type="submit" class="btn btn--primary btn--block" disabled={!$readyToSubmit || $isSubmitting}>
                    {$isSubmitting ? "Creating account…" : "Create account"}
                </button>

                <button type="button" class="btn btn--ghost btn--block" on:click={() => toggleMode("login")}>
                    Login instead
                </button>

            {:else if $subPage === "login"}
                <button type="submit" class="btn btn--primary btn--block" disabled={!$readyToSubmit || $isSubmitting}>
                    {$isSubmitting ? "Logging in…" : "Login"}
                </button>

                <button type="button" class="btn btn--ghost btn--block" on:click={() => toggleMode("signup")}>
                    Sign up instead
                </button>

                <button type="button" class="btn btn--ghost btn--block" on:click={() => toggleMode("requestReset")}>
                    Forgot password?
                </button>

            {:else if $subPage === "requestReset"}
                <button type="submit" class="btn btn--primary btn--block" disabled={!$readyToSubmit || $isSubmitting}>
                    {$isSubmitting ? "Sending reset email…" : "Send reset email"}
                </button>

                <button type="button" class="btn btn--ghost btn--block" on:click={() => toggleMode("login")}>
                    Back to login
                </button>

            {:else if $subPage === "reset"}
                <button type="submit" class="btn btn--primary btn--block" disabled={!$readyToSubmit || $isSubmitting}>
                    {$isSubmitting ? "Setting new password…" : "Set new password"}
                </button>
            {/if}
        </div>
    </form>
{/if}

{#if $error || $authFormStatus === "signedUp" || $authFormStatus === "resetEmailSent"}
    <section class="card">
        <div class="section stack">
            {#if $authFormStatus === "signedUp"}
                <p class="text-success">
                    Confirmation email sent. Check your inbox ({$email}) to verify your account.
                </p>

                {#if !$showForm}
                    <p>
                        Need to resend?
                        <button type="button" class="text-link" on:click={() => toggleForm(true)}>
                            Click here
                        </button>.
                    </p>
                {/if}

                <p>
                    If you don't receive it, your email may already be in use — try
                    <button type="button" class="text-link" on:click={() => toggleMode("login")}>
                        logging in
                    </button>
                    instead.
                </p>

            {:else if $authFormStatus === "resetEmailSent"}
                <p class="text-success">
                    Password reset email sent. Check your inbox ({$email}) to set a new password.
                </p>

                {#if !$showForm}
                    <p>
                        Want to resend?
                        <button type="button" class="text-link" on:click={() => toggleForm(true)}>
                            Click here
                        </button>.
                    </p>
                {/if}
            {/if}

            {#if $error}
                <p class="text-danger">{$error}</p>
            {/if}
        </div>
    </section>
{/if}

{#if $authFormStatus === "passwordReset"}
    <button type="button" class="btn btn--primary btn--block" on:click={() => window.location.replace("/")}>
        Continue to loopii
    </button>
{/if}
