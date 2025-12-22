
<script>
    import { createEventDispatcher } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { profile } from "$lib/stores/profile.js";
    import { allCountries } from "$lib/stores/app.js";
    import MapPicker from "$lib/components/MapPicker.svelte";
    import RangeSlider from "$lib/components/RangeSlider.svelte";
    import MultiSelect from "$lib/components/MultiSelect.svelte";

    // "search" | "visibility" (for default initial source)
    export let mode = "search";

    // Optional explicit initial prefs object to override profile-based defaults
    export let initial = null;

    // External trigger: increment this from parent to run clearAll()
    export let clearSignal = 0;

    export let valid = true;

    export let defaultLat = 51.505;
    export let defaultLng = -0.09;
    const FALLBACK_LAT = 51.505;
    const FALLBACK_LNG = -0.09;
    function finiteOr(value, fallback) {
        return (typeof value === "number" && Number.isFinite(value)) ? value : fallback;
    }

    const dispatch = createEventDispatcher();

    let genders = [];
    let ageMin = "";   // strings for easier validation
    let ageMax = "";
    let ageError = null;

    let countryIds = [];

    // Proximity radius (string from <select>, "" = no limit)
    let proximityKm = "";
    let proximityLat = null;
    let proximityLng = null;

    let isVisible = true;
    let initialized = false;

    // Determine base prefs source: explicit initial > profile.*_prefs > null
    $: basePrefs =
    initial != null
        ? initial
        : mode === "search"
        ? $profile?.search_prefs
        : $profile?.visibility_prefs;

    // One-time initialization from base prefs when they first become available
    $: if (!initialized && basePrefs) {
        genders = Array.isArray(basePrefs.genders) ? [...basePrefs.genders] : [];

        ageMin = basePrefs.age_min != null ? String(basePrefs.age_min) : "";
        ageMax = basePrefs.age_max != null ? String(basePrefs.age_max) : "";

        countryIds = Array.isArray(basePrefs.country_ids) ? [...basePrefs.country_ids] : [];

        proximityKm = basePrefs.proximity_km != null ? String(basePrefs.proximity_km) : "";
        proximityLat = basePrefs.proximity_lat ?? null;
        proximityLng = basePrefs.proximity_lng ?? null;

        if (mode === "visibility") {
            isVisible = basePrefs.is_visible ?? true;
        }

        initialized = true;
    }

    // ---- Age validation ----
    $: ageError = (() => {
        const hasMin = ageMin !== "" && ageMin != null;
        const hasMax = ageMax !== "" && ageMax != null;

        let minVal;
        let maxVal;

        if (hasMin) {
            minVal = Number(ageMin);
            if (!Number.isFinite(minVal) || minVal < 18 || minVal > 150) {
                return "Age must be between 18 and 150.";
            }
        }

        if (hasMax) {
            maxVal = Number(ageMax);
            if (!Number.isFinite(maxVal) || maxVal < 18 || maxVal > 150) {
                return "Age must be between 18 and 150.";
            }
        }

        if (hasMin && hasMax && minVal > maxVal) {
            return "Minimum age cannot be greater than maximum age.";
        }

        return null;
    })();

    $: valid = !ageError;

    function parseAgeSafe(value) {
        if (value === "" || value == null) return null;
        const n = Number(value);
        if (!Number.isFinite(n) || n < 18 || n > 150) return null;
        return n;
    }

    // Helper: build payload matching UpdateProfilePrefs / UpdateProfileVisibilityPrefs
    function buildPayload() {
        const hasGenders = Array.isArray(genders) && genders.length > 0;
        const hasCountries = Array.isArray(countryIds) && countryIds.length > 0;

        let minAge = null;
        let maxAge = null;

        // Only send ages if they’re valid (no error)
        if (!ageError) {
            minAge = parseAgeSafe(ageMin);
            maxAge = parseAgeSafe(ageMax);
        }

        const parsedKm = proximityKm === "" ? null : Number(proximityKm);

        const hasKm = Number.isFinite(parsedKm);
        const hasCoords =
            typeof proximityLat === "number" &&
            Number.isFinite(proximityLat) &&
            typeof proximityLng === "number" &&
            Number.isFinite(proximityLng);

        const enableProximity = hasKm && hasCoords;

        const base = {
            genders: hasGenders ? genders : null,
            age_min: minAge,
            age_max: maxAge,
            country_ids: hasCountries ? countryIds : null,
            proximity_km: enableProximity ? parsedKm : null,
            proximity_lat: enableProximity ? proximityLat : null,
            proximity_lng: enableProximity ? proximityLng : null,
        };

        if (mode === "visibility") {
            return {
                ...base,
                is_visible: isVisible,
            };
        }

        return base;
    }

    // Bundle payload + validity for parent
    function buildState() {
        return {
            payload: buildPayload(),
            valid,
        };
    }

    // Emit change whenever any bound field changes
    $: {
        genders;
        ageMin;
        ageMax;
        ageError;
        countryIds;
        proximityKm;
        proximityLat;
        proximityLng;
        isVisible;
        valid;
        dispatch("change", buildState());
    }

    function toggleGender(value) {
        if (genders.includes(value)) {
            genders = genders.filter((g) => g !== value);
        } else {
            if (genders.length >= 3) return;
            genders = [...genders, value];
        }
    }

    function handleAgeMinChange(event) {
        ageMin = event.target.value;
    }

    function handleAgeMaxChange(event) {
        ageMax = event.target.value;
    }

    function pickLocation() {
        const baseLat = finiteOr($profile?.latitude, finiteOr(defaultLat, FALLBACK_LAT));
        const baseLng = finiteOr($profile?.longitude, finiteOr(defaultLng, FALLBACK_LNG));

        // Default London at 5km if no profile location
        proximityLat = baseLat;
        proximityLng = baseLng;
        if (!proximityKm) proximityKm = "5";
    }

    function clearLocationFilter() {
        proximityLat = null;
        proximityLng = null;
        proximityKm = "";
    }

    function handleProximitySelect(event) {
        const value = event.target.value;
        if (value === "") {
            clearLocationFilter();
        } else {
            proximityKm = value;
        }
    }

    function clearAll() {
        genders = [];
        ageMin = "";
        ageMax = "";
        ageError = null;
        countryIds = [];
        proximityLat = null;
        proximityLng = null;
        proximityKm = "";
    }

    // Watch clearSignal from parent; whenever it changes, run clearAll()
    let lastClearSignal = clearSignal;
    $: if (clearSignal !== lastClearSignal) {
        lastClearSignal = clearSignal;
        clearAll();
    }
</script>


<div class="prefs-form stack">
    {#if mode === "visibility"}
        <div class="field">
            <label class="field__label" for="global-visibility">Profile Visibility</label>
            <p class="text-hint">You won't be shown profiles that aren't allowed to view you.</p>

            <label class="switch" for="global-visibility">
                <span class="switch__text">Show my profile in other people's feeds</span>

                <span class="switch__control">
                    <input
                        id="global-visibility"
                        class="switch__input"
                        type="checkbox"
                        bind:checked={isVisible}
                    />
                    <span class="switch__track" aria-hidden="true"></span>
                    <span class="switch__thumb" aria-hidden="true"></span>
                </span>
            </label>
        </div>
    {/if}

    {#if mode !== "visibility" || isVisible}
        <div class="field">
            <legend class="field__label">Genders</legend>

            <div class="choice-grid">
                <button
                    type="button"
                    class="btn btn--toggle"
                    aria-pressed={genders.includes("male")}
                    on:click={() => toggleGender("male")}
                >
                    Men
                </button>

                <button
                    type="button"
                    class="btn btn--toggle"
                    aria-pressed={genders.includes("female")}
                    on:click={() => toggleGender("female")}
                >
                    Women
                </button>

                <button
                    type="button"
                    class="btn btn--toggle"
                    aria-pressed={genders.includes("other")}
                    on:click={() => toggleGender("other")}
                >
                    Non-binary / Other
                </button>
            </div>
        </div>

        <div class="field">
            <div class="field__label">Age</div>
            <RangeSlider
                min={18}
                max={80}
                step={1}
                gap={1}
                openMin={true}
                openMax={true}
                maxLabelSuffix="+"
                bind:valueMin={ageMin}
                bind:valueMax={ageMax}
            />
        </div>

        <div class="field">
            <div class="field__label">Countries</div>
                <MultiSelect
                    title="Select Countries"
                    placeholder="Any"
                    searchPlaceholder="Search countries..."
                    items={$allCountries}
                    valueKey="id"
                    labelKey="name"
                    groupKey="sub_region"
                    bind:value={countryIds}
                />
        </div>

        <div class="field">
            <div class="field__label">Location</div>

            {#if mode === "search"}
                <p class="text-hint">Only show me people near a chosen location.</p>
            {:else}
                <p class="text-hint">Only show me to people near a chosen location.</p>
            {/if}

            {#if Number.isFinite(proximityLat) && Number.isFinite(proximityLng)}
                <div class="field__control">
                    <MapPicker
                        lat={proximityLat}
                        lng={proximityLng}
                        radius={proximityKm ? Number(proximityKm) * 1000 : 0}
                        title="Select location"
                        hint={
                            mode === "search"
                                ? "You will only see people near this location."
                                : "Only people near this location will see you."
                        }
                        mode="preview"
                        defaultZoom={11}
                        on:confirm={(e) => {
                            proximityLat = e.detail.lat;
                            proximityLng = e.detail.lng;
                        }}
                    />
                </div>

                <div class="location-row">
                    <select
                        id="proximity"
                        bind:value={proximityKm}
                        on:change={handleProximitySelect}
                        aria-label="Distance limit"
                    >
                        <option value="">No limit</option>
                        <option value="2">Within 2 km</option>
                        <option value="5">Within 5 km</option>
                        <option value="10">Within 10 km</option>
                        <option value="25">Within 25 km</option>
                        <option value="50">Within 50 km</option>
                        <option value="100">Within 100 km</option>
                    </select>

                    <button
                        type="button"
                        class="btn btn--ghost"
                        on:click={clearLocationFilter}
                    >
                        <Icon icon={UI_ICONS.pinRemove} class="btn__icon" />
                        <span class="btn__label">Clear</span>
                    </button>
                </div>
            {:else}
                <button type="button" class="btn btn--block" on:click={pickLocation}>
                    <Icon icon={UI_ICONS.pinAdd} class="btn__icon" />
                    <span class="btn__label">Enable location filter</span>
                </button>
            {/if}
        </div>
    {/if}
</div>


<style>
    .choice-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
        gap: var(--space-2);
    }

    .location-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        flex-wrap: wrap;
    }

    .location-row > select {
        flex: 1 1 10rem;
        min-width: 10rem;
    }

    .location-row > .btn {
        flex: 0 0 auto;
    }
</style>
