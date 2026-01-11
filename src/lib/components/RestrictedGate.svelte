
<script>
    import Icon from "@iconify/svelte";
    import { get } from "svelte/store";

    import { UI_ICONS } from "$lib/stores/app.js";
    import { profile, refreshProfileSilently } from "$lib/stores/profile.js";
    import { ackWarning } from "$lib/api/profile.js";

    let { onSignOut = () => {} } = $props();

    const accessStatus = $derived.by(() => {
        const s = $profile?.access?.status;
        return (s || "active").toLowerCase();
    });

    const bannedUntilLabel = $derived.by(() => {
        const iso = $profile?.access?.banned_until;
        if (!iso) return null;

        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return null;

        const rounded = new Date(Math.ceil(d.getTime() / 60000) * 60000);
        return rounded.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    });

    let isSubmitting = $state(false);

    async function handleAckWarning() {
        if (isSubmitting) return;
        isSubmitting = true;

        try {
            await ackWarning();
            await refreshProfileSilently();
        } catch (err) {
            console.warn("ackWarning failed:", err);
        } finally {
            isSubmitting = false;
        }
    }
</script>


{#if accessStatus === "warning" || accessStatus === "warned"}
    <p class="text-center text-fw-semibold">Your account has a warning.</p>

    {#if $profile?.access?.public_message}
        <p class="text-center text-hint">{$profile.access.public_message}</p>
    {/if}

    <p class="text-hint text-center">
        Review our <a href="/terms" class="text-link">terms</a> to continue.
    </p>

    <div class="actionbar">
        <button
            type="button"
            class="btn btn--primary btn--block"
            class:is-loading={isSubmitting}
            onclick={handleAckWarning}
            disabled={isSubmitting}
        >
            <span class="btn__label">Continue</span>
            <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
            <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
        </button>

        <button type="button" class="btn btn--danger btn--block" onclick={onSignOut}>
            <Icon icon={UI_ICONS.logout} class="btn__icon" />
            <span class="btn__label">Log out</span>
        </button>
    </div>

{:else if accessStatus === "temp_banned"}
    <p class="text-center text-fw-semibold">You have been temporarily banned.</p>

    {#if $profile?.access?.public_message}
        <p class="text-center text-hint">{$profile.access.public_message}</p>
    {/if}

    {#if bannedUntilLabel}
        <p class="text-hint text-center">
            You can access the app again on {bannedUntilLabel}. See our
            <a href="/terms" class="text-link">terms</a>.
        </p>
    {:else}
        <p class="text-hint text-center">
            See our <a href="/terms" class="text-link">terms</a>.
        </p>
    {/if}

    <div class="actionbar">
        <button type="button" class="btn btn--danger btn--block" onclick={onSignOut}>
            <Icon icon={UI_ICONS.logout} class="btn__icon" />
            <span class="btn__label">Log out</span>
        </button>
    </div>

{:else if accessStatus === "banned"}
    <p class="text-center text-fw-semibold">You have been banned.</p>

    {#if $profile?.access?.public_message}
        <p class="text-center text-hint">{$profile.access.public_message}</p>
    {/if}

    <p class="text-hint text-center">
        See our <a href="/terms" class="text-link">terms</a>.
    </p>

    <div class="actionbar">
        <button type="button" class="btn btn--danger btn--block" onclick={onSignOut}>
            <Icon icon={UI_ICONS.logout} class="btn__icon" />
            <span class="btn__label">Log out</span>
        </button>
    </div>

{:else}
    <p class="text-center text-fw-semibold">Your account has been restricted.</p>

    {#if $profile?.access?.public_message}
        <p class="text-center text-hint">{$profile.access.public_message}</p>
    {/if}

    <p class="text-hint text-center">
        See our <a href="/terms" class="text-link">terms</a>.
    </p>

    <div class="actionbar">
        <button type="button" class="btn btn--danger btn--block" onclick={onSignOut}>
            <Icon icon={UI_ICONS.logout} class="btn__icon" />
            <span class="btn__label">Log out</span>
        </button>
    </div>
{/if}
