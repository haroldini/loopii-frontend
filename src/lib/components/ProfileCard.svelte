
<script>
    import { createEventDispatcher } from "svelte";
    import { interestMap, platformMap, countryMap } from "$lib/stores/app";
    import { getAvatarUrl } from "../utils/profile";

    export let profile;
    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }
</script>

<div class="container">
    <button
        type="button"
        class="bare card clickableImg"
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
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        position: relative;
        border-radius: 1rem;
        overflow: hidden;
    }
    .container h2,
    .container p,
    .container .tag {
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }

    .bio {
        color: #555;
        font-size: 0.9rem;
    }

    .clickableImg:hover {
        transform: scale(1.03);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    }
</style>
