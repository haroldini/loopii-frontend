
<script>
    import MapPicker from "$lib/components/MapPicker.svelte";
    import AudioPicker from "$lib/components/AudioPicker.svelte";

    /**
     * fields: array of either:
     *  - "username"
     *  - "name"
     *  - "dob"
     *  - "gender"
     *  - "country"
     *  - "location"         (text input)
     *  - "map"              (lat/lng + MapPicker)
     *  - "bio"
     *  - "interests"
     *  - "socials"
     *  - "star_sign"        (dropdown)
     *  - "mbti"             (dropdown)
     *  - "loop_bio"         (text area, loops-only)
     *  - "looking_for"      (text area, visible to all)
     *  - "audio"            (voice intro)
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
    //   star_sign, mbti, loop_bio, looking_for,
    //   audioUrl,  // current profile audio URL (if any)
    // }
    export let values = {};

    // setters: functions keyed by field name:
    // {
    //   username: (v) => {},
    //   dob: (v) => {},
    //   latitude: (v) => {},
    //   interests: (arr) => {},
    //   star_sign: (v) => {},
    //   mbti: (v) => {},
    //   loop_bio: (v) => {},
    //   looking_for: (v) => {},
    //   audio: (payload) => {}, // { blob, url, duration, mimeType } OR { delete: true }
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

    // cooldown info, optional: map field key -> last change timestamp (ISO string or Date)
    // e.g. { username, dob, gender, country }
    export let cooldowns = null;

    // --- internal state for multi-selects ---
    let localInterests = [];

    // --- AudioPicker reset token ---
    let audioResetToken = 0;

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
        star_sign: "Star Sign",
        mbti: "Personality Type",
        loop_bio: "Loops-only Bio",
        looking_for: "What You're Looking For",
        audio: "Voice Intro",
    };

    const DAY_MS = 24 * 60 * 60 * 1000;

    // Must match backend cooldown periods:
    // USERNAME_COOLDOWN = timedelta(days=28)
    // DOB_COOLDOWN      = timedelta(days=182)
    // GENDER_COOLDOWN   = timedelta(days=28)
    // COUNTRY_COOLDOWN  = timedelta(days=28)
    const COOLDOWN_DURATIONS = {
        username: 28 * DAY_MS,
        dob: 182 * DAY_MS,
        gender: 28 * DAY_MS,
        country: 28 * DAY_MS,
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
        return (
            errors?.find(
                (e) =>
                    ["latitude", "longitude"].includes(e.field) &&
                    e.display
            ) || null
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

    function cooldownInfoMessage(fieldKey) {
        switch (fieldKey) {
            case "username":
                return "You can only change your username once every 28 days.";
            case "dob":
                return "You can only change your date of birth once every 6 months.";
            case "gender":
                return "You can only change your gender once every 28 days.";
            case "country":
                return "You can only change your country once every 28 days.";
            default:
                return "";
        }
    }

    // Mirrors backend logic:
    function computeCooldownState(fieldKey) {
        const duration = COOLDOWN_DURATIONS[fieldKey];

        // no cooldown config or not a cooldown-managed field
        if (!cooldowns || !duration) {
            return {
                managed: false,
                disabled: false,
                message: "",
            };
        }

        const raw = cooldowns[fieldKey];

        // no last-change info, but still show generic info about the limit
        if (!raw) {
            return {
                managed: true,
                disabled: false,
                message: cooldownInfoMessage(fieldKey),
            };
        }

        let lastChanged = null;

        if (raw instanceof Date) {
            lastChanged = raw;
        } else {
            const parsed = new Date(raw);
            if (!Number.isNaN(parsed.getTime())) {
                lastChanged = parsed;
            }
        }

        // fallback: unparsable date -> show generic info, do not disable
        if (!lastChanged) {
            return {
                managed: true,
                disabled: false,
                message: cooldownInfoMessage(fieldKey),
            };
        }

        const now = new Date();
        const until = new Date(lastChanged.getTime() + duration);

        if (now < until) {
            const formattedDate = until.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
            });

            return {
                managed: true,
                disabled: true,
                message: `You can't change this again until ${formattedDate}.`,
            };
        }

        return {
            managed: true,
            disabled: false,
            message: cooldownInfoMessage(fieldKey),
        };
    }

    const STAR_SIGNS = [
        "aries",      // Mar 21 – Apr 19
        "taurus",     // Apr 20 – May 20
        "gemini",     // May 21 – Jun 20
        "cancer",     // Jun 21 – Jul 22
        "leo",        // Jul 23 – Aug 22
        "virgo",      // Aug 23 – Sep 22
        "libra",      // Sep 23 – Oct 22
        "scorpio",    // Oct 23 – Nov 21
        "sagittarius",// Nov 22 – Dec 21
        "capricorn",  // Dec 22 – Jan 19
        "aquarius",   // Jan 20 – Feb 18
        "pisces",     // Feb 19 – Mar 20
    ];

    const MBTI_TYPES = [
        "ENFJ", "ENFP", "ENTJ", "ENTP",
        "ESFJ", "ESFP", "ESTJ", "ESTP",
        "INFJ", "INFP", "INTJ", "INTP",
        "ISFJ", "ISFP", "ISTJ", "ISTP",
    ];
</script>


<!-- TEMPLATE -->

<div class="profile-fields stack">
    {#each normalizedFields as field}
        {#if field.key === "username"}
            {@const cd = computeCooldownState("username")}
            <div class="field">
                <label class="field__label" for="username">{labelFor(field)}</label>
                <input
                    id="username"
                    value={values.username ?? ""}
                    required={isRequired(field)}
                    disabled={cd.disabled}
                    on:input={(e) => setters.username && setters.username(e.target.value)}
                />
                {#if errorMap.username}
                    <p class="field__error">{errorMap.username.message}</p>
                {/if}
                {#if cd.managed}
                    <p class="hint">{cd.message}</p>
                {/if}
            </div>

        {:else if field.key === "name"}
            <div class="field">
                <label class="field__label" for="name">{labelFor(field)}</label>
                <input
                    id="name"
                    value={values.name ?? ""}
                    on:input={(e) => setters.name && setters.name(e.target.value)}
                />
                {#if errorMap.name}
                    <p class="field__error">{errorMap.name.message}</p>
                {/if}
            </div>

        {:else if field.key === "dob"}
            {@const cd = computeCooldownState("dob")}
            <div class="field">
                <label class="field__label" for="dob">{labelFor(field)}</label>
                <input
                    id="dob"
                    type="date"
                    value={values.dob ?? ""}
                    required={isRequired(field)}
                    disabled={cd.disabled}
                    on:input={(e) => setters.dob && setters.dob(e.target.value)}
                />
                {#if errorMap.dob}
                    <p class="field__error">{errorMap.dob.message}</p>
                {/if}
                {#if cd.managed}
                    <p class="hint">{cd.message}</p>
                {/if}
            </div>

        {:else if field.key === "gender"}
            {@const cd = computeCooldownState("gender")}
            <div class="field">
                <label class="field__label" for="gender">{labelFor(field)}</label>
                <select
                    id="gender"
                    required={isRequired(field)}
                    value={values.gender ?? ""}
                    disabled={cd.disabled}
                    on:change={(e) => setters.gender && setters.gender(e.target.value)}
                >
                    <option value="" disabled>Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Non-Binary / Other</option>
                </select>
                {#if errorMap.gender}
                    <p class="field__error">{errorMap.gender.message}</p>
                {/if}
                {#if cd.managed}
                    <p class="hint">{cd.message}</p>
                {/if}
            </div>

        {:else if field.key === "country"}
            {@const cd = computeCooldownState("country")}
            <div class="field">
                <label class="field__label" for="country">{labelFor(field)}</label>
                <select
                    id="country"
                    required={isRequired(field)}
                    value={values.country ?? ""}
                    disabled={cd.disabled}
                    on:change={(e) => setters.country && setters.country(e.target.value)}
                >
                    <option value="" disabled>Select Country</option>
                    {#each allCountries as country}
                        <option value={country.id}>{country.name}</option>
                    {/each}
                </select>
                {#if errorMap.country}
                    <p class="field__error">{errorMap.country.message}</p>
                {/if}
                {#if cd.managed}
                    <p class="hint">{cd.message}</p>
                {/if}
            </div>

        {:else if field.key === "location"}
            <div class="field">
                <label class="field__label" for="location">{labelFor(field)}</label>
                <input
                    id="location"
                    value={values.location ?? ""}
                    on:input={(e) => setters.location && setters.location(e.target.value)}
                />
                {#if errorMap.location}
                    <p class="field__error">{errorMap.location.message}</p>
                {/if}
            </div>

        {:else if field.key === "bio"}
            <div class="field">
                <label class="field__label" for="bio">{labelFor(field)}</label>
                <textarea
                    id="bio"
                    on:input={(e) => setters.bio && setters.bio(e.target.value)}
                >{values.bio ?? ""}</textarea>
                {#if errorMap.bio}
                    <p class="field__error">{errorMap.bio.message}</p>
                {/if}
            </div>

        {:else if field.key === "map"}
            <div class="field">
                {#if field.label}
                    <label class="field__label" for="map">{field.label}</label>
                {:else}
                    <label class="field__label" for="map">Location</label>
                {/if}

                {#if field.hint}
                    <p class="hint">{field.hint}</p>
                {/if}

                {#if values.latitude != null && values.longitude != null}
                    <div class="field__control">
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
                    </div>

                    <div class="field__actions">
                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={() => {
                                setters.latitude && setters.latitude(null);
                                setters.longitude && setters.longitude(null);
                            }}
                        >
                            {field.clearLabel ?? "Clear Location"}
                        </button>
                    </div>
                {:else}
                    <button
                        type="button"
                        class="btn btn--primary"
                        on:click={() => {
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
                    <p class="field__error">
                        {(errorMap.latitude || errorMap.longitude).message}
                    </p>
                {/if}
            </div>

        {:else if field.key === "interests"}
            <div class="field">
                <label class="field__label" for="interests">{labelFor(field)}</label>
                <select
                    id="interests"
                    class="multiselect"
                    multiple
                    size="10"
                    bind:value={localInterests}
                    on:change={() => {
                        setters.interests && setters.interests([...localInterests]);
                    }}
                >
                    {#each allInterests as interest}
                        <option value={interest.id}>{interest.name}</option>
                    {/each}
                </select>
                {#if errorMap.interests}
                    <p class="field__error">{errorMap.interests.message}</p>
                {/if}
            </div>

        {:else if field.key === "socials"}
            <div class="field">
                {#if field.label}
                    <label class="field__label" for="socials">{field.label}</label>
                {:else}
                    <label class="field__label" for="socials">Social links</label>
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
                                            class="social-username-input"
                                            type="text"
                                            placeholder="username"
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
                                            class="btn btn--icon btn--ghost social-remove-btn"
                                            aria-label="Remove platform"
                                            on:click={() => onSocialRemove && onSocialRemove(i)}
                                        >
                                            −
                                        </button>
                                    </div>
                                </div>

                                {#if errorMap[`socials.${i}`]}
                                    <p class="field__error">{errorMap[`socials.${i}`].message}</p>
                                {/if}
                            {/if}
                        {/each}
                    </div>
                {/if}

                <select
                    id="socials"
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
            </div>

        {:else if field.key === "star_sign"}
            <div class="field">
                <label class="field__label" for="star_sign">{labelFor(field)}</label>
                <select
                    id="star_sign"
                    value={values.star_sign ?? ""}
                    on:change={(e) => setters.star_sign && setters.star_sign(e.target.value)}
                >
                    <option value="" disabled>Select Star Sign</option>
                    {#each STAR_SIGNS as sign}
                        <option value={sign}>
                            {sign.charAt(0).toUpperCase() + sign.slice(1)}
                        </option>
                    {/each}
                </select>
                {#if errorMap.star_sign}
                    <p class="field__error">{errorMap.star_sign.message}</p>
                {/if}
            </div>

        {:else if field.key === "mbti"}
            <div class="field">
                <label class="field__label" for="mbti">{labelFor(field)}</label>
                <select
                    id="mbti"
                    value={values.mbti ?? ""}
                    on:change={(e) => setters.mbti && setters.mbti(e.target.value)}
                >
                    <option value="" disabled>Select MBTI Type</option>
                    {#each MBTI_TYPES as type}
                        <option value={type}>{type}</option>
                    {/each}
                </select>
                {#if errorMap.mbti}
                    <p class="field__error">{errorMap.mbti.message}</p>
                {/if}
            </div>

        {:else if field.key === "loop_bio"}
            <div class="field">
                <label class="field__label" for="loop_bio">{labelFor(field)}</label>
                <textarea
                    id="loop_bio"
                    on:input={(e) => setters.loop_bio && setters.loop_bio(e.target.value)}
                >{values.loop_bio ?? ""}</textarea>
                {#if errorMap.loop_bio}
                    <p class="field__error">{errorMap.loop_bio.message}</p>
                {/if}
            </div>

        {:else if field.key === "looking_for"}
            <div class="field">
                <label class="field__label" for="looking_for">{labelFor(field)}</label>
                <textarea
                    id="looking_for"
                    on:input={(e) => setters.looking_for && setters.looking_for(e.target.value)}
                >{values.looking_for ?? ""}</textarea>
                {#if errorMap.looking_for}
                    <p class="field__error">{errorMap.looking_for.message}</p>
                {/if}
            </div>

        {:else if field.key === "audio"}
            <div class="field">
                <label class="field__label" for="audio">{labelFor(field)}</label>

                <AudioPicker
                    audio={values.audioUrl ?? null}
                    maxDuration={field.maxDuration ?? 30}
                    recordable={field.recordable ?? false}
                    disabled={field.disabled ?? false}
                    resetToken={audioResetToken}
                    on:recorded={(e) => {
                        setters.audio && setters.audio(e.detail);
                    }}
                />

                {#if values.audioUrl}
                    <div class="field__actions">
                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={() => {
                                setters.audio && setters.audio({ delete: true });
                                audioResetToken += 1;
                            }}
                        >
                            {field.clearLabel ?? "Remove Voice Intro"}
                        </button>
                    </div>
                {/if}

                {#if errorMap.audio}
                    <p class="field__error">{errorMap.audio.message}</p>
                {/if}
            </div>
        {/if}
    {/each}
</div>

<style>
    .socials-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .social-row {
        display: flex;
        align-items: center;
        gap: var(--space-2);

        background: var(--bg-hover);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-md);

        padding: var(--space-2);
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
        border-radius: var(--radius-sm);
    }

    .social-icon-placeholder {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;

        background: var(--border-color);
        color: var(--text-secondary);
        font-size: 0.8rem;

        border-radius: var(--radius-sm);
    }

    .social-preview {
        display: flex;
        align-items: center;
        gap: 0.25rem;

        flex: 1 1 auto;
        min-width: 0;

        font-size: 0.9rem;
        color: var(--text-secondary);
        overflow-wrap: anywhere;
    }

    .social-base {
        color: var(--text-muted);
        user-select: none;
        white-space: nowrap;
    }

    .social-username-input {
        width: 10rem;
        max-width: 100%;
        min-width: 5rem;

        padding: 0.2rem 0.35rem;

        border: 0;
        border-bottom: var(--border-width) solid var(--border-color);
        border-radius: 0;

        background: transparent;
        color: var(--text-secondary);
    }

    .social-username-input:focus {
        outline: none;
        border-bottom-color: var(--accent);
    }

    .social-remove-btn {
        color: var(--danger);
    }

    .social-remove-btn:hover {
        background: color-mix(in oklab, var(--danger) 12%, transparent);
    }
</style>
