<script>
	import { onMount } from "svelte";
	import { get, writable } from "svelte/store";
	import { 
		username, name, dob, gender, country, bio, location, selectedInterests, allInterests, allCountries,
		error, submitProfile, readyToSubmit, validationErrors, profileFormState, initReferences
	} from "$lib/stores/createProfileForm";
    import { user, signOut } from "$lib/stores/auth";


	onMount(() => {
        initReferences();
    });
</script>

<div class="create-profile-container">
	<h1>loopii</h1>
    <p>Logged in as {$user.email}</p>
    <button on:click={signOut}>Log Out</button>
	
	<div class="card">
		<h2>Create your profile</h2>

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
			<button on:click={resetProfileForm}>Try again</button>

		{:else}
			<form on:submit|preventDefault={submitProfile} class="profile-form">
				<input placeholder="Username" bind:value={$username} required />
				<input placeholder="Full Name (optional)" bind:value={$name} />
				<input type="date" placeholder="Date of Birth" bind:value={$dob} required />
				
				<select bind:value={$gender} required>
					<option value="" disabled>Select Gender</option>
					<option value="male">Male</option>
					<option value="female">Female</option>
					<option value="other">Non-Binary / Other</option>
				</select>

				<label for="country">Country</label>
				<select id="country" bind:value={$country} required>
					<option value="" disabled selected>Select Country</option>
					{#each $allCountries as country}
						<option value={country.code}>{country.name}</option>
					{/each}
				</select>
				
				<input placeholder="Location (optional)" bind:value={$location} />
				<textarea placeholder="Bio (optional)" bind:value={$bio}></textarea>

				<label for="interests">Select your interests</label>
				<select id="interests" multiple bind:value={$selectedInterests}>
					{#each $allInterests as interest}
						<option value={interest.id}>{interest.name}</option>
					{/each}
				</select>

				<!-- Real-time validation errors -->
				{#if $validationErrors.length > 0}
					<ul class="errors">
						{#each $validationErrors as err}
							{#if err.display}
								<li>{err.message}</li>
							{/if}
						{/each}
					</ul>
				{/if}

				<button type="submit" disabled={$profileFormState === "submitting" || !$readyToSubmit}>
					{$profileFormState === "submitting" ? "Creating…" : "Create Profile"}
				</button>
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
.errors {
	color: red;
	font-size: 0.9rem;
	margin: 0;
	padding-left: 1.2rem;
	text-align: left;
}
.success { color: green; }
.error { color: red; }
</style>