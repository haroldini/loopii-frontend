
<script>
    import { onMount, onDestroy } from "svelte";
    import { get } from "svelte/store";
    import { goto } from "$app/navigation";
    import { profile } from "$lib/stores/profile.js";
    import {
        saveEdits, cancelEditing, startEditing,
        name, dob, gender, country, latitude, longitude, location, bio,
        selectedInterests, socials, username, audio,
        star_sign, mbti, loop_bio, looking_for,
        validationErrors, profileEditState, error,
        readyToSubmit, hasChanges,
        removeSocial, updateHandle
    } from "$lib/stores/editProfile.js";
    import { allCountries, allInterests, allPlatforms } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import ProfileFields from "$lib/components/ProfileFields.svelte";

    onMount(() => {
        startEditing();
        console.log("Editing profile:", get(profile));
    });

    function cancelEditingAndGoBack() {
        if (!get(hasChanges)) {
            cancelEditing();
            goto("/profile");
            return;
        }

        addToast({
            variant: "modal",
            text: "Discard your changes?",
            description: "You have unsaved changes. If you leave now, they will be lost.",
            autoHideMs: null,
            actions: [
                {
                    label: "Keep editing",
                    variant: "secondary",
                },
                {
                    label: "Discard changes",
                    variant: "danger",
                    onClick: () => {
                        cancelEditing();
                        goto("/profile");
                    },
                },
            ],
        });
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
        star_sign: $star_sign,
        mbti: $mbti,
        loop_bio: $loop_bio,
        looking_for: $looking_for,
        // If audio is marked for delete in this session, hide it in the UI
        audioUrl: $audio?.delete
            ? null
            : $profile?.audio?.url ?? null,
    };

    // cooldown timestamps passed into ProfileFields
    $: profileCooldowns = $profile
        ? {
              username: $profile.last_username_change_at,
              dob: $profile.last_dob_change_at,
              gender: $profile.last_gender_change_at,
              country: $profile.last_country_change_at,
          }
        : null;

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
        star_sign: (v) => star_sign.set(v),
        mbti: (v) => mbti.set(v),
        loop_bio: (v) => loop_bio.set(v),
        looking_for: (v) => looking_for.set(v),
        // payload: { blob, url, duration, mimeType } OR { delete: true }
        audio: (payload) => audio.set(payload),
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


<div class="page page--has-actionbar">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Edit Profile</h3>
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={cancelEditingAndGoBack}
                    disabled={$profileEditState === "saving"}
                >
                    {#if $hasChanges}
                        Discard Changes
                    {:else}
                        Back to Profile
                    {/if}
                </button>
            </div>
        </div>
    </header>

    <div class="content stack">
        {#if $profileEditState === "error"}
            <p class="red">{$error}</p>
        {/if}

        {#if $profileEditState === "idle"}
            <p class="hint">Loading profile…</p>
        {:else}
            <section class="card">
                <div class="section stack">
                    <h3>About You</h3>

                    <ProfileFields
                        fields={[
                            "name", "location", "bio",
                            {
                                key: "audio",
                                recordable: true,
                                maxDuration: 30,
                            }
                        ]}
                        values={fieldValues}
                        setters={fieldSetters}
                        errors={$validationErrors}
                    />
                </div>
            </section>

            <section class="card">
                <div class="section stack">
                    <h3>Help Others Discover You</h3>

                    <ProfileFields
                        fields={[
                            {
                                key: "map",
                                hint: "Select your approximate location to appear in location searches.",
                            },
                            "looking_for",
                            "star_sign",
                            "mbti",
                        ]}
                        values={fieldValues}
                        setters={fieldSetters}
                        errors={$validationErrors}
                    />
                </div>
            </section>

            <section class="card">
                <div class="section stack">
                    <h3>Your Interests</h3>

                    <ProfileFields
                        fields={["interests"]}
                        values={fieldValues}
                        setters={fieldSetters}
                        errors={$validationErrors}
                        allInterests={$allInterests}
                    />
                </div>
            </section>

            <section class="card">
                <div class="section stack">
                    <h3>What Your Loops See</h3>

                    <ProfileFields
                        fields={[
                            { key: "socials", label: "Social Media Links" },
                            "loop_bio"
                        ]}
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
            </section>

            <section class="card">
                <div class="section stack">
                    <h3>Your Essential Info</h3>
                    <p class="hint">These fields cannot be frequently changed.</p>

                    {#key JSON.stringify(profileCooldowns)}
                        <ProfileFields
                            fields={["username", "dob", "gender", "country"]}
                            values={fieldValues}
                            setters={fieldSetters}
                            errors={$validationErrors}
                            allCountries={$allCountries}
                            cooldowns={profileCooldowns}
                        />
                    {/key}
                </div>
            </section>
        {/if}
    </div>

    <div class="bar bar--actionbar">
        <div class="bar__inner">
            <div class="actionbar">
                <button
                    type="button"
                    class="btn btn--primary"
                    on:click={saveEdits}
                    disabled={$profileEditState === "saving" || !$readyToSubmit || !$hasChanges}
                >
                    {$profileEditState === "saving" ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </div>
    </div>
</div>
