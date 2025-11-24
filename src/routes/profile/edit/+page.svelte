
<script>
    import { onMount, onDestroy } from "svelte";
    import { get } from "svelte/store";
    import { goto } from "$app/navigation";
    import { profile } from "$lib/stores/profile";
    import {
        saveEdits, cancelEditing, startEditing,
        name, dob, gender, country, latitude, longitude, location, bio,
        selectedInterests, socials, username,
        validationErrors, profileEditState, error, readyToSubmit, hasChanges,
        removeSocial, updateHandle
    } from "$lib/stores/editProfile.js";
    import { allCountries, allInterests, allPlatforms } from "$lib/stores/app.js";
    import ProfileFields from "$lib/components/ProfileFields.svelte";

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

    // values passed into ProfileFields
    $: fieldValues = {
        username: $username,
        name: $name,
        dob: $dob,
        gender: $gender,
        country: $country,
        location: $location,
        bio: $bio,
        latitude: $latitude,
        longitude: $longitude,
        interests: $selectedInterests,
    };

    // setters passed into ProfileFields
    const fieldSetters = {
        username: (v) => username.set(v),
        name: (v) => name.set(v),
        dob: (v) => dob.set(v),
        gender: (v) => gender.set(v),
        country: (v) => country.set(v),
        location: (v) => location.set(v),
        bio: (v) => bio.set(v),
        latitude: (v) => latitude.set(v),
        longitude: (v) => longitude.set(v),
        interests: (arr) => selectedInterests.set(arr),
    };

    // social add handler (was inline before)
    function handleSocialAdd(platformId) {
        const platform = get(allPlatforms).find((p) => p.id === platformId);
        if (!platform) return;

        socials.update((s) => [
            ...s,
            {
                platform_id: platform.id,
                name: platform.name,
                handle: "",
                url_pattern: platform.url_pattern,
            },
        ]);
    }
</script>


<svelte:head>
    <title>loopii • Edit Profile</title>
</svelte:head>


<div class="container bordered">
    <h3>Edit Profile</h3>

    {#if $profileEditState === "error"}
        <p class="red">{$error}</p>
    {/if}

    <nav>
        <button
            type="button"
            on:click={cancelEditingAndGoBack}
            disabled={$profileEditState === "saving"}
        >
            {#if $profileEditState === "editing" || $profileEditState === "saving"}
                Discard Changes
            {:else}
                Back to Profile
            {/if}
        </button>

        <button
            type="button"
            on:click={saveEdits}
            disabled={$profileEditState === "saving" || ! $readyToSubmit || ! $hasChanges}
        >
            {$profileEditState === "saving" ? "Saving..." : "Save Changes"}
        </button>
    </nav>
</div>

{#if $profileEditState === "idle"}
    <p>Loading profile...</p>
{:else}

    <div class="container bordered">
        <h3>Profile Details</h3>

        <ProfileFields
            fields={["name", "username", "dob", "gender", "country"]}
            values={fieldValues}
            setters={fieldSetters}
            errors={$validationErrors}
            allCountries={$allCountries}
        />
    </div>

    <div class="container bordered">
        <h3>About You</h3>

        <ProfileFields
            fields={["location", "bio"]}
            values={fieldValues}
            setters={fieldSetters}
            errors={$validationErrors}
        />
    </div>

    <div class="container bordered">
        <h3>Help others discover you</h3>

        <ProfileFields
            fields={[
                {
                    key: "map",
                    hint: "Select your approximate location to appear in proximity searches",
                    // optional overrides:
                    // clearLabel: "Clear location",
                    // pickLabel: "Pick Location",
                    // defaultLat: 51.505,
                    // defaultLng: -0.09,
                }
            ]}
            values={fieldValues}
            setters={fieldSetters}
            errors={$validationErrors}
        />
    </div>

    <div class="container bordered">
        <h3>Your Interests</h3>

        <ProfileFields
            fields={["interests"]}
            values={fieldValues}
            setters={fieldSetters}
            errors={$validationErrors}
            allInterests={$allInterests}
        />
    </div>

    <div class="container bordered">
        <h3>What your Loops see</h3>

        <ProfileFields
            fields={[{ key: "socials", label: "Social Media Links" }]}
            values={fieldValues}
            setters={fieldSetters}
            errors={$validationErrors}
            socials={$socials}
            allPlatforms={$allPlatforms}
            onSocialRemove={removeSocial}
            onSocialHandleChange={updateHandle}
            onSocialAdd={handleSocialAdd}
        />
    </div>

{/if}
