
<script>
    import { onDestroy, onMount, tick } from "svelte";
    import Icon from "@iconify/svelte";

    import Overlay from "$lib/components/Overlay.svelte";
    import { UI_ICONS, theme, themeOptions, setTheme, style, styleOptions, setStyle } from "$lib/stores/app.js";
    import { user, authState, signOut } from "$lib/stores/auth.js";
    import { addToast } from "$lib/stores/popups.js";

    const HASH = "#quick-settings";

    let overlay;
    let isOpen = false;

    function open() {
        isOpen = true;
        overlay?.openOverlay();
    }

    function close(fromHash = false) {
        isOpen = false;
        overlay?.closeOverlay({ fromHash });
    }

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
                        close(false);
                        await tick();
                        await signOut();
                    },
                },
            ],
        });
    }

    function onKeydown(e) {
        if (!isOpen) return;
        if (e.key === "Escape") {
            e.preventDefault();
            close(false);
        }
    }

    onMount(async () => {
        window.addEventListener("keydown", onKeydown);

        // Optional: open if user lands on URL with the hash
        if (window.location.hash === HASH) {
            isOpen = true;
            await tick();
            overlay?.openOverlay();
        }
    });

    onDestroy(() => {
        window.removeEventListener("keydown", onKeydown);
    });

    $: isAuthed = $authState === "authenticated" && !!$user;
    $: email = $user?.email || "";
</script>


<!-- Fixed trigger -->
<button
    type="button"
    class="quick-settings__trigger btn btn--ghost btn--icon"
    aria-label="Open settings"
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    on:click={() => (isOpen ? close(false) : open())}
>
    <Icon icon={UI_ICONS.settings} class="btn__icon" />
</button>


<Overlay
    bind:this={overlay}
    open={isOpen}
    hash={HASH}
    openClass="overlay"
    closedClass="u-hidden"
    renderOpenOnly={false}
    ariaLabel="Quick settings"
    on:requestClose={() => close(true)}
>
    {#if isOpen}
        <button
        type="button"
        class="overlay__scrim"
        aria-hidden="true"
        tabindex="-1"
        on:click={() => close(false)}
        ></button>

        <div class="overlay__panel quick-settings__panel" role="document">
            <header class="overlay__header quick-settings__header">
                <div class="bar__title">
                    <h3>Settings</h3>
                    {#if isAuthed}
                        <p class="text-hint">Signed in as <strong>{email}</strong></p>
                    {/if}
                </div>

                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    aria-label="Close"
                    on:click={() => close(false)}
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

                {#if isAuthed}
                    <div class="u-divider" role="separator" aria-hidden="true"></div>

                    <div class="section stack">
                        <h3>Account</h3>

                        <button type="button" class="btn btn--danger" on:click={confirmLocalSignOut}>
                            <Icon icon={UI_ICONS.logout} class="btn__icon" />
                            <span class="btn__label">Log out</span>
                        </button>
                    </div>
                {/if}
            </main>
        </div>
    {/if}
</Overlay>


<style>
    .quick-settings__trigger {
        position: fixed;
        top: calc(var(--space-2) + env(safe-area-inset-top, 0px));
        right: var(--space-3);
        z-index: var(--z-nav);
    }

    @media (min-width: 768px) {
        .quick-settings__panel {
            max-width: 32rem;
            width: min(32rem, calc(100% - var(--space-4)));
            height: auto;
            max-height: calc(100dvh - (var(--space-4) + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px)));
            margin: 0 auto;
        }
    }

    .quick-settings__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
    }

    .quick-settings__body {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }
</style>
