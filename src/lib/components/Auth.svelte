
<script>
    import { onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";

    import { UI_ICONS } from "$lib/stores/app.js";
    import { 
        signInWithEmail, signUpWithEmail, requestPasswordReset, 
        resetPasswordWithToken, resetToken, authState
    } from "$lib/stores/auth.js";

    import { 
        email, confirmEmail, password, confirmPassword, 
        emailTouched, passwordTouched, isSubmitting, subPage, showForm,
        validationErrors, error, authFormStatus, readyToSubmit,
        toggleMode, resetAuthForm, toggleForm, resetSensitive
    } from "$lib/stores/authForm.js";
    import { solveCaptcha } from "$lib/utils/captcha.js";
    import { isCaptchaRequired } from "$lib/stores/auth.js";


    let acceptedLegal = false;

    $: if ($subPage !== "signup") {
        acceptedLegal = false;
    }

    // Unmounting logic
    onDestroy(() => {
        resetAuthForm();
        resetToken.set(null);
    });

    // REACTIVE RECOVERY CHECK
    $: if ($authState === "recovery" && $resetToken) {
        subPage.set("reset");
    }

    // Function to handle the authentication page form complete, triggering correct auth function
    async function handleSubmit() {
        if ($subPage === "signup" && !acceptedLegal) {
            error.set("Please confirm you agree to the Terms and Privacy Policy");
            showForm.set(true);
            return;
        }
        isSubmitting.set(true); // Prevent accidental double submission
        error.set("");
        authFormStatus.set("");
        validationErrors.set([]);

        let result;

        try {
            if ($subPage === "signup") {
                authFormStatus.set("signingUp");

                let res = await signUpWithEmail($email, $password);
                if (!res.error && res.data.user) {
                    authFormStatus.set("signedUp");
                    toggleForm(false);
                    return;
                }

                if (isCaptchaRequired(res.error)) {
                    let token;
                    try {
                        token = await solveCaptcha();
                    } catch (e) {
                        error.set("Captcha required. Please try again");
                        authFormStatus.set("signUpFailed");
                        showForm.set(true);
                        return;
                    }

                    res = await signUpWithEmail($email, $password, token);
                    if (!res.error && res.data.user) {
                        authFormStatus.set("signedUp");
                        toggleForm(false);
                        return;
                    }
                }

                authFormStatus.set("signUpFailed");
                if (res.error) {
                    error.set(res.error || "Something went wrong. Please try again later");
                    showForm.set(true);
                }
                return;

            } else if ($subPage === "login") {
                authFormStatus.set("loggingIn");

                let res = await signInWithEmail($email, $password);
                if (!res.error && res.data.session) {
                    authFormStatus.set("loggedIn");
                    resetAuthForm();
                    goto("/");
                    return;
                }

                if (isCaptchaRequired(res.error)) {
                    let token;
                    try {
                        token = await solveCaptcha();
                    } catch (e) {
                        error.set("Captcha required. Please try again");
                        authFormStatus.set("loginFailed");
                        showForm.set(true);
                        return;
                    }

                    res = await signInWithEmail($email, $password, token);
                    if (!res.error && res.data.session) {
                        authFormStatus.set("loggedIn");
                        resetAuthForm();
                        goto("/");
                        return;
                    }
                }

                authFormStatus.set("loginFailed");
                error.set(res.error || "Something went wrong. Please try again later");
                showForm.set(true);
                return;

            } else if ($subPage === "requestReset") {
                authFormStatus.set("sendingResetRequest");

                let res = await requestPasswordReset($email);
                if (!res.error) {
                    authFormStatus.set("resetEmailSent");
                    toggleForm(false);
                    return;
                }

                if (isCaptchaRequired(res.error)) {
                    let token;
                    try {
                        token = await solveCaptcha();
                    } catch (e) {
                        error.set("Captcha required. Please try again");
                        authFormStatus.set("resetRequestFailed");
                        showForm.set(true);
                        return;
                    }

                    res = await requestPasswordReset($email, token);
                    if (!res.error) {
                        authFormStatus.set("resetEmailSent");
                        toggleForm(false);
                        return;
                    }
                }

                authFormStatus.set("resetRequestFailed");
                error.set(res.error || "Something went wrong. Please try again later");
                showForm.set(true);
                return;

            } else if ($subPage === "reset") {
                authFormStatus.set("resettingPassword")
                result = await resetPasswordWithToken($password);
                if (!result.error && result.data.user) {
                    authFormStatus.set("passwordReset");
                    toggleForm(false);
                }
                else {
                    authFormStatus.set("resetPasswordFailed")
                }
            }

            // Show error if exists
            if (result.error) {
                error.set(result.error || "Something went wrong. Please try again later");
                showForm.set(true);
            }
        } finally {
            try {
                if (!$error) {
                    if (!["resetEmailSent", "signedUp"].includes($authFormStatus)) {
                        resetSensitive();
                    }
                }
            } finally {
                isSubmitting.set(false);
            }
        }
    }

    const pageTitles = {
        signup: "Sign up",
        login: "Log in",
        requestReset: "Reset password",
        reset: "Reset password"
    };

</script>


<!-- FORM STATES -->
{#if $showForm}
    <h2>{pageTitles[$subPage] ?? "Unknown Page"}</h2>
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
                <label class="field__label" for="auth-password">
                    {$subPage === "reset" ? "New password" : "Password"}
                </label>
                <input
                    id="auth-password"
                    type="password"
                    autocomplete={$subPage === "reset" ? "new-password" : "current-password"}
                    placeholder={$subPage === "reset" ? "New password" : "Password"}
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

{#if $subPage === "signup"}
    <label class="form__legal" for="auth-accept-legal">
        <span>
            I agree to the
            <a class="text-link" href="/terms" target="_blank" rel="noreferrer">Terms</a>
            and
            <a class="text-link" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
        </span>

        <input
            id="auth-accept-legal"
            type="checkbox"
            checked={acceptedLegal}
            on:change={(e) => (acceptedLegal = e.target.checked)}
        />
    </label>
{/if}

        {#if $error}
            <p class="text-danger">{$error}</p>
        {/if}
        
        <div class="form__actions">
            {#if $subPage === "signup"}
                <div class="actionbar">                    
                    <button type="button" class="btn btn--ghost btn--block" on:click={() => toggleMode("login")}>
                        Log in instead
                    </button>
                    <button
                        type="submit"
                        class="btn btn--primary btn--block"
                        class:is-loading={$isSubmitting}
                        disabled={!$readyToSubmit || $isSubmitting || !acceptedLegal}
                        >
                        <span class="btn__label">Sign up</span>
                        <Icon icon={UI_ICONS.signUp} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>
                </div>

            {:else if $subPage === "login"}
                <div class="actionbar">
                    <button type="button" class="btn btn--ghost btn--block" on:click={() => toggleMode("signup")}>
                        Sign up instead
                    </button>
                    <button
                        type="submit"
                        class="btn btn--primary btn--block"
                        class:is-loading={$isSubmitting}
                        disabled={!$readyToSubmit || $isSubmitting}
                    >
                        <span class="btn__label">Log in</span>
                        <Icon icon={UI_ICONS.login} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>
                </div>
                
                <button class="text-right text-link" on:click|preventDefault={() => toggleMode("requestReset")}>
                    Forgot password?
                </button>

            {:else if $subPage === "requestReset"}
                <div class="actionbar">                    
                    <button type="button" class="btn btn--ghost btn--icon" on:click={() => toggleMode("login")}>
                        <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                    </button>
                    <button
                        type="submit"
                        class="btn btn--primary btn--block"
                        class:is-loading={$isSubmitting}
                        disabled={!$readyToSubmit || $isSubmitting}
                    >
                        <span class="btn__label">Send reset link</span>
                        <Icon icon={UI_ICONS.send} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>
                </div>
                    
            {:else if $subPage === "reset"}
                <div class="actionbar">                    
                    <button type="button" class="btn btn--ghost btn--icon" on:click={() => toggleMode("login")}>
                        <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                    </button>
                    <button
                        type="submit"
                        class="btn btn--primary btn--block"
                        class:is-loading={$isSubmitting}
                        disabled={!$readyToSubmit || $isSubmitting}
                    >
                        <span class="btn__label">Reset password</span>
                        <Icon icon={UI_ICONS.resetPassword} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>
                </div>
            {/if}
        </div>

    </form>

<!-- TERMINAL / RESULT STATES -->
{:else}
    {#if $authFormStatus === "signedUp"}
        <Icon icon={UI_ICONS.animEmailSent} class="icon--large" />
        <p>
            <span class="text-success text-fw-semibold">Confirmation email sent.</span> Check your inbox to verify your account.
        </p>
        <p>
            Didn't receive it? Your email may already be in use. Try 
            <button type="button" class="text-link" on:click={() => toggleMode("login")}>
                logging in
            </button> instead.
        </p>
        <p>
            Alternatively,
            <button type="button" class="text-link" on:click={() => toggleMode("signup")}>
                send another
            </button> confirmation email.
        </p>

    {:else if $authFormStatus === "resetEmailSent"}
        <Icon icon={UI_ICONS.animEmailSent} class="icon--large" />
        <p>
            <span class="text-success text-fw-semibold">Password reset email sent.</span> Check your inbox to continue.
        </p>

        <p>
            Didn't get it?
            <button type="button" class="text-link" on:click={() => toggleMode("requestReset")}>
                Resend
            </button>.
        </p>

    {:else if $authFormStatus === "passwordReset"}
        <Icon icon={UI_ICONS.animSuccess} class="icon--large" />
        <p class="text-success text-fw-semibold text-center">
            Your password has been reset successfully.
        </p>

        <button
            type="button"
            class="btn btn--primary btn--block"
            on:click={() => window.location.replace("/")}
        >
            <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
            Continue
        </button>
    
    <!-- Escape hatch -->
    {:else}
        <Icon icon={UI_ICONS.animFailed} class="icon--large" />
        <p class="text-success text-fw-semibold text-center">
            An unexpected error occurred. Please try again.
        </p>

        <button
            type="button"
            class="btn btn--primary btn--block"
            on:click={() => toggleMode("login")}
        >
            <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
            Go to login
        </button>
    {/if}
{/if}