
<script>
	import { onMount, onDestroy } from "svelte";
	import { get } from "svelte/store";
	import { user, signOut } from "$lib/stores/auth.js";
	import { allCountries, allInterests, allPlatforms } from "$lib/stores/app.js";
	import { 
		username, name, dob, gender, country, bio, loop_bio, looking_for,
		latitude, longitude, location, selectedInterests, socials, avatarUrl, avatarFile,
		error, readyToSubmit, validationErrors, currentPage, prefsState, 
		profileFormState, submitProfile, resetState, submissionProgress, avatarOriginalUrl, avatarCropState,
		updateHandle, removeSocial, usernameAvailability, ensureUsernameAvailable
	} from "$lib/stores/createProfile.js";

	import ImagePicker from "$lib/components/ImagePicker.svelte";
	import ProfileFields from "$lib/components/ProfileFields.svelte";
	import PrefsForm from "$lib/components/PrefsForm.svelte";
    import { goto } from "$app/navigation";

	let avatarPicker;

	onMount(() => {
		const unsubscribe = profileFormState.subscribe((state) => {
			if (state === "success" || state === "exists" || state === "partial") {
				goto("/");
			}
		});
		return unsubscribe;
	});

	// fallback message timer for loading app after profile creation
    let showFallback = false;
    let timer = null;
    $: if (["success", "partial", "exists"].includes($profileFormState)) {
        if (!timer) {
            timer = setTimeout(() => {
                showFallback = true;
            }, 3000);
        }
    }
    onDestroy(() => {
        if (timer) clearTimeout(timer);
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
		loop_bio: $loop_bio,
		looking_for: $looking_for,
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
		loop_bio: (v) => loop_bio.set(v),
		looking_for: (v) => looking_for.set(v),
		latitude: (v) => latitude.set(v),
		longitude: (v) => longitude.set(v),
		interests: (arr) => selectedInterests.set(arr),
	};

	// social add handler
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

	// PrefsForm state (onboarding search/visibility preferences)
	let prefsValid = true;

	function handlePrefsChange(event) {
		const payload = event.detail?.payload ?? null;
		const valid = event.detail?.valid ?? true;
		prefsState.set({ payload, valid });
	}

	$: prefsValid = $prefsState.valid;

	// Unique function for page 0 continue button to check username availability
    async function handlePage0Continue() {
        if (!$readyToSubmit) return;
        const ok = await ensureUsernameAvailable();
        if (!ok) return;
        $currentPage = 1;
    }

</script>


{#if $profileFormState === "submitting"}
    <p class="text-hint">{$submissionProgress}...</p>

{:else if ["success", "partial", "exists"].includes($profileFormState)}
    <p>Profile created. Loading app...</p>

    {#if showFallback}
        <p class="text-hint">
            Not loading?
            <button
                type="button"
                class="text-link"
                on:click={() => window.location.replace("/")}
            >
                Refresh
            </button>.
        </p>
    {/if}

{:else if $profileFormState === "error"}
    <p class="text-danger">{$error}</p>
    <button type="button" class="btn btn--primary" on:click={resetState}>Try again</button>

{:else}
    <form class="form" on:submit|preventDefault={submitProfile}>
        {#if $currentPage === 0}
            <h3>Create your profile</h3>

            <ProfileFields
                fields={["username"]}
                values={fieldValues}
                setters={fieldSetters}
                errors={$validationErrors}
            />

            {#if $usernameAvailability.state === "taken" || $usernameAvailability.state === "error"}
                <p class="text-danger">{$usernameAvailability.message}</p>
            {/if}

            <ProfileFields
                fields={["name"]}
                values={fieldValues}
                setters={fieldSetters}
                errors={$validationErrors}
            />

            <div class="field">
                <div class="field__label">Profile picture *</div>

                <div class="stack">
                    <ImagePicker
                        bind:this={avatarPicker}
                        initialOriginalUrl={$avatarOriginalUrl}
                        initialEditedUrl={$avatarUrl}
                        initialCropState={$avatarCropState}
                        on:confirm={(e) => {
                            avatarFile.set(e.detail.editedFile);
                            avatarOriginalUrl.set(e.detail.originalUrl);
                            avatarCropState.set(e.detail.cropState);
                        }}
                        on:back={() => {}}
                    />

                    {#if $avatarUrl}
                        <div class="actions actions--end">
                            <button
                                type="button"
                                class="btn btn--ghost"
                                on:click={() => {
                                    if (typeof $avatarFile === "string" && $avatarFile.startsWith("blob:")) {
                                        try { URL.revokeObjectURL($avatarFile); } catch {}
                                    }
                                    avatarFile.set(null);
                                    avatarOriginalUrl.set(null);
                                    avatarCropState.set(null);
                                    avatarPicker.reset();
                                }}
                            >
                                Clear image
                            </button>
                        </div>
                    {:else}
                        <button
                            type="button"
                            class="btn btn--primary btn--block"
                            on:click={() => avatarPicker.open()}
                        >
                            Select image
                        </button>
                    {/if}

                    {#if $validationErrors.find((e) => e.field === "avatar" && e.display)}
                        <p class="text-danger">
                            {$validationErrors.find((e) => e.field === "avatar" && e.display).message}
                        </p>
                    {/if}
                </div>
            </div>

            <ProfileFields
                fields={["dob", "gender", "country"]}
                values={fieldValues}
                setters={fieldSetters}
                errors={$validationErrors}
                allCountries={$allCountries}
            />

            <div class="form__actions">
                <button
                    type="button"
                    class="btn btn--primary btn--block"
                    on:click={handlePage0Continue}
                    disabled={!$readyToSubmit || $usernameAvailability.state === "checking"}
                >
                    {$usernameAvailability.state === "checking" ? "Checking username…" : "Continue"}
                </button>
            </div>
        {/if}

        {#if $currentPage === 1}
            <h3>Help others discover you</h3>

            <ProfileFields
                fields={[
                    {
                        key: "map",
                        hint: "Select your approximate location to appear in location searches.",
                    }
                ]}
                values={fieldValues}
                setters={fieldSetters}
                errors={$validationErrors}
            />

            <ProfileFields
                fields={["bio", "looking_for", "interests"]}
                values={fieldValues}
                setters={fieldSetters}
                errors={$validationErrors}
                allInterests={$allInterests}
            />

            <div class="row row--between">
                <button type="button" class="btn btn--ghost" on:click={() => ($currentPage = 0)}>
                    Back
                </button>

                <button type="button" class="btn btn--primary" on:click={() => ($currentPage = 2)} disabled={!$readyToSubmit}>
                    Continue
                </button>
            </div>
        {/if}

        {#if $currentPage === 2}
            <h3>What your loops see</h3>

            <ProfileFields
                fields={[{ key: "socials", label: "Social media links" }, "loop_bio"]}
                values={fieldValues}
                setters={fieldSetters}
                errors={$validationErrors}
                socials={$socials}
                allPlatforms={$allPlatforms}
                onSocialRemove={removeSocial}
                onSocialHandleChange={updateHandle}
                onSocialAdd={handleSocialAdd}
            />

            <div class="row row--between">
                <button type="button" class="btn btn--ghost" on:click={() => ($currentPage = 1)}>
                    Back
                </button>

                <button type="button" class="btn btn--primary" on:click={() => ($currentPage = 3)} disabled={!$readyToSubmit}>
                    Continue
                </button>
            </div>
        {/if}

        {#if $currentPage === 3}
            <h3>Your preferences</h3>
            <p class="text-hint">
                Choose who you see in your feed. We'll also only show your profile to genders you select.
            </p>

            <PrefsForm
                mode="search"
                on:change={handlePrefsChange}
                bind:valid={prefsValid}
                defaultLat={$latitude}
                defaultLng={$longitude}
            />

            <div class="row row--between">
                <button type="button" class="btn btn--ghost" on:click={() => ($currentPage = 2)}>
                    Back
                </button>

                <button
                    type="submit"
                    class="btn btn--primary"
                    disabled={$profileFormState === "submitting" || !$readyToSubmit || !prefsValid}
                >
                    {$profileFormState === "submitting" ? "Creating…" : "Create profile"}
                </button>
            </div>
        {/if}
    </form>
{/if}
