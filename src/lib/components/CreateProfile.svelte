<script>
	import { get } from 'svelte/store';
	import { name, dob, gender, country, isSubmitting, error, success, done, submitProfile, readyToSubmit } from '$lib/stores/createProfileForm';
    import { user, signOut } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
</script>

<div class="create-profile-container">
	<h1>loopii</h1>
    <p>Logged in as {$user.email}</p>
    <button on:click={signOut}>Log Out</button>
	
	<div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px;">
		<h2>Create your profile</h2>

		<!-- If profile actually already exists -->
		{#if $profile !== null}
			<p style="color:green;">You already have a profile. Click below to continue</p>
			<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>
		{:else}

			<!-- After creation request, handle cases -->
			{#if $done}

					<!-- Profile created -->
					{#if $success}
						<p style="color:green;">Profile created successfully!</p>
					{/if}
					{#if $error}
						<!-- Profile already exists -->
						{#if $profile}
							<p style="color:green;">{$error}</p>
							<button on:click={() => window.location.replace(window.location.origin)}>Continue</button>
						<!-- Error creating profile -->
						{:else}
							<p style="color:red;">{$error}</p>
							<button on:click={() => window.location.replace(window.location.origin)}>Try again</button>
						{/if}
					{/if}
			
			<!-- Before request -->
			{:else}

				<!-- Show loading while submitting -->
				{#if $isSubmitting} 
					<p>Creating profile...</p>

				<!-- Show form while not submitting -->
				{:else }
					<form on:submit|preventDefault={submitProfile} class="profile-form">
						<input placeholder="Full Name" bind:value={$name} required />
						<input type="date" placeholder="Date of Birth" bind:value={$dob} required />
						
						<select bind:value={$gender} required>
							<option value="" disabled>Select Gender</option>
							<option value="male">Male</option>
							<option value="female">Female</option>
							<option value="other">Other</option>
						</select>

						<input placeholder="Country" bind:value={$country} required />

						<button type="submit" disabled={$isSubmitting || !$readyToSubmit}>
							{$isSubmitting ? 'Creating…' : 'Create Profile'}
						</button>
					</form>
				{/if}
			{/if}
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

.profile-form {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	width: 300px;
}
</style>
