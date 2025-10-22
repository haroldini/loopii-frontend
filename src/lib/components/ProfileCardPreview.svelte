
<script>
    import { createEventDispatcher } from "svelte";
    import { getAvatarUrl } from "$lib/utils/profile";
    import { countryMap, GENDER_ICONS } from "$lib/stores/app";
    import { timeAgo } from "$lib/utils/misc";

    export let profile;
    export let isLoop = false;
    export let isFav = false;
    export let isSeen = false;
    export let loopDate = null;
    export let loopId = null;

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
        dispatch("toggleFav", { loopId });
    }
</script>


<div
    class="preview-card"
    role="button"
    tabindex="0"
    aria-label="Open profile preview"
    on:click={open}
    on:keydown={handleKey}
>
    <div class="avatar" style={`background-image: url('${getAvatarUrl(profile)}');`}>
        {#if isLoop && !isSeen}
            <span class="badge">New</span>
        {/if}
    </div>

    <div class="info">
        <div class="top-row">
            <span class="age">{profile.age}</span>
            <span class="gender-icon"
                style={`--icon-url: url('${gender_icon}'); background-color: ${gender_color};`}
            ></span>
            <span class="location">
                {#if $countryMap[profile.country_id]?.flag_url}
                    <img src={$countryMap[profile.country_id].flag_url} alt="Flag" class="flag" />
                {/if}
            </span>
        </div>

        {#if isLoop && loopDate}
            <div class="bottom-row">
                <p class="loop-date">Looped {timeAgo(loopDate)}</p>
                <button
                    type="button"
                    class="fav-btn"
                    class:active={isFav}
                    aria-pressed={isFav}
                    title={isFav ? "Remove favourite" : "Mark favourite"}
                    on:click={toggleFav}
                >
                    ★
                </button>
            </div>
        {/if}
    </div>
</div>


<style>
    .preview-card {
        display: flex;
        flex-direction: column;
        border: 1px solid #ddd;
        border-radius: 0.75rem;
        background: white;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        width: 100%;
        cursor: pointer;
        text-align: left;
    }
    .preview-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .preview-card:focus-visible {
        outline: 2px solid #0070f3;
        outline-offset: 2px;
    }

    .avatar {
        position: relative;
        background-size: cover;
        background-position: center;
        aspect-ratio: 1 / 1;
        border-bottom: 1px solid #eee;
    }

    /* --- New badge --- */
    .badge {
        position: absolute;
        bottom: 0.4rem;
        left: 0.4rem;
        background: #0070f3;
        color: white;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.2rem 0.5rem;
        border-radius: 0.4rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }

    /* --- Info --- */
    .info {
        padding: 0.5rem 0.75rem 0.6rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.4rem;
    }

    .top-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .bottom-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.25rem;
    }

    .loop-date {
        font-size: 0.75rem;
        color: #666;
        margin: 0;
    }

    /* --- Favourite button --- */
    .fav-btn {
        font-size: 1.1rem;
        background: none;
        border: none;
        color: rgba(255, 215, 0, 0.4);
        cursor: pointer;
        padding: 0;
        margin: 0;
        transition: color 0.15s ease, transform 0.15s ease;
    }
    .fav-btn:hover {
        color: rgba(255, 215, 0, 0.8);
        transform: scale(1.15);
    }
    .fav-btn.active {
        color: gold;
        text-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
    }
    .fav-btn:focus-visible {
        outline: 2px solid #0070f3;
        outline-offset: 1px;
    }

    /* --- Flag --- */
    .flag {
        width: 1rem;
        height: auto;
        border-radius: 2px;
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.2);
        object-fit: contain;
    }

    /* --- Gender icon --- */
    .gender-icon {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        mask: var(--icon-url) no-repeat center / contain;
        -webkit-mask: var(--icon-url) no-repeat center / contain;
        background-color: var(--gender-color, black);
        opacity: 0.85;
        margin: 0 0.25rem;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .gender-icon:hover {
        opacity: 1;
        transform: scale(1.05);
    }
</style>
