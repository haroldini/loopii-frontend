
<script>
	import { onDestroy, tick } from "svelte";
    import { get } from "svelte/store";
    import Icon from "@iconify/svelte";
	import { allCountries, allInterests, allPlatforms, UI_ICONS } from "$lib/stores/app.js";
	import { 
		username, name, dob, gender, country, bio, loop_bio, looking_for,
		latitude, longitude, location, selectedInterests, socials, avatarUrl, avatarFile,
		error, readyToSubmit, validationErrors, currentPage, prefsState, 
		profileFormState, submitProfile, resetState, avatarOriginalUrl, avatarCropState,
		updateHandle, removeSocial, usernameAvailability, ensureUsernameAvailable
	} from "$lib/stores/createProfile.js";

	import ImagePicker from "$lib/components/ImagePicker.svelte";
	import ProfileFields from "$lib/components/ProfileFields.svelte";
	import PrefsForm from "$lib/components/PrefsForm.svelte";

	let avatarPicker;


    // ----- Does page have changes? For "skip" button -----

    let lastSnapshotPage = null;
    let pageSnapshots = {
        1: null,
        2: null,
    };

    function cloneValue(v) {
        try {
            return structuredClone(v);
        } catch {
            if (Array.isArray(v)) return v.slice();
            if (v && typeof v === "object") return { ...v };
            return v;
        }
    }

    function valuesEqual(a, b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        if (typeof a === "number" && typeof b === "number") {
            return Math.abs(a - b) < 1e-6;
        }

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((x, i) => valuesEqual(x, b[i]));
        }

        if (typeof a === "object" && typeof b === "object") {
            try {
                return JSON.stringify(a) === JSON.stringify(b);
            } catch {
                return false;
            }
        }

        return a === b;
    }

    function snapshotForPage(page) {
        if (page === 1) {
            return {
                latitude: cloneValue($latitude),
                longitude: cloneValue($longitude),
                location: cloneValue($location),
                bio: cloneValue($bio),
                looking_for: cloneValue($looking_for),
                interests: cloneValue($selectedInterests),
            };
        }

        if (page === 2) {
            return {
                socials: cloneValue($socials),
                loop_bio: cloneValue($loop_bio),
            };
        }

        return null;
    }

    function pageHasChanges(page) {
        const snap = pageSnapshots[page];
        if (!snap) return true;

        const now = snapshotForPage(page);
        if (!now) return true;

        return Object.keys(snap).some((k) => !valuesEqual(now[k], snap[k]));
    }

    $: if (($currentPage === 1 || $currentPage === 2) && $currentPage !== lastSnapshotPage) {
        lastSnapshotPage = $currentPage;

        void (async () => {
            await tick();
            pageSnapshots[$currentPage] = snapshotForPage($currentPage);
        })();
    }

    $: page1CtaLabel =
        $currentPage === 1 && $readyToSubmit && !pageHasChanges(1)
            ? "Skip"
            : "Continue";

    $: page2CtaLabel =
        $currentPage === 2 && $readyToSubmit && !pageHasChanges(2)
            ? "Skip"
            : "Continue";


    // ----- Other logic -----

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
        currentPage.set(1);
    }

</script>


{#if ["success", "partial", "exists"].includes($profileFormState)}
    <Icon icon={UI_ICONS.animLoading} class="icon--large" />
    <p class="text-center">Loading app...</p>

    {#if showFallback}
        <p class="text-hint text-center">
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
    <button type="button" class="btn btn--primary" on:click={resetState}>
        <Icon icon={UI_ICONS.refresh} class="btn__icon"/> Try again
    </button>

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
                        title="Profile picture"
                        hint="Upload a profile picture to help others recognize you."
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
                                class="btn btn--danger"
                                on:click={() => avatarPicker.replaceImage()}
                            >
                                <Icon icon={UI_ICONS.imageReplace} class="btn__icon"/><span class="btn__label"> Replace</span>
                            </button>
                            <button
                                type="button"
                                class="btn btn--danger"
                                on:click={() => {
                                    avatarFile.set(null);
                                    avatarOriginalUrl.set(null);
                                    avatarCropState.set(null);
                                    avatarPicker.reset();
                                }}
                            >
                                <Icon icon={UI_ICONS.imageRemove} class="btn__icon"/><span class="btn__label"> Remove</span>
                            </button>
                        </div>
                    {:else}
                        <button
                            type="button"
                            class="btn btn--block"
                            on:click={() => avatarPicker.open()}
                        >
                            <Icon icon={UI_ICONS.imageAdd} class="btn__icon"/> Select image
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
                    class:is-loading={$usernameAvailability.state === "checking"}
                    disabled={!$readyToSubmit || $usernameAvailability.state === "checking"}
                    on:click={handlePage0Continue}
                    >
                    <span class="btn__label">Continue</span>
                    <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                    <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
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
                <button type="button" class="btn btn--ghost btn--block" on:click={() => ($currentPage = 0)}>
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon"/> <span class="btn__label">Back</span>
                </button>
                
                <button type="button" class="btn btn--primary btn--block" on:click={() => ($currentPage = 2)} disabled={!$readyToSubmit}>
                    <span class="btn__label">{page1CtaLabel}</span> <Icon icon={UI_ICONS.arrowRight} class="btn__icon"/>
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
                <button type="button" class="btn btn--ghost btn--block" on:click={() => ($currentPage = 1)}>
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon"/><span class="btn__label"> Back</span>
                </button>

                <button type="button" class="btn btn--primary btn--block" on:click={() => ($currentPage = 3)} disabled={!$readyToSubmit}>
                    <span class="btn__label">{page2CtaLabel}</span><Icon icon={UI_ICONS.arrowRight} class="btn__icon"/>
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
                initial={$prefsState.payload}
                on:change={handlePrefsChange}
                bind:valid={prefsValid}
                defaultLat={Number.isFinite($latitude) ? $latitude : 51.505}
                defaultLng={Number.isFinite($longitude) ? $longitude : -0.09}
            />

            <div class="row row--between">
                <button type="button" class="btn btn--ghost btn--block" on:click={() => ($currentPage = 2)}>
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon"/><span class="btn__label">Back</span>
                </button>

                <button
                    type="submit"
                    class="btn btn--primary btn--block"
                    class:is-loading={$profileFormState === "submitting"}
                    disabled={$profileFormState === "submitting" || !$readyToSubmit || !prefsValid}
                    >
                    <span class="btn__label">Create profile</span>
                    <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                    <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                </button>
            </div>
        {/if}
    </form>
{/if}
