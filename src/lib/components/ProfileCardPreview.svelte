
<script>
    import { createEventDispatcher } from "svelte";
    import Icon from "@iconify/svelte";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import { countryMap, GENDER_ICONS, UI_ICONS } from "$lib/stores/app.js";
    import { timeAgo } from "$lib/utils/misc.js";

    export let profile;
    export let loop = null;
    export let decision = null;
    export let showActions = true;

    const dispatch = createEventDispatcher();

    $: genderKey = profile?.gender?.toLowerCase?.() || "other";
    $: genderIcon = GENDER_ICONS[genderKey] || GENDER_ICONS.other;
    $: username = profile?.username ? `@${profile.username}` : "";
    $: createdAt = loop?.created_at || decision?.created_at || null;

    function open() {
        dispatch("expand");
    }

    function handleKey(e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
        }
    }

    function toggleFav(e) {
        e.stopPropagation();
        if (!loop) return;
        dispatch("toggleFav", { loopId: loop.id });
    }

    function unloop(e) {
        e.stopPropagation();
        if (!loop) return;
        dispatch("unloop", { loopId: loop.id });
    }

    function acceptRequest(e) {
        e.stopPropagation();
        if (!decision) return;
        dispatch("accept", { decision, profile });
    }

    function declineRequest(e) {
        e.stopPropagation();
        if (!decision) return;
        dispatch("decline", { decision, profile });
    }
</script>


<div
    class="profile-preview card ui-pressable"
    role="button"
    tabindex="0"
    aria-label="Open profile preview"
    on:click={open}
    on:keydown={handleKey}
>
    <div class="profile-preview__media" style={`background-image: url('${getAvatarUrl(profile)}');`}>
        {#if loop && !loop.is_seen}
            <span class="tag profile-preview__badge">New</span>
        {/if}
    </div>

    <div class="profile-preview__info">
        <div class="profile-preview__top">
            <span class="profile-preview__age">{profile.age}</span>
            <div class="profile__header-right-main">
                <Icon
                    icon={genderIcon}
                    class={"gender-icon--" + genderKey}
                />
    
                {#if $countryMap[profile.country_id]?.flag_icon}
                    <Icon
                        icon={$countryMap[profile.country_id].flag_icon}
                        class="profile-flag"
                    />
                {/if}
            </div>
        </div>
        

        <h3 class="profile-preview__username">{username}</h3>

        {#if loop && showActions}
            <div class="profile-preview__bottom">
                <p class="profile-preview__date">Looped {timeAgo(loop.created_at, true)}</p>

                <div class="icon-btn-row">
                    <button
                        type="button"
                        class={"btn btn--circle icon-btn--fav" + (loop.is_favourite ? " is-active" : "")}
                        aria-pressed={loop.is_favourite}
                        title={loop.is_favourite ? "Remove favourite" : "Mark favourite"}
                        on:click|stopPropagation={toggleFav}
                    >
                        {#if loop.is_favourite}
                            <Icon icon={UI_ICONS.starFilled} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.star} class="btn__icon" />
                        {/if}
                    </button>

                    <button
                        type="button"
                        class="btn btn--circle btn--danger"
                        title="Remove loop"
                        on:click|stopPropagation={unloop}
                    >
                        <Icon icon={UI_ICONS.close} class="btn__icon" />
                    </button>
                </div>
            </div>
        {:else if decision && showActions}
            <div class="profile-preview__bottom u-space-above">
                <div class="profile-preview__actions u-space-above">
                    <button
                        type="button"
                        class="btn btn--danger btn--round"
                        on:click|stopPropagation={declineRequest}
                        >
                        <Icon icon={UI_ICONS.close} class="btn__icon" />
                    </button>
                    <button
                        type="button"
                        class="btn btn--success btn--round"
                        on:click|stopPropagation={acceptRequest}
                        >
                        <Icon icon={UI_ICONS.heart} class="btn__icon" />
                    </button>
                </div>
            </div>
            <p class="profile-preview__date text-center u-space-above">Requested {timeAgo(decision.created_at)}</p>
        {/if}
    </div>
</div>
