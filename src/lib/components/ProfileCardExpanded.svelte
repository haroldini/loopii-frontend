
<script>
    import { interestMap, platformMap, countryMap } from "$lib/stores/app";
    import { buildSocialLink } from "$lib/utils/urls";
    import { getAvatarUrl } from "../utils/profile";
    import { timeAgo } from "$lib/utils/misc";

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


<div class="container">
    <button
    type="button"
    class={"bare card" + (onAvatarClick ? " clickableImg" : "")}
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
    }
    .card {
        width: 100%;
        aspect-ratio: 1;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        position: relative;
        border-radius: 1rem;
        overflow: hidden;
    }
    .bio {
        color: #555;
        font-size: 0.9rem;
    }
    .photo {
		width: 100%;
		height: auto;
		border-radius: 8px;
        pointer-events: none;
	}
    .clickableImg:hover {
        transform: scale(1.03);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    }

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
        background: #fafafa;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
        transition: background 0.2s ease;
    }

    .social-item:hover {
        background: #f0f0f0;
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
        background: #ccc;
        color: white;
        font-size: 0.8rem;
        border-radius: 4px;
    }

    .social-username {
        flex-grow: 1;
        text-decoration: none;
        color: #0070f3;
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
    }

    .copy-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 1rem;
        color: #666;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.2s ease, color 0.2s ease;
    }

    .copy-btn:hover {
        color: #000;
        background: rgba(0, 0, 0, 0.05);
    }


    .copy-url {
        color: #0070f3;
    }
    .copy-url:hover {
        background: rgba(0, 112, 243, 0.1);
    }

    .copy-handle {
        color: #888;
    }
    .copy-handle:hover {
        background: rgba(136, 136, 136, 0.1);
    }


    /* loop controls */
    .fav-btn {
        background: #f5f5f5;
        color: #b8860b;
    }
    .fav-btn.active {
        background: gold;
        color: black;
    }
    .fav-btn:hover {
        transform: scale(1.05);
    }

    .delete-btn {
        background: #f8e5e5;
        color: #a11;
    }
    .delete-btn:hover {
        background: #f2c9c9;
        transform: scale(1.05);
    }

</style>
