
<script>
    import { interestMap, platformMap } from "$lib/stores/app";

    export let profile;
    export let onBack;
</script>


<nav>
    <button
        type="button"
        on:click={onBack}
        aria-label="Back to profile preview">
        ← Back
    </button>
</nav>

<h2>{profile.username}, {profile.age}{profile.gender[0].toUpperCase()}</h2>
{#if profile.name}
    <p>({profile.name})</p>
{/if}

{#if profile.location}
    <p>{profile.location}</p>
{/if}

{#if profile.latitude && profile.longitude}
    <p>{Math.round(profile.latitude * 100) / 100}, {Math.round(profile.longitude * 100) / 100}</p>
{/if}

{#if profile.bio}
    <p class="bio">{profile.bio}</p>
{/if}

{#if profile.interests?.length}
    <h3>Interests</h3>
    <div class="tags">
        {#each profile.interests as interestId}
            <span class="tag">{$interestMap[interestId] || interestId}</span>
        {/each}
    </div>
{/if}

{#if profile.socials?.length}
    <h3>Socials</h3>
    <div class="tags">
    {#each profile.socials as social}
        <a 
            class="tag" 
            href={social.link} 
            target="_blank" 
            rel="noopener noreferrer"
        >
            { $platformMap[social.platform_id] || social.platform_id }
        </a>
    {/each}
    </div>
{/if}


<style>
    .bio {
        color: #555;
        font-size: 0.9rem;
    }
</style>
