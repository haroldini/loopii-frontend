
<script>
    import { goto } from "$app/navigation";
    import { get } from "svelte/store";

    import PrefsForm from "$lib/components/PrefsForm.svelte";
    import { updateVisibilityPrefs } from "$lib/api/prefs.js";
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

            const res = await updateVisibilityPrefs(payload);

            const current = get(profile);
            if (current) {
                profile.set({
                    ...current,
                    visibility_prefs: res,
                });
            }

            original = body ? JSON.parse(JSON.stringify(body)) : null;
            hasChanges = false;

            status = "success";
            addToast({
                text: "Visibility preferences updated.",
                autoHideMs: 3000,
            });

            if (get(peerStatus) === "unloaded") {
                initPeerStore();
            } else {
                refreshPeerStore();
            }

        } catch (err) {
            console.error("Error updating visibility prefs:", err);
            status = "error";
            error = err?.message || "Unexpected error saving preferences";
        }
    }

    function goBack() {
        goto("/profile");
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
    <title>loopii • Visibility Preferences</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Visibility Preferences</h3>
                <p class="text-hint">Control who can see your profile.</p>
            </div>

            <div class="bar__actions">
                <button type="button" class="btn btn--ghost" on:click={confirmDiscardAndGoBack}>
                    {hasChanges ? "Discard changes" : "Back"}
                </button>
            </div>
        </div>
    </header>

    <div class="content stack">
        {#if status === "error"}
            <p class="text-danger">{error}</p>
        {/if}

        <section class="card">
            <div class="section stack">
                <PrefsForm
                    mode="visibility"
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
                    on:click={save}
                    disabled={status === "saving" || !canSave || !hasChanges}
                >
                    {status === "saving" ? "Saving…" : "Save"}
                </button>
            </div>
        </div>
    </div>
</div>
