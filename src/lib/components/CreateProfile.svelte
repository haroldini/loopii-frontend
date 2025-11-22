
<script>
	import { onMount } from "svelte";
	import { get, writable } from "svelte/store";
	import { user, signOut } from "$lib/stores/auth.js";
	import { allCountries, allInterests, allPlatforms } from "$lib/stores/app.js";
	import { 
		username, name, dob, gender, country, bio, latitude, longitude, location, selectedInterests, socials, avatarUrl, avatarFile,
		error, readyToSubmit, validationErrors, currentPage,
		profileFormState, submitProfile, resetState, submissionProgress, avatarOriginalUrl, avatarCropState,
		updateHandle, removeSocial,
	} from "$lib/stores/createProfile.js";
	
	import MapPicker from "$lib/components/MapPicker.svelte";
	import ImagePicker from "$lib/components/ImagePicker.svelte";
	let avatarPicker;

</script>

<h1>loopii</h1>
<p>Logged in as {$user.email}</p>
<nav>
	<button on:click={signOut}>Log Out</button>
</nav>

{#if $profileFormState === "submitting"}
	<p>{$submissionProgress}...</p>

{:else if $profileFormState === "success"}
	<p class="green">Profile created successfully!</p>
	<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>

{:else if $profileFormState === "exists"}
	<p class="green">You already have a profile.</p>
	<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>

{:else if $profileFormState === "partial"}
	<p class="red">{$error}</p>
	<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>
	
{:else if $profileFormState === "error"}
	<p class="red">{$error}</p>
	<button on:click={resetState}>Try again</button>

{:else}

<form on:submit|preventDefault={submitProfile} style="width: 100%; display: flex; flex-direction: column; gap: 1rem;">

	{#if $currentPage === 0}
		<h3>Create your profile</h3>
		<label for="username">Username *</label>
		<input id="username" bind:value={$username} required />
		{#if $validationErrors.find(e => e.field === "username" && e.display)}
			<p class="red">
				{$validationErrors.find(e => e.field === "username" && e.display).message}
			</p>
		{/if}

		<label for="name">Display Name</label>
		<input id="name" bind:value={$name} />
		{#if $validationErrors.find(e => e.field === "name" && e.display)}
			<p class="red">
				{$validationErrors.find(e => e.field === "name" && e.display).message}
			</p>
		{/if}

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
			<button type="button" on:click={() => {
				if (typeof $avatarFile === "string" && $avatarFile.startsWith("blob:")) {
					try { URL.revokeObjectURL($avatarFile); } catch {}
				}
				avatarFile.set(null);
				avatarOriginalUrl.set(null);
				avatarCropState.set(null);
				avatarPicker.reset();
			}}>
				Clear Image
			</button>
		{:else}
			<button type="button" on:click={() => avatarPicker.open()}>
				Upload Image
			</button>
		{/if}
		{#if $validationErrors.find(e => e.field === "avatar" && e.display)}
			<p class="red">
				{$validationErrors.find(e => e.field === "avatar" && e.display).message}
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

		<nav>
			<button type="button" on:click={() => $currentPage = 1} disabled={!$readyToSubmit}>
				Continue →
			</button>
		</nav>
	{/if}

	{#if $currentPage === 1}
		<h3>Help others discover you</h3>

		<label for="">Location</label>
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
				$latitude = 51.505000;
				$longitude = -0.090000;
			}}>
				Pick Location
			</button>
		{/if}
		{#if $validationErrors.find(e => ["latitude", "longitude"].includes(e.field) && e.display)}
			<p class="red">
				{$validationErrors.find(e => ["latitude", "longitude"].includes(e.field) && e.display).message}
			</p>
		{/if}

		<label for="location">City</label>
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

		<label for="interests">Interests</label>
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

		<nav>
			<button type="button" on:click={() => $currentPage = 0}>← Back</button>
			<button type="button" on:click={() => $currentPage = 2} disabled={!$readyToSubmit}>Continue →</button>
		</nav>
	{/if}

	{#if $currentPage === 2}
		<h3>What your Loops see</h3>

		<label for="">Social Media Links</label>
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

		<nav>
			<button type="button" on:click={() => $currentPage = 1}>← Back</button>
			<button type="submit" disabled={$profileFormState === "submitting" || !$readyToSubmit}>
				{$profileFormState === "submitting" ? "Creating…" : "Create Profile"}
			</button>
		</nav>
	{/if}
</form>
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