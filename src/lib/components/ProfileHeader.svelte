
<script>
    import { onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { profile as profileStore } from "$lib/stores/profile.js";
    import { UI_ICONS, countryMap, GENDER_ICONS } from "$lib/stores/app.js";

    import AudioPicker from "$lib/components/AudioPicker.svelte";

    import {
        timeAgo,
        distanceKm,
        formatLastSeenShort,
        formatNumber,
        formatStarSign,
        computeDistanceLabel
    } from "$lib/utils/profile.js";

    export let profile;

    $: genderKey = profile?.gender?.toLowerCase?.() || "other";
    $: genderIcon = GENDER_ICONS[genderKey] || GENDER_ICONS.other;

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
        }
    }

</script>

<!-- Template -->

<div class="profile__header-main">
    <div class="profile__header-left">
        <div class="profile__header-top-left">
            {#if profile.last_seen_at}
                <div class={"pill " + (isOnline ? "pill--online" : "")}>
                    {#if isOnline}
                        <Icon icon={UI_ICONS.online} class="btn__icon" />
                        <span class="pill__label">Online</span>
                    {:else}
                        <Icon icon={UI_ICONS.offline} class="btn__icon" />
                        <span class="pill__label">{formatLastSeenShort(lastSeenDate)}</span>
                    {/if}
                </div>
            {/if}
            <h2 class="text-heading">{displayName}</h2>

            {#if hasSeparateUsername}
                <p class="text-muted">@{profile.username}</p>
            {/if}
        </div>


        {#if profile.star_sign || profile.mbti}
            <div class="tags">
                {#if profile.star_sign}
                    <span class="tag">{formatStarSign(profile.star_sign)}</span>
                {/if}
                {#if profile.mbti}
                    <span class="tag">{profile.mbti}</span>
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

    <div class="profile__header-right">
        <div class="profile__right-top">
            <div class="profile__header-right-main">
                <span class="text-fw-semibold">{profile.age}</span>
                <Icon
                    icon={genderIcon}
                    class={"gender-icon--" + genderKey}
                />
                {#if $countryMap[profile.country_id]?.flag_icon}
                    <Icon icon={$countryMap[profile.country_id].flag_icon} />
                {/if}
            </div>

            {#if profile.location}
                <p class="text-muted text-italic">{profile.location}</p>
            {/if}

            {#if distanceLabel}
                <p class="text-accent text-fw-semibold">{distanceLabel}</p>
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