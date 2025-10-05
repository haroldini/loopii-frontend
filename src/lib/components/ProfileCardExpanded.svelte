
<script>
    import { interestMap, platformMap, countryMap } from "$lib/stores/app";
    import { buildSocialLink } from "$lib/utils/urls";
    import { getAvatarUrl } from "../utils/profile";

    export let profile;
</script>


<div 
    class="card center" 
    style={`background-image: url('${getAvatarUrl(profile)}');`}>
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
        <div class="tags">
        {#each profile.socials as social}
            {#if buildSocialLink(social, $platformMap)}
                <span 
                    class="tag clickable"
                    role="button"
                    tabindex="0"
                    on:click={() =>
                        window.open(buildSocialLink(social, $platformMap), "_blank", "noopener,noreferrer")
                    }
                    on:keydown={(e) =>
                        e.key === "Enter" && window.open(buildSocialLink(social, $platformMap), "_blank", "noopener,noreferrer")
                    }
                >
                    { social.custom_platform || $platformMap[social.platform_id]?.name || "Unknown" }
                </span>
            {/if}
        {/each}
        </div>
    </div>
{/if}


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
    .container p {
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }
    .bio {
        color: #555;
        font-size: 0.9rem;
    }
</style>
