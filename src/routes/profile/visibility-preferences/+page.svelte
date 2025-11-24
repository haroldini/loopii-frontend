<script>
    import { goto } from "$app/navigation";
    import { get } from "svelte/store";

    import PrefsForm from "$lib/components/PrefsForm.svelte";
    import { updateVisibilityPrefs } from "$lib/api/prefs.js";
    import { profile } from "$lib/stores/profile.js";
    import { addToast } from "$lib/stores/popups.js";

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

        } catch (err) {
            console.error("Error updating visibility prefs:", err);
            status = "error";
            error = err?.message || "Unexpected error saving preferences";
        }
    }

    function goBack() {
        goto("/profile");
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


<div class="container bordered">
    <h3>Visibility Preferences</h3>
    <p>Control who can see your profile.</p>
    <br>
    <nav style="justify-content: space-between;">
        <button type="button" on:click={goBack}>
            Back
        </button>
        <button
            type="button"
            on:click={save}
            disabled={status === "saving" || !canSave || !hasChanges}
        >
            {status === "saving" ? "Saving..." : "Save"}
        </button>
        <button
            type="button"
            on:click={triggerClearAll}
        >
            Clear all
        </button>
    </nav>
</div>

<div class="container bordered">
    <PrefsForm
        mode="visibility"
        on:change={handleChange}
        bind:valid={canSave}
        {clearSignal}
    />

    {#if status === "error"}
        <p class="red">{error}</p>
    {:else if status === "success"}
        <p class="green">Preferences updated.</p>
    {/if}

</div>
