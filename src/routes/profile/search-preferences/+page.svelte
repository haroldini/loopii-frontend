
<script>
    import { goto } from "$app/navigation";
    import { get } from "svelte/store";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 

    import PrefsForm from "$lib/components/PrefsForm.svelte";
    import { updateSearchPrefs } from "$lib/api/prefs.js";
    import { profile } from "$lib/stores/profile.js";
    import { addToast } from "$lib/stores/popups.js";
    import { initPeerStore, peerStatus, refreshPeerStore } from "$lib/stores/feed.js";

    let body = null;
    let original = null;
    let hasChanges = false;
    let canSave = true;  // false when there is an active validation error
    let status = "idle"; // "idle" | "saving" | "success" | "error"
    let error = "";

    // signal for child to clear all filters
    let clearSignal = 0;

    function handleChange(event) {
        // PrefsForm sends { payload, valid }
        const payload = event.detail?.payload ?? null;
        body = payload;
        canSave = event.detail?.valid ?? true;

        if (original === null && payload !== null) {
            original = JSON.parse(JSON.stringify(payload));
        }

        if (original === null || payload === null) {
            hasChanges = false;
        } else {
            hasChanges = JSON.stringify(payload) !== JSON.stringify(original);
        }
    }

    async function save() {
        if (!canSave || !hasChanges) return;

        status = "saving";
        error = "";

        try {
            const payload =
                body ??
                {
                    genders: null,
                    age_min: null,
                    age_max: null,
                    country_ids: null,
                    proximity_km: null,
                    proximity_lat: null,
                    proximity_lng: null,
                };

            const res = await updateSearchPrefs(payload);

            const current = get(profile);
            if (current) {
                profile.set({
                    ...current,
                    search_prefs: res,
                });
            }

            original = body ? JSON.parse(JSON.stringify(body)) : null;
            hasChanges = false;

            status = "success";
            addToast({
                text: "Search preferences updated!",
                autoHideMs: 3000,
            });

            if (get(peerStatus) === "unloaded") {
                initPeerStore();
            } else {
                refreshPeerStore();
            }

        } catch (err) {
            console.error("Error updating search prefs:", err);
            status = "error";
            error = err?.message || "Unexpected error saving preferences";
        }
    }

    function goBack() {
        goto("/");
    }

    function confirmDiscardAndGoBack() {
        if (!hasChanges) {
            goBack();
            return;
        }

        addToast({
            variant: "modal",
            text: "Discard your changes?",
            description: "You have unsaved changes. If you leave now, they will be lost.",
            autoHideMs: null,
            actions: [
                {
                    label: "Keep editing",
                    variant: "secondary",
                },
                {
                    label: "Discard changes",
                    variant: "danger",
                    onClick: () => {
                        goBack();
                    },
                },
            ],
        });
    }

    function triggerClearAll() {
        clearSignal += 1;
        status = "idle";
        error = "";
    }
</script>


<svelte:head>
    <title>loopii • Search Preferences</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Search Preferences</h3>
                <p class="text-hint">Control who you see in your feed.</p>
            </div>

            <div class="bar__actions">
                <button type="button" class="btn btn--ghost btn--icon" on:click={confirmDiscardAndGoBack}>
                    {#if hasChanges}
                        <Icon icon={UI_ICONS.close} class="btn__icon" />
                    {:else}
                        <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                    {/if}
                </button>
            </div>
        </div>
    </header>

    <div class="content stack gutter">
        {#if status === "error"}
            <p class="text-danger">{error}</p>
        {/if}

        <section class="card">
            <div class="section stack">
                <PrefsForm
                    mode="search"
                    on:change={handleChange}
                    bind:valid={canSave}
                    {clearSignal}
                />
            </div>
        </section>
    </div>

    <div class="bar bar--actionbar">
        <div class="bar__inner">
            <div class="actionbar">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={triggerClearAll}
                    disabled={status === "saving"}
                >
                    Clear all
                </button>

                <button
                    type="button"
                    class="btn btn--primary"
                    class:is-loading={status === "saving"}
                    on:click={save}
                    disabled={status === "saving" || !canSave || !hasChanges}
                >
                    {#if status === "saving"}
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                        <span class="btn__label">Saving...</span>
                    {:else}
                        <Icon icon={UI_ICONS.check} class="btn__icon" />
                        <span class="btn__label">Save</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
</div>
