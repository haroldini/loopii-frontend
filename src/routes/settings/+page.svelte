
<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 
    import { addToast } from "$lib/stores/popups.js";
    
    import { 
        theme, themeOptions, setTheme,
        style, styleOptions, setStyle
    } from "$lib/stores/app.js";
    import {
        user, signOut, updatePassword, updateEmail,
        deleteAccount, requestPasswordReset, expectedPhrase
    } from "$lib/stores/auth.js";
    import {
        mode, setMode, currentPassword, newPassword, confirmNewPassword,
        newEmail, confirmNewEmail, confirmPhrase, isSubmitting,
        validationErrors, error, status, readyToSubmit,
        resetSensitive, resetValidation
    } from "$lib/stores/authSettings.js";


    // ACCOUNT / LOGIN SETTINGS

    let emailSentToNew = "";
    let emailSentToOld = "";

    function select(tab) {
        setMode(tab);
    }

    function confirmLocalSignOut() {
        addToast({
            variant: "modal",
            text: "Are you sure?",
            description: "You'll be logged out on this device. You can sign back in any time.",
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                {
                    label: "Log out",
                    variant: "danger",
                    onClick: () => signOut(),
                },
            ],
        });
    }

    function confirmDeleteAccount() {
        addToast({
            variant: "modal",
            text: "Delete your account?",
            description: "This will permanently delete your account and data. This action cannot be undone.",
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                {
                    label: "Delete account",
                    variant: "danger",
                    onClick: async () => {
                        isSubmitting.set(true);
                        error.set("");
                        status.set("idle");

                        try {
                            status.set("updating");
                            const { error: err } = await deleteAccount($currentPassword, $confirmPhrase);
                            if (err) {
                                error.set(err || "Could not delete account");
                                status.set("failed");
                            } else {
                                status.set("updated");
                                await signOut();
                            }
                        } finally {
                            isSubmitting.set(false);
                            resetValidation();
                            if (!["emailPending", "failed"].includes($status)) resetSensitive();
                        }
                    },
                },
            ],
        });
    }

    function confirmSignOutEverywhere() {
        addToast({
            variant: "modal",
            text: "Sign out everywhere?",
            description: "This will sign you out of all sessions on all devices, including this one.",
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                {
                    label: "Sign out everywhere",
                    variant: "danger",
                    onClick: async () => {
                        isSubmitting.set(true);
                        error.set("");
                        status.set("idle");

                        try {
                            status.set("updating");
                            const { error: err } = await signOut("global");
                            if (err) {
                                error.set(err || "We could not sign you out everywhere.");
                                status.set("failed");
                            } else status.set("updated");
                        } finally {
                            isSubmitting.set(false);
                            resetValidation();
                            if (!["emailPending", "failed"].includes($status)) resetSensitive();
                        }
                    },
                },
            ],
        });
    }

    async function handleSubmit() {
        error.set("");
        status.set("idle");
        emailSentToNew = "";
        emailSentToOld = "";

        if ($mode === "delete") return confirmDeleteAccount();
        if ($mode === "revoke") return confirmSignOutEverywhere();

        isSubmitting.set(true);
        try {
            if ($mode === "password") {
                status.set("updating");
                const { error: err } = await updatePassword($currentPassword, $newPassword);
                if (err) {
                    error.set(err || "Could not update password");
                    status.set("failed");
                } else status.set("updated");

            } else if ($mode === "email") {
                status.set("updating");
                const { error: err } = await updateEmail($newEmail);
                if (err) {
                    error.set(err || "Could not update email");
                    status.set("failed");
                } else {
                    emailSentToNew = $newEmail;
                    emailSentToOld = $user?.email || "";
                    status.set("emailPending");
                }

            } else if ($mode === "reset") {
                status.set("updating");
                const { error: err } = await requestPasswordReset($user?.email || "");
                if (err) {
                    error.set(err || "Could not send reset email");
                    status.set("failed");
                } else status.set("emailPending");
            }
        } finally {
            isSubmitting.set(false);
            resetValidation();
            if (!["emailPending", "failed"].includes($status)) resetSensitive();
        }
    }

</script>


<svelte:head>
    <title>loopii • Settings</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3 class="text-heading">
                    Settings
                </h3>
            </div>
            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    on:click={() => goto("/profile")}
                >
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                </button>
            </div>
        </div>
    </header>

    <div class="content stack gutter">

        <div class="section stack">
            <h3>Appearance</h3>
            <div class="card card--panel" role="region" aria-label="Visual settings">
                <div class="section stack appearance-grid">
                    <div class="row row--between">
                        <label for="theme-select">Theme</label>
                        <select id="theme-select" value={$theme} on:change={(e) => setTheme(e.target.value)}>
                            {#each themeOptions as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="row row--between">
                        <label for="style-select">Style</label>
                        <select id="style-select" value={$style} on:change={(e) => setStyle(e.target.value)}>
                            {#each styleOptions as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>

                    <p class="text-hint">Set the visual theme of loopii on this device.</p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>Account / Login</h3>
            <div class="card card--panel" role="region" aria-label="Account settings">
                <div class="segmented" role="tablist" aria-label="Account settings sections">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={$mode === "password"}
                        aria-current={$mode === "password" ? "page" : undefined}
                        tabindex={$mode === "password" ? 0 : -1}
                        on:click={() => select("password")}
                    >
                        Change Password
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={$mode === "email"}
                        aria-current={$mode === "email" ? "page" : undefined}
                        tabindex={$mode === "email" ? 0 : -1}
                        on:click={() => select("email")}
                    >
                        Change Email
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={$mode === "revoke"}
                        aria-current={$mode === "revoke" ? "page" : undefined}
                        tabindex={$mode === "revoke" ? 0 : -1}
                        on:click={() => select("revoke")}
                    >
                        Revoke Sessions
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={$mode === "delete"}
                        aria-current={$mode === "delete" ? "page" : undefined}
                        tabindex={$mode === "delete" ? 0 : -1}
                        on:click={() => select("delete")}
                    >
                        Delete Account
                    </button>
                </div>

                <div class="section stack" role="tabpanel">
                    {#if $mode === "password" || $mode === "delete"}
                        <input
                            type="password"
                            placeholder="Current password"
                            value={$currentPassword}
                            on:input={(e) => currentPassword.set(e.target.value)}
                        />
                    {/if}

                    {#if $mode === "password"}
                        <input
                            type="password"
                            placeholder="New password"
                            value={$newPassword}
                            on:input={(e) => newPassword.set(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={$confirmNewPassword}
                            on:input={(e) => confirmNewPassword.set(e.target.value)}
                        />

                        <p class="text-hint">
                            This will automatically sign you out on all other devices. Click
                            <button
                                type="button"
                                class="text-link"
                                on:click={() => setMode("reset")}
                            >
                                here
                            </button>
                            if you've forgotten your current password.
                        </p>

                    {:else if $mode === "email"}
                        <p class="text-hint">
                            Current email: <strong>{$user?.email}</strong>
                        </p>

                        <input
                            type="email"
                            placeholder="New email"
                            value={$newEmail}
                            on:input={(e) => newEmail.set(e.target.value.trim())}
                        />
                        <input
                            type="email"
                            placeholder="Confirm new email"
                            value={$confirmNewEmail}
                            on:input={(e) => confirmNewEmail.set(e.target.value.trim())}
                        />

                    {:else if $mode === "delete"}
                        <input
                            placeholder={$expectedPhrase}
                            value={$confirmPhrase}
                            on:input={(e) => confirmPhrase.set(e.target.value)}
                        />

                        <p class="text-danger">
                            This action permanently deletes your account and data.
                        </p>

                        <p class="text-hint">
                            To confirm, type <strong class="text-no-select">{$expectedPhrase}</strong> above.
                        </p>

                        <p class="text-hint">
                            Click
                            <button
                                type="button"
                                class="text-link"
                                on:click={() => setMode("reset")}
                            >
                                here
                            </button>
                            if you've forgotten your current password.
                        </p>

                    {:else if $mode === "reset"}
                        <p class="text-hint">
                            Click the button below to send a password reset email to your inbox (<strong>{$user?.email}</strong>).
                        </p>

                    {:else if $mode === "revoke"}
                        <p class="text-hint">
                            Click the button below to sign out of all sessions on all devices, including this one.
                        </p>
                    {/if}

                    {#if $validationErrors.filter((e) => e.display).length || $error || ["failed", "emailPending"].includes($status)}
                        <div class="u-divider" role="separator" aria-hidden="true"></div>

                        <div class="stack">
                            {#each $validationErrors.filter((e) => e.display) as err}
                                <p class="text-danger">{err.message}</p>
                            {/each}

                            {#if $error}
                                <p class="text-danger">{$error}</p>
                            {/if}

                            {#if $status === "emailPending" && $mode === "email"}
                                <p class="text-success">
                                    Confirmation emails sent! Check <strong>{emailSentToOld}</strong> and <strong>{emailSentToNew}</strong>.
                                </p>
                            {:else if $status === "emailPending" && $mode === "reset"}
                                <p class="text-success">
                                    Password reset email sent! Check your inbox (<strong>{$user?.email}</strong>).
                                </p>
                            {/if}
                        </div>
                    {/if}

                    <div class="form__actions">
                        <button
                            type="button"
                            class="btn btn--ghost"
                            class:is-loading={$isSubmitting}
                            on:click={handleSubmit}
                            disabled={!$readyToSubmit || $isSubmitting}
                        >
                            {#if $isSubmitting}
                                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                                <span class="btn__label">Submitting...</span>
                            {:else}
                                <Icon icon={UI_ICONS.accountAction} class="btn__icon" />
                                <span class="btn__label">
                                    {#if $mode === "password"}Update password
                                    {:else if $mode === "email"}Update email
                                    {:else if $mode === "delete"}Delete account
                                    {:else if $mode === "reset"}Send reset email
                                    {:else if $mode === "revoke"}Sign out everywhere
                                    {/if}
                                </span>
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>Log out</h3>
            <div class="card card--panel" role="region" aria-label="Visual settings">
                <div class="section stack">
                    <div class="form__actions">
                        <button
                            type="button"
                            class="btn btn--danger"
                            on:click={confirmLocalSignOut}
                        >
                            <Icon icon={UI_ICONS.logout} class="btn__icon" />
                            <span class="btn__label">Log Out</span>
                        </button>
                    </div>

                    <p class="text-hint">Log out of your account on this device.</p>
                </div>
            </div>
        </div>

    </div>
</div>
