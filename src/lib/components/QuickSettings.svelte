
<script>
    import { onDestroy, onMount, tick } from "svelte";
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";
    import { get } from "svelte/store";

    import Overlay from "$lib/components/Overlay.svelte";
    import { UI_ICONS, theme, themeOptions, setTheme, style, styleOptions, setStyle } from "$lib/stores/app.js";
    import { user, authState, signOut, deleteAccount, expectedPhrase } from "$lib/stores/auth.js";
    import { addToast } from "$lib/stores/popups.js";

    export let showTrigger = true;

    const HASH = "#quick-settings";

    let overlay;
    let isOpen = false;

    export function open() {
        isOpen = true;
        overlay?.openOverlay();
    }

    export function close() {
        isOpen = false;
        overlay?.closeOverlay();
    }

    // ---------------- Sign out of account ----------------

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
                    onClick: async () => {
                        close();
                        await tick();
                        await signOut();
                    },
                },
            ],
        });
    }

    // ---------------- Delete account ----------------

    let showDelete = false;

    let deletePassword = "";
    let deletePhrase = "";
    let deleteError = "";
    let isDeleting = false;

    function resetDeleteForm() {
        deletePassword = "";
        deletePhrase = "";
        deleteError = "";
        showDelete = false;
    }

    function validateDelete() {
        deleteError = "";

        if (!deletePassword.trim()) {
            deleteError = "Enter your current password.";
            return false;
        }

        const expected = get(expectedPhrase);
        if ((deletePhrase || "").trim() !== expected) {
            deleteError = "Confirmation phrase does not match.";
            return false;
        }

        return true;
    }

    async function runDeleteAccount() {
        if (isDeleting) return;
        if (!validateDelete()) return;

        isDeleting = true;

        try {
            const { error } = await deleteAccount(deletePassword, deletePhrase);

            if (error) {
                deleteError = error;
                addToast({
                    variant: "banner",
                    text: "Couldn't delete account.",
                    description: error || "Please try again later.",
                    autoHideMs: null,
                });
                return;
            }

            close();
            await tick();
            await signOut();
            resetDeleteForm();

        } finally {
            isDeleting = false;
        }
    }

    function confirmDeleteAccount() {
        if (!validateDelete()) return;

        addToast({
            variant: "modal",
            text: "Delete your account?",
            description: "This will permanently delete your account and data. This action cannot be undone.",
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                { label: "Delete account", variant: "danger", onClick: runDeleteAccount },
            ],
        });
    }

    // ---------------- Overlay mechanics ----------------

    function onKeydown(e) {
        if (!isOpen) return;
        if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    }

    onMount(async () => {
        window.addEventListener("keydown", onKeydown);

        if (window.location.hash === HASH) {
            isOpen = true;
            await tick();
            overlay?.openOverlay();
        }
    });

    onDestroy(() => {
        window.removeEventListener("keydown", onKeydown);
    });
</script>


{#if showTrigger}
    <button
        type="button"
        class="quick-settings__trigger btn btn--icon"
        aria-label="Open settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        on:click={() => (isOpen ? close() : open())}
    >
        <Icon icon={UI_ICONS.settings} class="btn__icon" />
    </button>
{/if}


<Overlay
    bind:this={overlay}
    open={isOpen}
    hash={HASH}
    openClass="overlay"
    closedClass="u-hidden"
    renderOpenOnly={false}
    ariaLabel="Quick settings"
    windowedAt={480}
    on:requestClose={() => close()}
>
    {#if isOpen}
        <button
            type="button"
            class="overlay__scrim"
            aria-hidden="true"
            tabindex="-1"
            on:click={() => close()}
        ></button>

        <div class="overlay__panel quick-settings__panel" role="document">
            <header class="bar bar--header overlay__header">
                <div class="bar__inner">
                    <div class="bar__title">
                        <h3>Settings</h3>
                        {#if $authState === "authenticated" && $user}
                            <p class="text-hint">Signed in as <strong>{$user?.email || ""}</strong></p>
                        {/if}
                    </div>
                </div>

                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    aria-label="Close"
                    on:click={() => close()}
                >
                    <Icon icon={UI_ICONS.close} class="btn__icon" />
                </button>
            </header>

            <main class="overlay__body quick-settings__body">
                <div class="section stack">
                    <h3>Appearance</h3>

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

                {#if $authState === "authenticated" && $user}
                    <div class="u-divider" role="separator" aria-hidden="true"></div>

                    <div class="section stack">
                        <h3>Account</h3>

                        <div class="card card--panel" role="region" aria-label="Log out">
                            <div class="section stack">
                                <div class="form__actions">
                                    <button
                                        type="button"
                                        class="btn btn--danger"
                                        on:click={confirmLocalSignOut}
                                    >
                                        <Icon icon={UI_ICONS.logout} class="btn__icon" />
                                        <span class="btn__label">Log out</span>
                                    </button>
                                </div>

                                <p class="text-hint">Log out of your account on this device.</p>
                            </div>
                        </div>

                        <div class="card card--panel" role="region" aria-label="Delete account">
                            <div class="section stack">
                                <button
                                    type="button"
                                    class="btn text-fw-semibold"
                                    class:btn--danger={!showDelete}
                                    on:click={() => (showDelete = !showDelete)}
                                >
                                    <Icon icon={showDelete ? UI_ICONS.close : UI_ICONS.delete} class="btn__icon" />
                                    <span class="btn__label">{showDelete ? "Cancel" : "Delete account"}</span>
                                </button>

                                {#if showDelete}
                                    <input
                                        type="password"
                                        placeholder="Current password"
                                        value={deletePassword}
                                        on:input={(e) => (deletePassword = e.target.value)}
                                    />

                                    <input
                                        placeholder={$expectedPhrase}
                                        value={deletePhrase}
                                        on:input={(e) => (deletePhrase = e.target.value)}
                                    />

                                    <p class="text-hint">
                                        To confirm, type <strong class="text-no-select">{$expectedPhrase}</strong> above.
                                    </p>

                                    {#if deleteError}
                                        <p class="text-danger">{deleteError}</p>
                                    {/if}

                                    <div class="form__actions">
                                        <button
                                            type="button"
                                            class="btn btn--danger"
                                            class:is-loading={isDeleting}
                                            disabled={isDeleting}
                                            on:click={confirmDeleteAccount}
                                        >
                                            <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                                            <Icon icon={UI_ICONS.delete} class="btn__icon" />
                                            <span class="btn__label">Delete account</span>
                                        </button>
                                    </div>
                                {/if}

                                <p class="text-hint">This permanently deletes your account and data.</p>
                            </div>
                        </div>
                    </div>
                {/if}

                <div class="u-divider" role="separator" aria-hidden="true"></div>

                <div class="section stack">
                    <h3>Info</h3>

                    <div class="actions actions--center actions-fillwrap">
                        <button
                            type="button"
                            class="btn btn--ghost text-fw-semibold"
                            on:click={() => goto("/privacy")}
                            aria-label="Privacy"
                            title="Privacy"
                        >
                            <Icon icon={UI_ICONS.privacy} class="btn__icon" />
                            <span class="btn__label">Privacy</span>
                        </button>

                        <button
                            type="button"
                            class="btn btn--ghost text-fw-semibold"
                            on:click={() => goto("/terms")}
                            aria-label="Terms"
                            title="Terms"
                        >
                            <Icon icon={UI_ICONS.terms} class="btn__icon" />
                            <span class="btn__label">Terms</span>
                        </button>

                        <button
                            type="button"
                            class="btn btn--ghost text-fw-semibold"
                            on:click={() => goto("/contact")}
                            aria-label="Contact"
                            title="Contact"
                        >
                            <Icon icon={UI_ICONS.email} class="btn__icon" />
                            <span class="btn__label">Contact</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    {/if}
</Overlay>
