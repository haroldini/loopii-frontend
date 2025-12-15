
<script>
    import { createEventDispatcher } from "svelte";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import { countryMap, GENDER_ICONS } from "$lib/stores/app.js";
    import { timeAgo } from "$lib/utils/misc.js";

    export let profile;
    export let loop = null; // just take the loop

    const { icon: gender_icon, color: gender_color } =
        GENDER_ICONS[profile.gender?.toLowerCase()] || GENDER_ICONS.other;

    const dispatch = createEventDispatcher();


    // Open expanded profile view // emit event to parent
    function open() {
        dispatch("expand");
    }

    function handleKey(e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
        }
    }

    // Toggle favourite status // emit event to parent
    function toggleFav(event) {
        event.stopPropagation();
        dispatch("toggleFav", { loopId: loop.id });
    }

    // Unloop profile // emit event to parent
    function unloop(event) {
        event.stopPropagation();
        dispatch("unloop", { loopId: loop.id });
    }

</script>


<div
    class="profile-preview card profile-surface pressable"
    role="button"
    tabindex="0"
    aria-label="Open profile preview"
    on:click={open}
    on:keydown={handleKey}
>
    <div class="profile-preview__media" style={`background-image: url('${getAvatarUrl(profile)}');`}>
        {#if loop && !loop.is_seen}
            <span class="profile-preview__badge">New</span>
        {/if}
    </div>

    <div class="profile-preview__info">
        <div class="profile-preview__top">
            <span>{profile.age}</span>

            <span
                class="gender-icon"
                style={`--icon-url: url('${gender_icon}'); --icon-color: ${gender_color};`}
            ></span>

            {#if $countryMap[profile.country_id]?.flag_url}
                <img
                    src={$countryMap[profile.country_id].flag_url}
                    alt="Country flag"
                    class="profile-flag"
                />
            {/if}
        </div>

        {#if loop}
            <div class="profile-preview__bottom">
                <p class="profile-preview__date">{timeAgo(loop.created_at)}</p>

                <div class="icon-btn-row">
                    <button
                        type="button"
                        class={"icon-btn icon-btn--fav" + (loop.is_favourite ? " is-active" : "")}
                        aria-pressed={loop.is_favourite}
                        title={loop.is_favourite ? "Remove favourite" : "Mark favourite"}
                        on:click|stopPropagation={toggleFav}
                    >
                        ★
                    </button>

                    <button
                        type="button"
                        class="icon-btn icon-btn--danger"
                        title="Remove loop"
                        on:click|stopPropagation={unloop}
                    >
                        ✕
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
