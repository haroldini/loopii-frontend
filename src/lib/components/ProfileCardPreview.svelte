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
    class="preview-card"
    role="button"
    tabindex="0"
    aria-label="Open profile preview"
    on:click={open}
    on:keydown={handleKey}
>
    <div class="avatar" style={`background-image: url('${getAvatarUrl(profile)}');`}>
        {#if loop && !loop.is_seen}
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

        {#if loop}
            <div class="bottom-row">
                <p class="loop-date">{timeAgo(loop.created_at)}</p>
                <button
                    type="button"
                    class="fav-btn"
                    class:active={loop.is_favourite}
                    aria-pressed={loop.is_favourite}
                    title={loop.is_favourite ? "Remove favourite" : "Mark favourite"}
                    on:click={toggleFav}
                >
                    ★
                </button>
                <button
                    type="button"
                    class="unloop-btn"
                    title="Remove loop"
                    on:click={unloop}
                >
                    ✕
                </button>
            </div>
        {/if}
    </div>
</div>


<style>
    .preview-card {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        background: var(--surface-2);
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        width: 100%;
        cursor: pointer;
        text-align: left;
        color: var(--text-primary);
    }

    .preview-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .preview-card:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    .avatar {
        position: relative;
        background-size: cover;
        background-position: center;
        aspect-ratio: 1 / 1;
        border-bottom: 1px solid var(--border);
    }

    .badge {
        position: absolute;
        bottom: 0.4rem;
        left: 0.4rem;
        background: var(--accent);
        color: white;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.2rem 0.5rem;
        border-radius: 0.4rem;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
    }

    .info {
        padding: 0.5rem 0.75rem 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .top-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-primary);
    }

    .bottom-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.25rem;
    }

    .loop-date {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin: 0;
    }

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
        text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    }

    .fav-btn:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
    }

    .unloop-btn {
        font-size: 1rem;
        background: none;
        border: none;
        color: #c33;
        cursor: pointer;
        padding: 0 0.25rem;
        margin-left: 0.35rem;
        opacity: 0.7;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .unloop-btn:hover {
        opacity: 1;
        transform: scale(1.15);
    }

    .unloop-btn:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
    }

    .flag {
        width: 1rem;
        height: auto;
        border-radius: 2px;
        box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
        object-fit: contain;
    }

    .gender-icon {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        mask: var(--icon-url) no-repeat center / contain;
        -webkit-mask: var(--icon-url) no-repeat center / contain;
        background-color: var(--gender-color, white);
        opacity: 0.85;
        margin: 0 0.25rem;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .gender-icon:hover {
        opacity: 1;
        transform: scale(1.05);
    }
</style>

