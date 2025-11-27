
<script>
    import { createEventDispatcher } from "svelte";
    import { interestMap, platformMap, countryMap } from "$lib/stores/app.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";

    export let profile;
    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }
</script>

<div class="container" style="padding: 0;">
    <button
        type="button"
        class="bare card clickableImg imageBtn bordered"
        style={`background-image: url('${getAvatarUrl(profile)}');`}
        on:click={open}
        aria-label="Open profile details">

        <div class="container">
            <h2>{profile.username}, {profile.age}{profile.gender[0].toUpperCase()}</h2>

            {#if profile.name}
                <p>({profile.name})</p>
            {/if}
            
            {#if profile.location}
                <p>{profile.location}</p>
            {/if}
        
            {#if profile.bio}
                <p class="bio">
                    {profile.bio.length > 100 ? profile.bio.slice(0, 100) + "…" : profile.bio}
                </p>
            {/if}
        
            <div class="tags">
                {#each profile.interests as interestId}
                    <span class="tag">{$interestMap[interestId] || interestId}</span>
                {/each}
            </div>

            <p>
                {$countryMap[profile.country_id]?.name || profile.country_id}
            </p>
        </div>
    </button>
</div>


<style>
    .card {
        width: 100%;
        aspect-ratio: 1;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        position: relative;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .imageBtn {
        padding: 0;
        margin: 0;
        border-radius: 0;
    }

    /* All text inside the overlayed container gets a shadow for readability */
    .container h2,
    .container p,
    .container .tag {
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        color: var(--text-primary);
    }

    /* Bio text (overlaid on image) */
    .bio {
        color: var(--text-secondary);
        font-size: 0.9rem;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
    }

    /* Hover zoom */
    .clickableImg:hover {
        transform: scale(1.02);
    }

    /* Tags follow global theme */
    .tag {
        background: var(--surface-3);
        color: var(--text-secondary);
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.8rem;
    }
</style>

