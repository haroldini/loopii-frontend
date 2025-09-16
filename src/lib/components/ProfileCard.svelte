
<script>
    import { createEventDispatcher } from "svelte";
    import { interestMap, platformMap } from "$lib/stores/app";

    export let profile;
    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }
</script>


<button
    type="button"
    class="bare"
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
    .bio {
        color: #555;
        font-size: 0.9rem;
    }
</style>
