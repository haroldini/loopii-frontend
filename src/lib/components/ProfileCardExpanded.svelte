
<script>
    import { interestMap, platformMap, countryMap } from "$lib/stores/app.js";
    import { buildSocialLink } from "$lib/utils/urls.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import { timeAgo } from "$lib/utils/misc.js";

    export let profile;
    export let onAvatarClick = null;

    // optional loop props
    export let loop = null;

    // bubble events back to the parent page
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function toggleFav() {
        dispatch("toggleFav", { loopId: loop.id });
    }

    function unloop() {
        dispatch("unloop", { loopId: loop.id });
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


<div class="container bordered">
    <h2>{profile.username}, {profile.age}{profile.gender[0].toUpperCase()}</h2>
    <p>
        {$countryMap[profile.country_id]?.name || profile.country_id}
    </p>
    {#if profile.name}
        <p>({profile.name})</p>
    {/if}


    {#if profile.latitude && profile.longitude}
        <p>{Math.round(profile.latitude * 100) / 100}, {Math.round(profile.longitude * 100) / 100}</p>
    {/if}
    {#if profile.location}
        <p>{profile.location}</p>
    {/if}
</div>


{#if profile.bio}
    <div class="container bordered">
        <h3>Bio</h3>
        <p class="bio">{profile.bio}</p>   
    </div>
{/if}
    

{#if profile.interests?.length}
    <div class="container bordered">
        <h3>Interests</h3>
        <div class="tags">
            {#each profile.interests as interestId}
                <span class="tag">{$interestMap[interestId] || interestId}</span>
            {/each}
        </div>
    </div>
{/if}


{#if profile.socials?.length}
    <div class="container bordered">
        <h3>Socials</h3>
        <div class="social-list">
            {#each profile.socials as social}
                {#if buildSocialLink(social, $platformMap)}
                    {#if $platformMap[social.platform_id]}
                        <div class="social-item">
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

                            <a
                                class="social-username"
                                href={buildSocialLink(social, $platformMap)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={buildSocialLink(social, $platformMap)}
                            >
                                @{social.handle}
                            </a>

                            <div class="copy-buttons">
                                <button
                                    class="copy-btn copy-url"
                                    title="Copy profile URL"
                                    on:click={() => {
                                        const url = buildSocialLink(social, $platformMap);
                                        navigator.clipboard.writeText(url);
                                    }}
                                >
                                    🌐
                                </button>

                                <button
                                    class="copy-btn copy-handle"
                                    title="Copy username"
                                    on:click={() => {
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


<!-- Loop controls -->
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
    /* ---------------- Photo Section ---------------- */
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

    /* ---------------- Avatar Card ---------------- */
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

    /* ---------------- Bio ---------------- */
    .bio {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    /* ---------------- Photos ---------------- */
    .photo {
        width: 100%;
        height: auto;
        pointer-events: none;
    }

    /* ---------------- Social List ---------------- */
    .social-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .social-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        transition: background 0.2s ease;
    }

    .social-item:hover {
        background: var(--surface-3);
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
        background: var(--surface-4);
        color: var(--text-primary);
        font-size: 0.8rem;
        border-radius: 4px;
    }

    .social-username {
        flex-grow: 1;
        text-decoration: none;
        color: var(--accent);
        font-weight: 500;
        word-break: break-all;
    }

    .social-username:hover {
        text-decoration: underline;
    }

    /* ---------------- Copy Buttons ---------------- */
    .copy-buttons {
        display: flex;
        align-items: center;
        gap: 0.35rem;
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
        color: var(--text-secondary);
    }

    .copy-btn:hover {
        background: var(--surface-3);
        color: var(--text-primary);
    }

    .copy-url {
        color: var(--accent);
    }
    .copy-url:hover {
        background: rgba(100, 181, 246, 0.15);
    }

    .copy-handle {
        color: var(--text-muted);
    }
    .copy-handle:hover {
        background: var(--surface-3);
    }

    /* ---------------- Loop Controls ---------------- */
    .fav-btn {
        background: #f5f5a5;      /* soft yellow */
        color: #b8860b;           /* golden text */
        border: 1px solid #665c00;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .fav-btn.active {
        background: gold;         /* bright yellow */
        color: black;
    }

    .fav-btn:hover {
        transform: scale(1.05);
        background: #fff176;      /* lighter yellow */
    }

    .delete-btn {
        background: #f8e5e5;      /* soft red */
        color: #a11;              /* deep red */
        border: 1px solid #440000;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .delete-btn:hover {
        background: #f2c9c9;      /* slightly stronger red */
        transform: scale(1.05);
    }
</style>


