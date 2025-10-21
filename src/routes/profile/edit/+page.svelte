
<script>
	import { onMount, onDestroy } from "svelte";
	import { get } from "svelte/store";
	import { goto } from "$app/navigation";
	import { profile } from "$lib/stores/profile";
	import {
		saveEdits, cancelEditing, startEditing,
		name, dob, gender, country, latitude, longitude, location, bio, selectedInterests, socials, username,
		validationErrors, profileEditState, error, readyToSubmit,
        removeSocial, updateHandle
	} from "$lib/stores/editProfile";
	import { allCountries, allInterests, allPlatforms } from "$lib/stores/app";
	import ImagePicker from "$lib/components/ImagePicker.svelte";
	import MapPicker from "$lib/components/MapPicker.svelte";

	let imagePicker;

	onMount(() => {
		startEditing();
		console.log("Editing profile:", get(profile));
	});

	function cancelEditingAndGoBack() {
		cancelEditing();
		goto("/profile");
	}

    onDestroy(() => {
        cancelEditing();
    });

</script>


<svelte:head>
    <title>loopii • Edit Profile</title>
</svelte:head>


<div class="container bordered">
	<h3>Edit Profile</h3>

	<nav>
        <button type="button" on:click={cancelEditingAndGoBack}>
            {#if $profileEditState === "editing"}
                Discard Changes
            {:else if $profileEditState === "saving"}
                Saving...
            {:else}
                Back to Profile
            {/if}
        </button>

		<button
			type="button"
			on:click={saveEdits}
			disabled={$profileEditState === "saving" || ! $readyToSubmit}
		>
			{$profileEditState === "saving" ? "Saving..." : "Save Changes"}
		</button>
	</nav>
</div>


{#if $profileEditState === "idle"}
    <p>Loading profile...</p>

{:else if $profileEditState === "success"}
    <p class="green">Profile updated successfully!</p>
    <button type="button" on:click={() => goto("/profile")}>
        Back to profile
    </button>

{:else if $profileEditState === "error"}
    <p class="red">Error updating profile: {$error}</p>
    <button type="button" on:click={() => $profileEditState = "editing"}>
        Try Again
    </button>


{:else if $profileEditState === "saving"}
    <p>Saving profile...</p>

{:else if $profileEditState === "editing"}

<div class="container bordered">

    <h3>Profile Details</h3>

    <label for="name">Display Name</label>
    <input id="name" bind:value={$name} />

    {#if $validationErrors.find(e => e.field === "name" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "name" && e.display).message}
        </p>
    {/if}

    <label for="username">Username *</label>
    <input id="username" bind:value={$username} required />
    {#if $validationErrors.find(e => e.field === "username" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "username" && e.display).message}
        </p>
    {/if}

    <label for="dob">Date of Birth *</label>
    <input id="dob" type="date" bind:value={$dob} required />
    {#if $validationErrors.find(e => e.field === "dob" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "dob" && e.display).message}
        </p>
    {/if}

    <label for="gender">Gender *</label>
    <select id="gender" bind:value={$gender} required>
        <option value="" disabled>Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Non-Binary / Other</option>
    </select>
    {#if $validationErrors.find(e => e.field === "gender" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "gender" && e.display).message}
        </p>
    {/if}

    <label for="country">Country *</label>
    <select id="country" bind:value={$country} required>
        <option value="" disabled>Select Country</option>
        {#each $allCountries as country}
            <option value={country.id}>{country.name}</option>
        {/each}
    </select>
    {#if $validationErrors.find(e => e.field === "country" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "country" && e.display).message}
        </p>
    {/if}

</div>

<div class="container bordered">
    <h3>About You</h3>

    <label for="location">Location</label>
    <input id="location" bind:value={$location} />
    {#if $validationErrors.find(e => e.field === "location" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "location" && e.display).message}
        </p>
    {/if}

    <label for="bio">Bio</label>
    <textarea id="bio" bind:value={$bio}></textarea>
    {#if $validationErrors.find(e => e.field === "bio" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "bio" && e.display).message}
        </p>
    {/if}
</div>

<div class="container bordered">
    <h3>Help others discover you</h3>
    <p>Select your approximate location to appear in proximity searches</p>
    {#if $latitude && $longitude}
        <MapPicker
            lat={$latitude}
            lng={$longitude}
            radius={2500}
            mode="preview"
            defaultZoom={11}
            on:confirm={(e) => {
                $latitude = e.detail.lat;
                $longitude = e.detail.lng;
            }}
        />
        <button type="button" on:click={() => { $latitude = null; $longitude = null; }}>
            Clear location
        </button>
    {:else}
        <button type="button" on:click={() => {
            $latitude = 51.505;
            $longitude = -0.09;
        }}>
            Pick Location
        </button>
    {/if}
    {#if $validationErrors.find(e => ["latitude", "longitude"].includes(e.field) && e.display)}
        <p class="red">
            {$validationErrors.find(e => ["latitude", "longitude"].includes(e.field) && e.display).message}
        </p>
    {/if}

</div>

<div class="container bordered">
    <h3>Your Interests</h3>

    <select id="interests" multiple bind:value={$selectedInterests} style="height: 200px;">
    {#each $allInterests as interest}
        <option value={interest.id}>{interest.name}</option>
    {/each}
    </select>
    {#if $validationErrors.find(e => e.field === "interests" && e.display)}
        <p class="red">
            {$validationErrors.find(e => e.field === "interests" && e.display).message}
        </p>
    {/if}
</div>

<div class="container bordered">
    <h3>What your Loops see</h3>

    {#if $socials.length > 0}
        <div class="socials-list">
            {#each $socials as social, i}
                {@const platform = $allPlatforms.find(p => p.id === social.platform_id)}
                {#if platform}
                    {@const pattern = social.url_pattern || platform.url_pattern}
                    {@const [before, after] = pattern ? pattern.split("{handle}") : ["", ""]}
                    <div class="social-row">
                        <div class="social-icon">
                            {#if platform.icon_url}
                                <img src={platform.icon_url} alt={platform.name} loading="lazy" />
                            {:else}
                                <div class="social-icon-placeholder">
                                    {platform.name?.[0] || "?"}
                                </div>
                            {/if}
                        </div>

                        <div class="social-preview">
                            <span class="social-base">
                                {before.replace(/^https?:\/\//, "")}
                            </span>
                            <input
                                class="social-handle-input"
                                type="text"
                                placeholder="handle"
                                value={social.handle || ""}
                                on:input={(e) => updateHandle(i, e.target.value)}
                                maxlength="50"
                            />
                            <span class="social-base">{after}</span>
                        </div>

                        <div class="social-remove">
                            <button type="button" on:click={() => removeSocial(i)}>−</button>
                        </div>
                    </div>

                    {#if $validationErrors.find(e => e.field === `socials.${i}` && e.display)}
                        <p class="red">{$validationErrors.find(e => e.field === `socials.${i}`).message}</p>
                    {/if}
                {/if}
            {/each}
        </div>
    {/if}

    <select
        on:change={(e) => {
            const platform = $allPlatforms.find(p => p.id === e.target.value);
            if (platform) {
                socials.update(s => [
                    ...s,
                    {
                        platform_id: platform.id,
                        name: platform.name,
                        handle: "",
                        url_pattern: platform.url_pattern
                    }
                ]);
            }
            e.target.value = "";
        }}
    >
        <option value="">+ Add platform</option>
        {#each $allPlatforms as platform}
            <option value={platform.id}>{platform.name}</option>
        {/each}
    </select>
</div>

{/if}


<style>
    .socials-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .social-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: #fafafa;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
    }

    .social-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
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

    .social-preview {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-grow: 1;
        font-size: 0.9rem;
        color: #444;
        word-break: break-all;
    }

    .social-base {
        color: #777;
        user-select: none;
    }

    .social-handle-input {
        border: none;
        border-bottom: 1px solid #aaa;
        background: transparent;
        font-size: 0.9rem;
        padding: 0.2rem 0.25rem;
        width: 150px;
        transition: border-color 0.2s ease;
    }

    .social-handle-input:focus {
        outline: none;
        border-color: #0070f3;
    }

    .social-remove button {
        border: none;
        background: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: #c00;
    }

    .social-remove button:hover {
        color: #900;
    }
</style>