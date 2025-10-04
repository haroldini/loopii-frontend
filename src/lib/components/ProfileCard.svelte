
<script>
    import { createEventDispatcher } from "svelte";
    import { interestMap, platformMap } from "$lib/stores/app";
    import { getAvatarUrl } from "../utils/profile";

    export let profile;
    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }
</script>

<button
    type="button"
    class="bare card"
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
    </div>
</button>


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
</style>
