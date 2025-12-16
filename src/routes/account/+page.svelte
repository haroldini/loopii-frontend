
<script>
    import { goto } from "$app/navigation";
    import { addToast } from "$lib/stores/popups.js";

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

    let emailSentToNew = "";
    let emailSentToOld = "";

    function select(tab) {
        setMode(tab);
    }

    // Derived section title for header
    let sectionTitle = "Account";
    $: sectionTitle =
        $mode === "password" ? "Change Password" :
        $mode === "email" ? "Change Email" :
        $mode === "revoke" ? "Sign Out Everywhere" :
        $mode === "delete" ? "Delete Account" :
        $mode === "reset" ? "Reset Password" :
        "Account";

    function confirmLocalSignOut() {
        addToast({
            variant: "modal",
            text: "Log out?",
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
    <title>loopii • Account</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>{sectionTitle}</h3>
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={() => goto("/profile")}
                >
                    Back
                </button>

                <button
                    type="button"
                    class="btn btn--danger"
                    on:click={confirmLocalSignOut}
                >
                    Log Out
                </button>
            </div>
        </div>
    </header>

    <div class="content stack gutter">
        <div class="card card--panel" role="region" aria-label="Account settings">
            <div class="segmented" role="tablist" aria-label="Account settings sections">
                <button
                    type="button"
                    class="segmented__item"
                    role="tab"
                    aria-selected={$mode === "password"}
                    aria-current={$mode === "password" ? "page" : undefined}
                    tabindex={$mode === "password" ? 0 : -1}
                    on:click={() => select("password")}
                >
                    Password
                </button>

                <button
                    type="button"
                    class="segmented__item"
                    role="tab"
                    aria-selected={$mode === "email"}
                    aria-current={$mode === "email" ? "page" : undefined}
                    tabindex={$mode === "email" ? 0 : -1}
                    on:click={() => select("email")}
                >
                    Email
                </button>

                <button
                    type="button"
                    class="segmented__item"
                    role="tab"
                    aria-selected={$mode === "revoke"}
                    aria-current={$mode === "revoke" ? "page" : undefined}
                    tabindex={$mode === "revoke" ? 0 : -1}
                    on:click={() => select("revoke")}
                >
                    Revoke
                </button>

                <button
                    type="button"
                    class="segmented__item"
                    role="tab"
                    aria-selected={$mode === "delete"}
                    aria-current={$mode === "delete" ? "page" : undefined}
                    tabindex={$mode === "delete" ? 0 : -1}
                    on:click={() => select("delete")}
                >
                    Delete
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
                        class="btn btn--primary"
                        disabled={!$readyToSubmit || $isSubmitting}
                        on:click={handleSubmit}
                    >
                        {#if $isSubmitting}
                            Submitting...
                        {:else}
                            {#if $mode === "password"}Update Password
                            {:else if $mode === "email"}Update Email
                            {:else if $mode === "delete"}Delete Account
                            {:else if $mode === "reset"}Send reset Email
                            {:else if $mode === "revoke"}Sign Out Everywhere
                            {/if}
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
