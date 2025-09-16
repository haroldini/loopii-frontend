
<script>
    import { interestMap, platformMap } from "$lib/stores/app";

    export let profile;
    export let onBack;
</script>


<div class="expanded">
    <header class="header">
        <button
            type="button"
            class="back-btn"
            on:click={onBack}
            aria-label="Back to profile preview">
            ← Back
        </button>
    </header>

    <h2>{profile.name ?? profile.username}, {profile.age}</h2>
    <p>{profile.gender}</p>

    {#if profile.location}
        <p>{profile.location}</p>
    {/if}

    {#if profile.bio}
        <p class="bio">{profile.bio}</p>
    {/if}

    <div class="interests">
        {#each profile.interests as interestId}
            <span class="tag">{$interestMap[interestId] || interestId}</span>
        {/each}
    </div>

    <p>Latitude: {profile.latitude}</p>
    <p>Longitude: {profile.longitude}</p>

    {#if profile.socials?.length}
        <div class="socials">
            <h3>Socials</h3>
            {#each profile.socials as social}
                <p>{ $platformMap[social.platform_id] || social.platform_id }: {social.handle}</p>
            {/each}
        </div>
    {/if}
</div>


<style>
    .expanded {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
    }

    .back-btn {
        border: none;
        border-radius: 0.5rem;
        background: #eee;
        cursor: pointer;
        padding: 0.5rem 1rem;
        font-size: 1rem;
    }

    .bio {
        margin: 1rem 0;
    }

    .interests {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-bottom: 1rem;
    }

    .tag {
        background: #eee;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.8rem;
    }

    .socials {
        margin-top: 1rem;
    }
</style>
