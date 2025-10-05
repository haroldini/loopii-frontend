
<script>
    import {
        mode, currentPassword, newPassword, confirmNewPassword,
        newEmail, confirmNewEmail, confirmPhrase, isSubmitting,
        validationErrors, error, status, readyToSubmit, 
        resetSensitive, resetTransient, resetValidation, resetState
    } from "$lib/stores/authSettings";

    import { updatePassword, updateEmail, deleteAccount, requestPasswordReset, signOut, user, expectedPhrase } from "$lib/stores/auth";
    import { email } from "$lib/stores/authForm";

    let emailSentToNew = "";
    let emailSentToOld = "";

    // Function to handle form submission
    async function handleSubmit() {
        isSubmitting.set(true);
        error.set("");
        status.set("idle");
        emailSentToNew = "";
        emailSentToOld = "";

        try {
            if ($mode === "password") {
                status.set("updating");
                const { data, error: err } = await updatePassword($currentPassword, $newPassword);
                if (err) {
                    error.set(err || "Could not update password");
                    status.set("failed");
                } else {
                    status.set("updated");
                }
            } else if ($mode === "email") {
                status.set("updating");
                const { data, error: err } = await updateEmail($newEmail);
                if (err) {
                    error.set(err || "Could not update email");
                    status.set("failed");
                } else {
                    // Supabase sends confirmation email
                    emailSentToNew = $newEmail;
                    emailSentToOld = $user?.email || "";
                    status.set("emailPending");
                }
            } else if ($mode === "delete") {
                status.set("updating");
                const { error: err } = await deleteAccount($currentPassword, $confirmPhrase);
                if (err) {
                    error.set(err || "Could not delete account");
                    status.set("failed");
                } else {
                    status.set("updated");
                    signOut();
                }
            } else if ($mode === "reset") {
                status.set("updating");
                const { data, error: err } = await requestPasswordReset($user?.email || "");
                if (err) {
                    error.set(err || "Could not send reset email");
                    status.set("failed");
                } else {
                    status.set("emailPending");
                }
            } else if ($mode === "revoke") {
                status.set("updating");
                const { data, error: err } = await signOut("global");
                if (err) {
                    error.set(err || "Could not sign out everywhere");
                    status.set("failed");
                } else {
                    status.set("updated");
                }
            }
        } finally {
            isSubmitting.set(false);
            resetValidation();
            if (!["emailPending", "failed"].includes($status)) {
                resetSensitive();
            }
        }
    }
</script>


<h3>
    {#if $mode === "password"}Change password
    {:else if $mode === "email"}Change email
    {:else if $mode === "delete"}Delete account
    {:else if $mode === "reset"}Reset password
    {:else if $mode === "revoke"}Sign out everywhere
    {/if}
</h3>


<!-- Require current password for password & deletion -->
{#if $mode === "password" || $mode === "delete"}
    <input
        type="password"
        placeholder="Current password"
        value={$currentPassword}
        on:input={(e) => currentPassword.set(e.target.value)}
    />
{/if}

<!-- Form fields -->
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
    <p>This will automatically sign you out on all other devices. Click
        <span
            role="button"
            tabindex="0"
            on:click={() => mode.set("reset")}
            on:keydown={(e) => e.key === "Enter" && mode.set("reset")}
            class="button blue"
        >
            here
        </span> if you've forgotten your current password.
    </p>
{:else if $mode === "email"}
    <p>Current email: <strong>{$user?.email}</strong></p>
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
    <input placeholder={$expectedPhrase} value={$confirmPhrase} on:input={(e) => confirmPhrase.set(e.target.value)}/>
    <p>To confirm, type <strong style="user-select:none;">{$expectedPhrase}</strong> above.</p>
    <p><span class="red">This action permanently deletes your account and data.</span> 
        Click
        <span
            role="button"
            tabindex="0"
            on:click={() => mode.set("reset")}
            on:keydown={(e) => e.key === "Enter" && mode.set("reset")}
            class="button blue"
        >
            here
        </span> if you've forgotten your current password.
    </p>
{:else if $mode === "reset"}
    <p>Click the button below to send a password reset email to your inbox ({$user?.email}).</p>
{:else if $mode === "revoke"}
    <p>Click the button below to sign out of all sessions on all devices, including this one.</p>
{/if}


<!-- Display the correct buttons -->
<nav>
    <button type="button" disabled={!$readyToSubmit || $isSubmitting} on:click={handleSubmit}>
        {#if $isSubmitting}
            Submitting...
        {:else}
            {#if $mode === "password"}Update password
            {:else if $mode === "email"}Update email
            {:else if $mode === "delete"}Delete account
            {:else if $mode === "reset"}Send reset email
            {:else if $mode === "revoke"}Sign out everywhere
            {/if}
        {/if}
    </button>
</nav>


<!-- Status / Feedback Box -->
{#if $validationErrors.filter(e => e.display).length || $error || ["failed", "updated", "emailPending"].includes($status)}
    <div class="container bordered fill">

        <!-- Validation errors -->
        {#each $validationErrors.filter(e => e.display) as err}
            <p class="red">{err.message}</p>
        {/each}

        <!-- Submission / API error -->
        {#if $error}
            <p class="red">{$error}</p>
        {/if}

        <!-- Status -->
        {#if $status === "updated" && $mode === "password"}
        <p class="green">Password updated successfully.</p>
        {:else if $status === "updated" && $mode === "email"}
        <p class="green">Email updated successfully.</p>
        {:else if $status === "updated" && $mode === "delete"}
        <p class="green">Account deleted. Logging you out...</p>
        {:else if $status === "updated" && $mode === "revoke"}
        <p class="green">Sessions revoked. Logging you out...</p>
        {:else if $status === "emailPending" && $mode === "email"}
        <p class="green">Confirmation emails sent! Check <strong>{emailSentToOld}</strong> and <strong>{emailSentToNew}</strong>.</p>
        {:else if $status === "emailPending" && $mode === "reset"}
        <p class="green">Password reset email sent! Check your inbox ({$user?.email}).</p>
        {/if}
    </div>
{/if}
