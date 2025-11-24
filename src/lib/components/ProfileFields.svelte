
<script>
    import MapPicker from "$lib/components/MapPicker.svelte";

    /**
     * fields: array of either:
     *  - "username"
     *  - "name"
     *  - "dob"
     *  - "gender"
     *  - "country"
     *  - "location"   (text input)
     *  - "map"        (lat/lng + MapPicker)
     *  - "bio"
     *  - "interests"
     *  - "socials"
     *
     * or objects:
     *  { key: "username", label?: "Username *", required?: true, hint?: "..." }
     */
    export let fields = [];

    // values: plain object of current values
    // {
    //   username, name, dob, gender, country,
    //   location, bio, latitude, longitude,
    //   interests, // array of interest IDs
    // }
    export let values = {};

    // setters: functions keyed by field name:
    // {
    //   username: (v) => {},
    //   dob: (v) => {},
    //   latitude: (v) => {},
    //   interests: (arr) => {},
    //   ...
    // }
    export let setters = {};

    // validation errors as you already use:
    // [{ field, message, display }, ...]
    export let errors = [];

    // lookups
    export let allCountries = [];
    export let allInterests = [];
    export let allPlatforms = [];

    // socials-specific hooks
    export let socials = [];
    export let onSocialRemove = null;          // (index) => void
    export let onSocialHandleChange = null;    // (index, handle) => void
    export let onSocialAdd = null;             // (platformId) => void

    // --- internal state for multi-selects ---
    let localInterests = [];

    // keep localInterests in sync with incoming values
    $: localInterests = values.interests ?? [];

    const defaultLabels = {
        username: "Username",
        name: "Display Name",
        dob: "Date of Birth",
        gender: "Gender",
        country: "Country",
        location: "Location",
        bio: "Bio",
        interests: "Interests",
        socials: "Social Media Links",
        map: "Location",
    };

    function isRequired(fieldCfg) {
        if (fieldCfg.required !== undefined) return fieldCfg.required;
        // sane defaults; override via field.required if you need
        return ["username", "dob", "gender", "country"].includes(fieldCfg.key);
    }

    function labelFor(fieldCfg) {
        const base = fieldCfg.label ?? defaultLabels[fieldCfg.key] ?? fieldCfg.key;
        const req = isRequired(fieldCfg);
        return req ? `${base} *` : base;
    }

    function firstErrorFor(fieldName) {
        return errors?.find((e) => e.field === fieldName && e.display);
    }

    function mapError() {
        return errors?.find(
            (e) =>
                ["latitude", "longitude"].includes(e.field) &&
                e.display
        );
    }

    // map of first displayable error per field
    let errorMap = {};
    $: {
        const map = {};
        if (errors && errors.length) {
            for (const e of errors) {
                if (!e.display) continue;
                if (!map[e.field]) {
                    map[e.field] = e;
                }
            }
        }
        errorMap = map;
    }

    $: normalizedFields = fields.map((f) =>
        typeof f === "string" ? { key: f } : f
    );
</script>


<!-- TEMPLATE -->


{#each normalizedFields as field}

    {#if field.key === "username"}
        <label for="username">{labelFor(field)}</label>
        <input
            id="username"
            value={values.username ?? ""}
            required={isRequired(field)}
            on:input={(e) => setters.username && setters.username(e.target.value)}
        />
        {#if errorMap.username}
            <p class="red">{errorMap.username.message}</p>
        {/if}

    {:else if field.key === "name"}
        <label for="name">{labelFor(field)}</label>
        <input
            id="name"
            value={values.name ?? ""}
            on:input={(e) => setters.name && setters.name(e.target.value)}
        />
        {#if errorMap.name}
            <p class="red">{errorMap.name.message}</p>
        {/if}

    {:else if field.key === "dob"}
        <label for="dob">{labelFor(field)}</label>
        <input
            id="dob"
            type="date"
            value={values.dob ?? ""}
            required={isRequired(field)}
            on:input={(e) => setters.dob && setters.dob(e.target.value)}
        />
        {#if errorMap.dob}
            <p class="red">{errorMap.dob.message}</p>
        {/if}

    {:else if field.key === "gender"}
        <label for="gender">{labelFor(field)}</label>
        <select
            id="gender"
            required={isRequired(field)}
            value={values.gender ?? ""}
            on:change={(e) => setters.gender && setters.gender(e.target.value)}
        >
            <option value="" disabled>Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Non-Binary / Other</option>
        </select>
        {#if errorMap.gender}
            <p class="red">{errorMap.gender.message}</p>
        {/if}

    {:else if field.key === "country"}
        <label for="country">{labelFor(field)}</label>
        <select
            id="country"
            required={isRequired(field)}
            value={values.country ?? ""}
            on:change={(e) => setters.country && setters.country(e.target.value)}
        >
            <option value="" disabled>Select Country</option>
            {#each allCountries as country}
                <option value={country.id}>{country.name}</option>
            {/each}
        </select>
        {#if errorMap.country}
            <p class="red">{errorMap.country.message}</p>
        {/if}

    {:else if field.key === "location"}
        <label for="location">{labelFor(field)}</label>
        <input
            id="location"
            value={values.location ?? ""}
            on:input={(e) => setters.location && setters.location(e.target.value)}
        />
        {#if errorMap.location}
            <p class="red">{errorMap.location.message}</p>
        {/if}

    {:else if field.key === "bio"}
        <label for="bio">{labelFor(field)}</label>
        <textarea
            id="bio"
            on:input={(e) => setters.bio && setters.bio(e.target.value)}
        >{values.bio ?? ""}</textarea>
        {#if errorMap.bio}
            <p class="red">{errorMap.bio.message}</p>
        {/if}

    {:else if field.key === "map"}
        {#if field.label}
            <h3>{field.label}</h3>
        {/if}
        {#if field.hint}
            <p class="hint">{field.hint}</p>
        {/if}

        {#if values.latitude != null && values.longitude != null}
            <MapPicker
                lat={values.latitude}
                lng={values.longitude}
                radius={1000}
                mode="preview"
                defaultZoom={11}
                on:confirm={(e) => {
                    setters.latitude && setters.latitude(e.detail.lat);
                    setters.longitude && setters.longitude(e.detail.lng);
                }}
            />
            <button
                type="button"
                on:click={() => {
                    setters.latitude && setters.latitude(null);
                    setters.longitude && setters.longitude(null);
                }}
            >
                {field.clearLabel ?? "Clear location"}
            </button>
        {:else}
            <button
                type="button"
                on:click={() => {
                    // default to London-ish if nothing yet
                    const lat = field.defaultLat ?? 51.505;
                    const lng = field.defaultLng ?? -0.09;
                    setters.latitude && setters.latitude(lat);
                    setters.longitude && setters.longitude(lng);
                }}
            >
                {field.pickLabel ?? "Pick Location"}
            </button>
        {/if}
        {#if errorMap.latitude || errorMap.longitude}
            <p class="red">
                {(errorMap.latitude || errorMap.longitude).message}
            </p>
        {/if}

    {:else if field.key === "interests"}
        <label for="interests">{labelFor(field)}</label>
        <select
            id="interests"
            multiple
            bind:value={localInterests}
            style="height: 200px;"
            on:change={() => {
                setters.interests && setters.interests([...localInterests]);
            }}
        >
            {#each allInterests as interest}
                <option value={interest.id}>{interest.name}</option>
            {/each}
        </select>
        {#if errorMap.interests}
            <p class="red">{errorMap.interests.message}</p>
        {/if}

    {:else if field.key === "socials"}
        {#if field.label}
            <label for="socials">{field.label}</label>
        {/if}

        {#if socials && socials.length > 0}
            <div class="socials-list">
                {#each socials as social, i}
                    {@const platform = allPlatforms.find((p) => p.id === social.platform_id)}
                    {#if platform}
                        {@const pattern = social.url_pattern || platform.url_pattern}
                        {@const parts = pattern ? pattern.split("{handle}") : ["", ""]}
                        {@const before = parts[0] ?? ""}
                        {@const after = parts[1] ?? ""}
                        <div class="social-row">
                            <div class="social-icon">
                                {#if platform.icon_url}
                                    <img src={platform.icon_url} alt={platform.name} loading="lazy" />
                                {:else}
                                    <div class="social-icon-placeholder">
                                        {platform.name?.[0] || "?"}
                                    </div>
                                {/if}
                            </div>

                            <div class="social-preview">
                                <span class="social-base">
                                    {before.replace(/^https?:\/\//, "")}
                                </span>
                                <input
                                    class="social-handle-input"
                                    type="text"
                                    placeholder="handle"
                                    value={social.handle || ""}
                                    maxlength="50"
                                    on:input={(e) =>
                                        onSocialHandleChange &&
                                        onSocialHandleChange(i, e.target.value)
                                    }
                                />
                                <span class="social-base">{after}</span>
                            </div>

                            <div class="social-remove">
                                <button
                                    type="button"
                                    on:click={() => onSocialRemove && onSocialRemove(i)}
                                >
                                    −
                                </button>
                            </div>
                        </div>

                        {#if errorMap[`socials.${i}`]}
                            <p class="red">
                                {errorMap[`socials.${i}`].message}
                            </p>
                        {/if}
                    {/if}
                {/each}
            </div>
        {/if}

        <select
            on:change={(e) => {
                const platformId = e.target.value;
                if (platformId && onSocialAdd) {
                    onSocialAdd(platformId);
                }
                e.target.value = "";
            }}
        >
            <option value="">+ Add platform</option>
            {#each allPlatforms as platform}
                <option value={platform.id}>{platform.name}</option>
            {/each}
        </select>
    {/if}
{/each}

<style>
    .hint {
        margin-bottom: 0.5rem;
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .socials-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .social-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: var(--bg-1);
        border: 1px solid var(--border-2);
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
    }

    .social-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .social-icon img {
        width: 24px;
        height: 24px;
        border-radius: 4px;
    }

    .social-icon-placeholder {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--border-3);
        color: var(--text-2);
        font-size: 0.8rem;
        border-radius: 4px;
    }

    .social-preview {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-grow: 1;
        font-size: 0.9rem;
        color: var(--text-2);
        word-break: break-all;
    }

    .social-base {
        color: var(--text-muted);
        user-select: none;
    }

    .social-handle-input {
        border: none;
        border-bottom: 1px solid var(--border-3);
        background: transparent;
        color: var(--text-2);
        font-size: 0.9rem;
        padding: 0.2rem 0.25rem;
        width: 150px;
        transition: border-color 0.2s ease;
    }

    .social-handle-input:focus {
        outline: none;
        border-color: var(--accent-blue);
    }

    .social-remove button {
        border: none;
        background: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: var(--red);
    }

    .social-remove button:hover {
        color: #900;
    }
</style>
