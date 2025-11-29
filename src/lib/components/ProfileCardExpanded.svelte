
<script>
    import {
        interestMap,
        platformMap,
        countryMap,
        GENDER_ICONS
    } from "$lib/stores/app.js";
    import { profile as profileStore } from "$lib/stores/profile.js";

    import AudioPicker from "$lib/components/AudioPicker.svelte";
    import { buildSocialLink } from "$lib/utils/urls.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import {
        timeAgo,
        distanceKm,
        formatLastSeenShort,
        formatNumber,
        formatStarSign,
        computeDistanceLabel
    } from "$lib/utils/misc.js";

    export let profile;
    export let onAvatarClick = null;
    export let loop = null;

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function toggleFav() {
        dispatch("toggleFav", { loopId: loop.id });
    }

    function unloop() {
        dispatch("unloop", { loopId: loop.id });
    }

    $: genderMeta =
        GENDER_ICONS[profile?.gender?.toLowerCase?.()] || GENDER_ICONS.other;

    $: displayName = profile?.name || profile?.username;
    $: hasSeparateUsername =
        profile?.name && profile?.username && profile.name !== profile.username;

    $: lastSeenDate = profile?.last_seen_at
        ? new Date(profile.last_seen_at)
        : null;

    $: isOnline =
        lastSeenDate &&
        Date.now() - lastSeenDate.getTime() <= 10 * 60 * 1000;

    $: distanceLabel = computeDistanceLabel(profile, $profileStore);

    $: metaItems = [];
    $: {
        metaItems = [];
        if (profile) {
            const countryName = $countryMap[profile.country_id]?.name;
            if (countryName) metaItems.push(countryName);

            if (profile.created_at) {
                metaItems.push(`Joined ${timeAgo(profile.created_at)}`);
            }

            if (distanceLabel) metaItems.push(distanceLabel);
        }
    }
</script>

<div class="container" style="padding: 0;">
    <button
        type="button"
        class={"bare card" + (onAvatarClick ? " clickableImg imageBtn bordered" : "")}
        style={`background-image: url('${getAvatarUrl(profile)}');`}
        on:click={() => onAvatarClick && onAvatarClick()}
        aria-label={onAvatarClick ? "Close expanded profile view" : "Profile photo"}
        disabled={!onAvatarClick}
    ></button>
</div>

<div class="container bordered header-card">
    <div class="header-main">
        <div class="header-left">
            <div class="header-left-top">
                <div class="top-left">
                    <h2 class="display-name">{displayName}</h2>

                    {#if profile.last_seen_at}
                        <div class="status-pill {isOnline ? 'online' : ''}">
                            <span class="status-dot"></span>
                            {#if isOnline}
                                <span>Online</span>
                            {:else}
                                <span>{formatLastSeenShort(lastSeenDate)}</span>
                            {/if}
                        </div>
                    {/if}
                </div>

                {#if hasSeparateUsername}
                    <p class="username">@{profile.username}</p>
                {/if}

                {#if profile.star_sign || profile.mbti}
                    <div class="traits-row">
                        {#if profile.star_sign}
                            <span class="trait-pill">
                                {formatStarSign(profile.star_sign)}
                            </span>
                        {/if}
                        {#if profile.mbti}
                            <span class="trait-pill">
                                {profile.mbti}
                            </span>
                        {/if}
                    </div>
                {/if}
            </div>

            {#if metaItems.length}
                <div class="meta-row">
                    <div class="meta-left">
                        {#each metaItems as item, i}
                            {#if i > 0}
                                <span class="meta-separator">•</span>
                            {/if}
                            <span class="meta-item">{item}</span>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <div class="header-right">
            <div class="right-top">
                <div class="top-right-main">
                    <span class="age">{profile.age}</span>

                    <span
                        class="gender-icon"
                        style={`--icon-url: url('${genderMeta.icon}'); background-color: ${genderMeta.color};`}
                    ></span>

                    {#if $countryMap[profile.country_id]?.flag_url}
                        <img
                            src={$countryMap[profile.country_id].flag_url}
                            alt="Country flag"
                            class="flag"
                        />
                    {/if}
                </div>

                {#if profile.location}
                    <p class="location location-right">
                        {profile.location}
                    </p>
                {/if}
            </div>

            {#if profile.audio?.url}
                <div class="voice-intro-inline">
                    <AudioPicker
                        audio={profile.audio.url}
                        maxDuration={30}
                        recordable={false}
                        disabled={false}
                        previewLabel="Voice intro"
                    />
                </div>
            {/if}
        </div>
    </div>
</div>

{#if profile.audio?.url || profile.bio || profile.looking_for || profile.interests?.length}
    <div class="container bordered">
        {#if profile.bio}
            <h4>Bio</h4>
            <p class="bio">{profile.bio}</p>
        {/if}

        {#if profile.looking_for}
            <h4>Looking for</h4>
            <p class="bio">{profile.looking_for}</p>
        {/if}

        {#if profile.interests?.length}
            <h4>Interests</h4>
            <div class="tags">
                {#each profile.interests as interestId}
                    <span class="tag">{$interestMap[interestId] || interestId}</span>
                {/each}
            </div>
        {/if}
    </div>
{/if}

{#if profile.loop_bio || profile.socials?.length}
    <div class="container bordered">
        <h3>Loops-only</h3>

        {#if profile.loop_bio}
            <h4>Loop bio</h4>
            <p class="bio">{profile.loop_bio}</p>
        {/if}

        {#if profile.socials?.length}
            <h4>Socials</h4>
            <div class="social-list">
                {#each profile.socials as social}
                    {#if buildSocialLink(social, $platformMap)}
                        {#if $platformMap[social.platform_id]}
                            <div
                                class="social-item"
                                role="button"
                                tabindex="0"
                                on:click={() => {
                                    const url = buildSocialLink(social, $platformMap);
                                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                                }}
                                on:keydown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        const url = buildSocialLink(social, $platformMap);
                                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                                    }
                                }}
                            >
                                <div class="social-icon">
                                    {#if $platformMap[social.platform_id].icon_url}
                                        <img
                                            src={$platformMap[social.platform_id].icon_url}
                                            alt={$platformMap[social.platform_id].name}
                                            loading="lazy"
                                        />
                                    {:else}
                                        <div class="social-icon-placeholder">
                                            {$platformMap[social.platform_id].name?.[0] || "?"}
                                        </div>
                                    {/if}
                                </div>

                                <span class="social-username">
                                    @{social.handle}
                                </span>

                                <div class="copy-buttons">
                                    <button
                                        class="copy-btn copy-url"
                                        title="Copy profile URL"
                                        on:click={(event) => {
                                            event.stopPropagation();
                                            const url = buildSocialLink(social, $platformMap);
                                            navigator.clipboard.writeText(url);
                                        }}
                                    >
                                        🌐
                                    </button>

                                    <button
                                        class="copy-btn copy-handle"
                                        title="Copy username"
                                        on:click={(event) => {
                                            event.stopPropagation();
                                            navigator.clipboard.writeText(social.handle);
                                        }}
                                    >
                                        @
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <div class="social-item">
                                <div class="social-icon-placeholder">?</div>
                                <span class="social-username">Unknown Platform</span>
                            </div>
                        {/if}
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
{/if}

{#if profile.images && profile.images.length > 1}
    <div class="container bordered">
        <h3>Photos</h3>
        {#each profile.images.filter(img => !img.is_avatar) as img}
            <div class="photo-section">
                <div class="photo-wrapper">
                    <img src={img.urls.medium} alt="" loading="lazy" class="photo" />
                </div>
                <div class="info-wrapper">
                    <p>{timeAgo(img.created_at)}</p>
                </div>
            </div>
        {/each}
    </div>
{/if}

{#if loop}
    <div class="container bordered">
        <p>Looped {timeAgo(loop.created_at)}</p>
        <nav>
            <button
                type="button"
                class="fav-btn"
                class:active={loop.is_favourite}
                aria-pressed={loop.is_favourite}
                on:click={toggleFav}
            >
                ★ {loop.is_favourite ? "Favourited" : "Favourite"}
            </button>

            <button
                type="button"
                class="delete-btn"
                on:click={unloop}
            >
                ✕ Remove Loop
            </button>
        </nav>
    </div>
{/if}

<style>
    .card {
        width: 100%;
        aspect-ratio: 1;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        position: relative;
        overflow: hidden;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .imageBtn {
        padding: 0;
        margin: 0;
        border: none;
        border-radius: 0;
    }

    .clickableImg:hover {
        transform: scale(1.02);
    }

    .header-card {
        text-align: left;
        align-items: stretch;
    }

    .header-main {
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        gap: 0.75rem;
        width: 100%;
    }

    .header-left {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .header-left-top {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 0;
    }

    .header-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.4rem;
        flex-shrink: 0;
    }

    .right-top {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
    }

    .top-left {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        flex: 1;
    }

    .top-right-main {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .voice-intro-inline {
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
        margin-top: auto;
    }

    .display-name {
        font-size: 1.4rem;
        line-height: 1.2;
        color: var(--text-1);
        word-break: break-word;
    }

    .username {
        font-size: 0.95rem;
        color: var(--text-muted);
    }

    .location {
        font-size: 0.9rem;
        color: var(--text-3);
        font-style: italic;
    }

    .location-right {
        text-align: right;
    }

    .traits-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .trait-pill {
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        background: var(--bg-2);
        border: 1px solid var(--border-2);
        font-size: 0.8rem;
        color: var(--text-2);
    }

    .meta-row {
        width: 100%;
        display: flex;
        justify-content: flex-start;
        margin-top: 0.35rem;
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .meta-left {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
    }

    .meta-item {
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
    }

    .meta-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 0.6rem;
        font-size: 0.75rem;
        color: var(--border-3);
    }

    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-muted);
        font-size: 0.8rem;
        width: fit-content;
    }

    .status-pill.online {
        background: rgba(76, 175, 80, 0.15);
        color: var(--green);
    }

    .status-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--text-muted);
    }

    .status-pill.online .status-dot {
        background: var(--green);
        box-shadow: 0 0 4px rgba(76, 175, 80, 0.8);
    }

    .age {
        font-weight: 600;
        color: var(--text-1);
        font-size: 1rem;
    }

    .flag {
        width: 1.2rem;
        height: auto;
        border-radius: 2px;
        box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
        object-fit: contain;
    }

    .gender-icon {
        display: inline-block;
        width: 1.1rem;
        height: 1.1rem;
        mask: var(--icon-url) no-repeat center / contain;
        -webkit-mask: var(--icon-url) no-repeat center / contain;
        background-color: var(--gender-color, white);
        opacity: 0.9;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .gender-icon:hover {
        opacity: 1;
        transform: scale(1.05);
    }

    h4 {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-2);
    }

    .bio {
        color: var(--text-secondary);
        font-size: 0.95rem;
        line-height: 1.4;
        text-align: left;
        width: 100%;
    }

    .tags {
        justify-content: center;
    }

    .photo-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .info-wrapper {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
        padding: 0 0.5rem;
        color: var(--text-secondary);
    }

    .photo {
        width: 100%;
        height: auto;
        pointer-events: none;
    }

    /* socials */

    .social-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.35rem;
        width: 100%;
        align-items: center;
    }

    .social-item {
        width: 100%;
        max-width: 360px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        background: var(--bg-2);
        border: 1px solid var(--border-2);
        border-radius: 0.5rem;
        transition: background 0.2s ease, border-color 0.2s ease;
        cursor: pointer;
    }

    .social-item:hover {
        background: var(--bg-hover);
        border-color: var(--border-3);
    }

    .social-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
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
        background: var(--bg-3);
        color: var(--text-2);
        font-size: 0.8rem;
        border-radius: 4px;
    }

    .social-username {
        flex-grow: 1;
        text-decoration: none;
        color: var(--accent-blue);
        font-weight: 500;
        word-break: break-all;
    }

    .social-username:hover {
        text-decoration: underline;
    }

    .copy-buttons {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-left: 0.75rem;
        flex-shrink: 0;
    }

    .copy-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 1rem;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.2s ease, color 0.2s ease;
        color: var(--text-muted);
    }

    .copy-btn:hover {
        background: var(--bg-3);
        color: var(--text-2);
    }

    .copy-url {
        color: var(--accent-blue);
    }

    .copy-url:hover {
        background: rgba(100, 181, 246, 0.15);
    }

    .copy-handle {
        color: var(--text-muted);
    }

    .copy-handle:hover {
        background: var(--bg-3);
    }

    .fav-btn {
        background: #f5f5a5;
        color: #b8860b;
        border: 1px solid #665c00;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .fav-btn.active {
        background: gold;
        color: black;
    }

    .fav-btn:hover {
        transform: scale(1.05);
        background: #fff176;
    }

    .delete-btn {
        background: #f8e5e5;
        color: #a11;
        border: 1px solid #440000;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .delete-btn:hover {
        background: #f2c9c9;
        transform: scale(1.05);
    }

    @media (max-width: 480px) {
        .header-main {
            flex-direction: column;
            align-items: stretch;
        }

        .header-right {
            align-items: flex-start;
        }

        .right-top {
            align-items: flex-start;
        }

        .location-right {
            text-align: left;
        }

        .voice-intro-inline {
            justify-content: flex-start;
            margin-top: 0.35rem;
        }
    }
</style>
