
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
    class="card"
    on:click={open}
    aria-label="Open profile details">
    <h2>{profile.name ?? profile.username}, {profile.age}</h2>
    <p>{profile.gender}</p>

    {#if profile.location}
        <p>{profile.location}</p>
    {/if}

    {#if profile.bio}
        <p class="bio">
            {profile.bio.length > 100 ? profile.bio.slice(0, 100) + "…" : profile.bio}
        </p>
    {/if}

    <div class="interests">
        {#each profile.interests as interestId}
            <span class="tag">{$interestMap[interestId] || interestId}</span>
        {/each}
    </div>
</button>


<style>
    .card {
        border: none;
        background: none;
        padding: 0;
        margin: 0;
        text-align: left;
        cursor: pointer;
        width: 100%;
    }

    .bio {
        color: #555;
    }

    .interests {
        margin-top: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .tag {
        background: #eee;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.8rem;
    }
</style>
