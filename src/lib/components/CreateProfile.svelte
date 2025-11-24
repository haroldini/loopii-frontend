
<script>
	import { onMount, onDestroy } from "svelte";
	import { get } from "svelte/store";
	import { user, signOut } from "$lib/stores/auth.js";
	import { allCountries, allInterests, allPlatforms } from "$lib/stores/app.js";
	import { 
		username, name, dob, gender, country, bio, latitude, longitude, location, selectedInterests, socials, avatarUrl, avatarFile,
		error, readyToSubmit, validationErrors, currentPage,
		profileFormState, submitProfile, resetState, submissionProgress, avatarOriginalUrl, avatarCropState,
		updateHandle, removeSocial,
	} from "$lib/stores/createProfile.js";

	import ImagePicker from "$lib/components/ImagePicker.svelte";
	import ProfileFields from "$lib/components/ProfileFields.svelte";

	let avatarPicker;

	onMount(() => {
		const unsubscribe = profileFormState.subscribe((state) => {
			if (state === "success" || state === "exists" || state === "partial") {
				window.location.replace(window.location.origin);
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
</script>

<h1>loopii</h1>

{#if $profileFormState !== "submitting"}
	<p>Logged in as {$user.email}</p>
	<nav>
		<button on:click={signOut}>Log Out</button>
	</nav>
{/if}

{#if $profileFormState === "submitting"}
	<p>{$submissionProgress}...</p>

{:else if ["success", "partial", "exists"].includes($profileFormState)}
    <p>Profile created. Loading app...</p>
    {#if showFallback}
		<p>Not loading? Click
			<span
				role="button"
				tabindex="0"
				on:click={() => location.reload()}
				on:keydown={(e) => e.key === "Enter" && location.reload()}
				class="button blue"
			>
				here
			</span> to refresh.
		</p>
    {/if}

{:else if $profileFormState === "error"}
	<p class="red">{$error}</p>
	<button on:click={resetState}>Try again</button>

{:else}


<form on:submit|preventDefault={submitProfile} style="width: 100%; display: flex; flex-direction: column; gap: 1rem;">

	{#if $currentPage === 0}
		<h3>Create your profile</h3>

		<!-- Username + Display Name -->
		<ProfileFields
			fields={["username", "name"]}
			values={fieldValues}
			setters={fieldSetters}
			errors={$validationErrors}
		/>

		<!-- Avatar Picker // Always mounted so external controls work -->
		<label for="avatar">Profile Picture *</label>
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
			on:back={() => {
				// User hit back without confirming – do nothing
			}}
		/>

		{#if $avatarUrl}
			<button
				type="button"
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
				Clear Image
			</button>
		{:else}
			<button type="button" on:click={() => avatarPicker.open()}>
				Upload Image
			</button>
		{/if}
		{#if $validationErrors.find((e) => e.field === "avatar" && e.display)}
			<p class="red">
				{$validationErrors.find((e) => e.field === "avatar" && e.display).message}
			</p>
		{/if}

		<!-- DOB / Gender / Country -->
		<ProfileFields
			fields={["dob", "gender", "country"]}
			values={fieldValues}
			setters={fieldSetters}
			errors={$validationErrors}
			allCountries={$allCountries}
		/>

		<nav>
			<button type="button" on:click={() => $currentPage = 1} disabled={!$readyToSubmit}>
				Continue →
			</button>
		</nav>
	{/if}

	{#if $currentPage === 1}
		<h3>Help others discover you</h3>

		<!-- Map (lat/lng picker) -->
		<ProfileFields
			fields={[
				{
					key: "map",
					hint: "Select your approximate location to appear in proximity searches",
					// optional overrides if needed later:
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

		<!-- City / Bio / Interests -->
		<ProfileFields
			fields={["location", "bio", "interests"]}
			values={fieldValues}
			setters={fieldSetters}
			errors={$validationErrors}
			allInterests={$allInterests}
		/>

		<nav>
			<button type="button" on:click={() => $currentPage = 0}>← Back</button>
			<button type="button" on:click={() => $currentPage = 2} disabled={!$readyToSubmit}>Continue →</button>
		</nav>
	{/if}

	{#if $currentPage === 2}
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

		<nav>
			<button type="button" on:click={() => $currentPage = 1}>← Back</button>
			<button type="submit" disabled={$profileFormState === "submitting" || !$readyToSubmit}>
				{$profileFormState === "submitting" ? "Creating…" : "Create Profile"}
			</button>
		</nav>
	{/if}
</form>
{/if}
