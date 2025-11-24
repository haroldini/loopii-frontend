<script>
    import { createEventDispatcher } from "svelte";
    import { profile } from "$lib/stores/profile.js";
    import { allCountries } from "$lib/stores/app.js";
    import MapPicker from "$lib/components/MapPicker.svelte";

    // "search" | "visibility" (for default initial source)
    export let mode = "search";

    // Optional explicit initial prefs object to override profile-based defaults
    export let initial = null;

    // External trigger: increment this from parent to run clearAll()
    export let clearSignal = 0;

    export let valid = true;

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
    $: basePrefs = initial
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
        // Default London at 5km if no profile location
        proximityLat = $profile?.latitude ?? 51.505;
        proximityLng = $profile?.longitude ?? -0.09;
        if (!proximityKm) {
            proximityKm = "5";
        }
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

{#if mode === "visibility"}
    <h3>Profile visibility</h3>
    <label class="visibility-toggle">
        <input
            type="checkbox"
            bind:checked={isVisible}
        />
        <span>
            Show my profile in other people's feeds
        </span>
    </label>
{/if}

{#if mode !== "visibility" || isVisible}
    <h3>Genders</h3>
    <div class="grid grid-3">
        <button
            type="button"
            class:selected={genders.includes("male")}
            on:click={() => toggleGender("male")}
        >
            Men
        </button>
        <button
            type="button"
            class:selected={genders.includes("female")}
            on:click={() => toggleGender("female")}
        >
            Women
        </button>
        <button
            type="button"
            class:selected={genders.includes("other")}
            on:click={() => toggleGender("other")}
        >
            Non-binary / Other
        </button>
    </div>

    <h3>Age range</h3>
    <div class="grid grid-2">
        <input
            type="number"
            min="18"
            max="150"
            placeholder="Min"
            value={ageMin}
            on:input={handleAgeMinChange}
        />
        <input
            type="number"
            min="18"
            max="150"
            placeholder="Max"
            value={ageMax}
            on:input={handleAgeMaxChange}
        />
    </div>
    {#if ageError}
        <p class="red">{ageError}</p>
    {/if}

    <h3>Countries</h3>
    <select multiple size="5" bind:value={countryIds}>
        {#each $allCountries as country}
            <option value={country.id}>
                {country.name}
            </option>
        {/each}
    </select>

    <h3>Proximity</h3>
    <p class="hint">Limit matches to people near a chosen location.</p>

    {#if proximityLat != null && proximityLng != null}
        <MapPicker
            lat={proximityLat}
            lng={proximityLng}
            radius={proximityKm ? Number(proximityKm) * 1000 : 0}
            mode="preview"
            defaultZoom={11}
            on:confirm={(e) => {
                proximityLat = e.detail.lat;
                proximityLng = e.detail.lng;
            }}
        />
        <button type="button" on:click={clearLocationFilter} style="margin-top: 0.5rem;">
            Clear location filter
        </button>

        <select
            id="proximity"
            bind:value={proximityKm}
            on:change={handleProximitySelect}
            style="margin-top: 0.5rem;"
        >
            <option value="">
                No limit
            </option>
            <option value="2">Within 2 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
            <option value="100">Within 100 km</option>
        </select>
    {:else}
        <button type="button" on:click={pickLocation}>
            Enable Proximity Filtering
        </button>
    {/if}
{/if}


<style>
    button.selected {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: #fff;
    }

    .hint {
        margin-bottom: 0.5rem;
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .visibility-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        font-size: 0.95rem;
    }

    .visibility-toggle input {
        width: 1.1rem;
        height: 1.1rem;
        cursor: pointer;
    }

    .visibility-toggle span {
        font-weight: 500;
    }
</style>
