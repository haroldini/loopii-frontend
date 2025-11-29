
<script>
    import { createEventDispatcher } from "svelte";
    import { interestMap, countryMap, GENDER_ICONS } from "$lib/stores/app.js";
    import { profile as profileStore } from "$lib/stores/profile.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import {
        timeAgo,
        formatLastSeenShort,
        computeDistanceLabel
    } from "$lib/utils/misc.js";

    export let profile;

    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }

    function handleKey(e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
        }
    }

    $: genderMeta =
        GENDER_ICONS[profile?.gender?.toLowerCase?.()] || GENDER_ICONS.other;

    $: visibleInterests = profile?.interests?.slice?.(0, 10) || [];
    $: extraInterestCount = Math.max(
        (profile?.interests?.length || 0) - visibleInterests.length,
        0
    );

    $: lastSeenDate = profile?.last_seen_at
        ? new Date(profile.last_seen_at)
        : null;

    $: isOnline =
        lastSeenDate &&
        Date.now() - lastSeenDate.getTime() <= 10 * 60 * 1000;

    $: distanceLabel = computeDistanceLabel(profile, $profileStore);

    $: displayName = profile?.name || profile?.username;
    $: hasSeparateUsername =
        profile?.name && profile?.username && profile.name !== profile.username;

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

<div
    class="container bordered profile-card"
    role="button"
    tabindex="0"
    aria-label="Open profile"
    on:click={open}
    on:keydown={handleKey}
>
    <div
        class="avatar"
        style={`background-image: url('${getAvatarUrl(profile)}');`}
    ></div>

    <div class="summary">
        <div class="summary-row top-row">
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

            <div class="top-right">
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
        </div>

        {#if hasSeparateUsername}
            <p class="username">@{profile.username}</p>
        {/if}

        {#if profile.bio}
            <p class="bio">
                {#if profile.bio.length > 160}
                    {profile.bio.slice(0, 160)}…
                {:else}
                    {profile.bio}
                {/if}
            </p>
        {/if}

        {#if visibleInterests.length}
            <div class="tags">
                {#each visibleInterests as interestId}
                    <span class="tag">
                        {$interestMap[interestId] || interestId}
                    </span>
                {/each}
                {#if extraInterestCount > 0}
                    <span class="tag more">+{extraInterestCount} more</span>
                {/if}
            </div>
        {/if}

        {#if metaItems.length}
            <div class="meta-row">
                {#each metaItems as item, i}
                    {#if i > 0}
                        <span class="meta-separator">•</span>
                    {/if}
                    <span class="meta-item">{item}</span>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .profile-card {
        padding: 0;
        gap: 0;
        align-items: stretch;
        cursor: pointer;
        overflow: hidden;
        border-radius: 0;
        background: var(--bg-2);
        border-color: var(--border-3);
        transition: background 0.15s ease;
        text-align: left;
    }

    .profile-card:hover {
        background: var(--bg-hover);
    }

    .profile-card:focus-visible {
        outline: 2px solid var(--accent-blue);
        outline-offset: 2px;
    }

    .avatar {
        position: relative;
        background-size: cover;
        background-position: center;
        aspect-ratio: 1 / 1;
        width: 100%;
        border-bottom: 1px solid var(--border-3);
    }

    .summary {
        padding: 1rem 1.1rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
    }

    .summary-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .top-left {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        flex: 1;
    }

    .top-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
        flex-shrink: 0;
    }

    .top-right-main {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .display-name {
        font-size: 1.35rem;
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

    .bio {
        font-size: 0.95rem;
        color: var(--text-3);
        line-height: 1.4;
        margin-top: 0.15rem;
    }

    .tags {
        width: 100%;
        justify-content: flex-start;
        margin-top: 0.1rem;
        row-gap: 0.35rem;
    }

    .tag {
        font-size: 0.85rem;
        padding: 0.3rem 0.6rem;
    }

    .tag.more {
        opacity: 0.8;
    }

    .meta-row {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-start;
        gap: 0.35rem;
        margin-top: 0.3rem;
        font-size: 0.85rem;
        color: var(--text-muted);
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

    @media (max-width: 480px) {
        .top-right {
            align-items: flex-start;
        }
        .location-right {
            text-align: left;
        }
    }
</style>
