<script>
	import { onMount } from 'svelte';
	import { initAuth, user, authLoading, authIsRecovery, signOut } from '$lib/stores/auth';
	import Auth from '$lib/components/Auth.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(async () => {
		await initAuth();
	});

	async function handleLogout() {
		await signOut();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<!-- Authenticating -->
{#if $authLoading}
	<h1>loopii</h1>
    <p>Loading Login...</p>

<!-- If recovery detected, or no user, skip to Auth -->
{:else if $authIsRecovery || !$user} 
    <Auth />

<!-- Authentication passed, render children -->
{:else if $user}
	<Navbar />
    {@render children?.()}
{/if}