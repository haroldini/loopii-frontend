
<script>
    import {
        mode, currentPassword, newPassword, confirmNewPassword,
        newEmail, confirmNewEmail, confirmPhrase, isSubmitting,
        validationErrors, error, status, readyToSubmit, 
        resetSensitive, resetTransient, resetValidation, resetState
    } from "$lib/stores/changeAuthForm";

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
            if ($status !== "failed") {
                resetSensitive();
            }
        }
    }
</script>


<div style="margin-top:1rem; padding:1rem; border:1px solid #ddd; border-radius:8px; max-width:520px;">
    <h2 style="margin:0 0 0.5rem 0;">
        {#if $mode === "password"}Change password
        {:else if $mode === "email"}Change email
        {:else if $mode === "delete"}Delete account
        {:else if $mode === "reset"}Reset password
        {:else if $mode === "revoke"}Sign out everywhere
        {/if}
    </h2>

    <div style="display:flex; flex-direction:column; gap:0.5rem;">

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
                    style="color:blue; cursor:pointer; text-decoration:underline;"
                >
                    here
                </span> if you've forgotten your current password.
            </p>
        {:else if $mode === "email"}
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
            <p style="margin:0;">To confirm, type <strong style="user-select:none;">{$expectedPhrase}</strong> above.</p>
            <p><span style="color:#b00020; margin:0.25rem 0; font-weight:600;">This action permanently deletes your account and data.</span> 
                Click
                <span
                    role="button"
                    tabindex="0"
                    on:click={() => mode.set("reset")}
                    on:keydown={(e) => e.key === "Enter" && mode.set("reset")}
                    style="color:blue; cursor:pointer; text-decoration:underline;"
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
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
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
        </div>
    </div>

    <!-- Status / Feedback Box -->
    {#if $validationErrors.filter(e => e.display).length || $error || ["failed", "updated", "emailPending"].includes($status)}
        <div style="margin-top:0.75rem; padding:0.75rem; border-radius:6px; background:#f9f9f9;">

            <!-- Validation errors -->
            {#each $validationErrors.filter(e => e.display) as err}
                <p style="color:#d00; margin:0.25rem 0;">{err.message}</p>
            {/each}

            <!-- Submission / API error -->
            {#if $error}
                <p style="color:#d00;">{$error}</p>
            {/if}

            <!-- Status -->
            {#if $status === "updated" && $mode === "password"}
            <p style="color:green;">Password updated successfully.</p>
            {:else if $status === "updated" && $mode === "email"}
            <p style="color:green;">Email updated successfully.</p>
            {:else if $status === "updated" && $mode === "delete"}
            <p style="color:green;">Account deleted. Logging you out...</p>
            {:else if $status === "updated" && $mode === "revoke"}
            <p style="color:green;">Sessions revoked. Logging you out...</p>
            {:else if $status === "emailPending" && $mode === "email"}
            <p style="color:green;">Confirmation emails sent! Check <strong>{emailSentToOld}</strong> and <strong>{emailSentToNew}</strong>.</p>
            {:else if $status === "emailPending" && $mode === "reset"}
            <p style="color:green;">Password reset email sent! Check your inbox ({$user?.email}).</p>
            {/if}
        </div>
    {/if}
</div>
