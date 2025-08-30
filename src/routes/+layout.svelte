<script>
	import { onMount } from 'svelte';
	import { initAuth, user, authLoading, authIsRecovery, signOut } from '$lib/stores/auth';
	import { initProfile, profile, profileLoading } from '$lib/stores/profile';

	import Auth from '$lib/components/Auth.svelte';
	import CreateProfile from '$lib/components/CreateProfile.svelte';

	import Navbar from '$lib/components/Navbar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// Initialise the authentication and profile stores
	onMount(async () => {
		await initAuth();
		if ($user) {
			await initProfile();
		}
	});

	async function handleLogout() {
		await signOut();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<!-- Authenticating / Loading Profile - Display 'Loading' -->
{#if $authLoading || $profileLoading}
	<div style="display:flex; flex-direction: column; align-items:center;">
		<h1>loopii</h1>
		<p>Loading...</p>
	</div>

<!-- Recovery Flow or No User - Prompt Login -->
{:else if $authIsRecovery || !$user} 
    <Auth />

<!-- Logged in but No Profile - Create Profile -->
{:else if $user && !$profile}
	<CreateProfile />

<!-- Authentication Passed & Profile Present - Render App -->
{:else if $user && $profile}
	<Navbar />
    {@render children?.()}
{/if}