<script>
	import { onMount } from "svelte";
	import { get, writable } from "svelte/store";
	import { user, signOut } from "$lib/stores/auth";
	import { allCountries, allInterests, allPlatforms } from "$lib/stores/app";
	import { 
		username, name, dob, gender, country, bio, latitude, longitude, location, selectedInterests, socials,
		error, readyToSubmit, validationErrors, currentPage,
		profileFormState, submitProfile, resetState, removeSocial, updateLink, updateCustomPlatform
	} from "$lib/stores/createProfileForm";
	
	import MapPicker from "./MapPicker.svelte";

</script>

<h1>loopii</h1>
<p>Logged in as {$user.email}</p>
<nav>
	<button on:click={signOut}>Log Out</button>
</nav>

{#if $profileFormState === "submitting"}
	<p>Creating profile...</p>

{:else if $profileFormState === "success"}
	<p class="green">Profile created successfully!</p>
	<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>

{:else if $profileFormState === "exists"}
	<p class="green">You already have a profile.</p>
	<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>

{:else if $profileFormState === "error"}
	<p class="red">{$error}</p>
	<button on:click={resetState}>Try again</button>

{:else}

<form on:submit|preventDefault={submitProfile} style="width: 100%; display: flex; flex-direction: column; gap: 1rem;">

	{#if $currentPage === 0}
		<h3>Create your profile</h3>
		<label for="username">Username*</label>
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

		<label for="dob">Date of Birth*</label>
		<input id="dob" type="date" bind:value={$dob} required />
		{#if $validationErrors.find(e => e.field === "dob" && e.display)}
			<p class="red">
				{$validationErrors.find(e => e.field === "dob" && e.display).message}
			</p>
		{/if}

		<label for="gender">Gender*</label>
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

		<label for="country">Country*</label>
		<select id="country" bind:value={$country} required>
			<option value="" disabled>Select Country</option>
			{#each $allCountries as country}
				<option value={country.code}>{country.name}</option>
			{/each}
		</select>
		{#if $validationErrors.find(e => e.field === "country" && e.display)}
			<p class="red">
				{$validationErrors.find(e => e.field === "country" && e.display).message}
			</p>
		{/if}

		<label for="location">City</label>
		<input id="location" bind:value={$location} />
		{#if $validationErrors.find(e => e.field === "location" && e.display)}
			<p class="red">
				{$validationErrors.find(e => e.field === "location" && e.display).message}
			</p>
		{/if}

		<nav>
			<button type="button" on:click={() => $currentPage = 1} disabled={!$readyToSubmit}>
				Continue →
			</button>
		</nav>
	{/if}

	{#if $currentPage === 1}
		<h3>Help others find you</h3>

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

		<!-- Social Media Links UI -->
		<label for="">Social Media Links</label>
		{#if $socials.length > 0}
			<div class="socials-grid">
				{#each $socials as social, i}
					<div class="social-name">
						{#if social.platform_id}
							{social.name}
						{:else}
							<input
								type="text"
								placeholder="Platform"
								value={social.custom_platform || ""}
								on:input={(e) => updateCustomPlatform(i, e.target.value)}
								maxlength="30"
							/>
						{/if}
					</div>
					<div class="social-link">
						<input
							type="text"
							placeholder="Enter link"
							bind:value={social.link}
							on:input={(e) => updateLink(i, e.target.value)}
						/>
					</div>
					<div class="social-remove">
						<button type="button" on:click={() => removeSocial(i)}>−</button>
					</div>
					{#if $validationErrors.find(e => e.field === `socials.${i}`)}
						<p class="red" style="grid-column: 1 / -1;">
							{$validationErrors.find(e => e.field === `socials.${i}`).message}
						</p>
					{/if}
				{/each}
			</div>
		{/if}

		<div class="add-social">
			<select on:change={(e) => {
				if (e.target.value === "other") {
					socials.update(s => [
						...s,
						{ platform_id: null, name: null, custom_platform: "", link: "" }
					]);
				} else {
					const platform = $allPlatforms.find(p => p.id === e.target.value);
					if (platform) {
						socials.update(s => [
							...s,
							{ platform_id: platform.id, name: platform.name, custom_platform: null, link: "" }
						]);
					}
				}
				e.target.value = "";
			}}>
				<option value="">+ Add platform</option>
				{#each $allPlatforms as platform}
					<option value={platform.id}>{platform.name}</option>
				{/each}
				<option value="other">Other</option>
			</select>
		</div>

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


.socials-grid {
	display: grid;
	grid-template-columns: 100px 1fr auto;
	align-items: center;
	gap: 0.5rem 1rem;
}

.social-name {
	text-align: right;
}

.social-name input {
	width: 100%;
}

.social-link input {
	width: 100%;
}

.social-remove button {
	background: none;
	border: none;
	font-size: 1.2rem;
	cursor: pointer;
	color: #c00;
}

</style>