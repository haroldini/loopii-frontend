<script>
	import { onMount } from "svelte";
	import { get, writable } from "svelte/store";
	import { user, signOut } from "$lib/stores/auth";
	import { 
		allInterests, allCountries, allPlatforms,
		username, name, dob, gender, country, bio, latitude, longitude, location, selectedInterests, socials,
		error, readyToSubmit, validationErrors, currentPage,
		profileFormState, initReferences, submitProfile, resetState, removeSocial, updateHandle, updateCustomPlatform
	} from "$lib/stores/createProfileForm";
	
	import MapPicker from "./MapPicker.svelte";

	onMount(() => {
        initReferences();
    });

</script>

<div class="create-profile-container">
	<h1>loopii</h1>
    <p>Logged in as {$user.email}</p>
    <button on:click={signOut}>Log Out</button>

	<div class="card">

		{#if $profileFormState === "submitting"}
    		<p>Creating profile...</p>

		{:else if $profileFormState === "success"}
			<p class="success">Profile created successfully!</p>
			<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>

		{:else if $profileFormState === "exists"}
			<p class="success">You already have a profile.</p>
			<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>

		{:else if $profileFormState === "error"}
			<p class="error">{$error}</p>
			<button on:click={resetState}>Try again</button>

		{:else}

		<form on:submit|preventDefault={submitProfile} class="profile-form">

			{#if $currentPage === 0}
				<h3>Create your profile</h3>
				<label for="username">Username*</label>
				<input id="username" bind:value={$username} required />
				{#if $validationErrors.find(e => e.field === "username" && e.display)}
					<p class="error">
						{$validationErrors.find(e => e.field === "username" && e.display).message}
					</p>
				{/if}

				<label for="name">Display Name</label>
				<input id="name" bind:value={$name} />
				{#if $validationErrors.find(e => e.field === "name" && e.display)}
					<p class="error">
						{$validationErrors.find(e => e.field === "name" && e.display).message}
					</p>
				{/if}

				<label for="dob">Date of Birth*</label>
				<input id="dob" type="date" bind:value={$dob} required />
				{#if $validationErrors.find(e => e.field === "dob" && e.display)}
					<p class="error">
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
					<p class="error">
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
					<p class="error">
						{$validationErrors.find(e => e.field === "country" && e.display).message}
					</p>
				{/if}

				<label for="location">City</label>
				<input id="location" bind:value={$location} />
				{#if $validationErrors.find(e => e.field === "location" && e.display)}
					<p class="error">
						{$validationErrors.find(e => e.field === "location" && e.display).message}
					</p>
				{/if}

				<div class="nav">
					<button type="button" on:click={() => $currentPage = 1} disabled={!$readyToSubmit}>
						Continue →
					</button>
				</div>
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
					<p class="error">
						{$validationErrors.find(e => ["latitude", "longitude"].includes(e.field) && e.display).message}
					</p>
				{/if}

				<label for="bio">Bio</label>
				<textarea id="bio" bind:value={$bio}></textarea>
				{#if $validationErrors.find(e => e.field === "bio" && e.display)}
					<p class="error">
						{$validationErrors.find(e => e.field === "bio" && e.display).message}
					</p>
				{/if}

				<label for="interests">Interests</label>
				<select id="interests" multiple bind:value={$selectedInterests}>
					{#each $allInterests as interest}
						<option value={interest.id}>{interest.name}</option>
					{/each}
				</select>
				{#if $validationErrors.find(e => e.field === "interests" && e.display)}
					<p class="error">
						{$validationErrors.find(e => e.field === "interests" && e.display).message}
					</p>
				{/if}

				<div class="nav">
					<button type="button" on:click={() => $currentPage = 0}>← Back</button>
					<button type="button" on:click={() => $currentPage = 2} disabled={!$readyToSubmit}>Continue →</button>
				</div>
			{/if}

			{#if $currentPage === 2}
				<h3>What your loops will see</h3>

				<!-- Social Media Handles UI -->
				<label for="">Social Media Handles</label>
				<div class="socials-box">
					{#if $socials.length > 0}
						<div class="socials-grid">
							{#each $socials as social, i}
								<div class="social-name">
									{#if social.platform_id}
										{social.name}
									{:else}
										<input
											type="text"
											placeholder="Custom platform"
											value={social.custom_platform || ""}
											on:input={(e) => updateCustomPlatform(i, e.target.value)}
											maxlength="30"
										/>
									{/if}
								</div>
								<div class="social-handle">
									<input
										type="text"
										placeholder="Enter handle"
										bind:value={social.handle}
										on:input={(e) => updateHandle(i, e.target.value)}
									/>
								</div>
								<div class="social-remove">
									<button type="button" on:click={() => removeSocial(i)}>−</button>
								</div>
								{#if $validationErrors.find(e => e.field === `socials.${i}`)}
									<p class="error" style="grid-column: 1 / -1;">
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
									{ platform_id: null, name: null, custom_platform: "", handle: "" }
								]);
							} else {
								const platform = $allPlatforms.find(p => p.id === e.target.value);
								if (platform) {
									socials.update(s => [
										...s,
										{ platform_id: platform.id, name: platform.name, custom_platform: null, handle: "" }
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
				</div>

				<div class="nav">
					<button type="button" on:click={() => $currentPage = 1}>← Back</button>
					<button type="submit" disabled={$profileFormState === "submitting" || !$readyToSubmit}>
						{$profileFormState === "submitting" ? "Creating…" : "Create Profile"}
					</button>
				</div>
			{/if}
		</form>

		{/if}
	</div>
</div>

<style>
.create-profile-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	text-align: center;
}
.card {
	max-width: 400px;
	margin: 2rem auto;
	padding: 1rem;
	border: 1px solid #ccc;
	border-radius: 8px;
}
.profile-form {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	width: 300px;
}

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

.social-handle input {
	width: 100%;
}

.social-remove button {
	background: none;
	border: none;
	font-size: 1.2rem;
	cursor: pointer;
	color: #c00;
}

.success { color: green; }
.error { color: red; }
</style>