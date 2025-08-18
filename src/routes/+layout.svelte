<script>
	import { onMount } from 'svelte';
	import { initAuth, user, authLoading, authIsRecovery, signOut } from '$lib/stores/auth';
	import Auth from '$lib/components/Auth.svelte';
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

<h1>loopii</h1>

<!-- Authenticating -->
{#if $authLoading}
    <p>Loading Login...</p>

<!-- If recovery detected, skip to Auth -->
{:else if $authIsRecovery} 
    <Auth />

<!-- Authentication passed, render children -->
{:else if $user}
    <p>Logged in as {$user.email}</p>
    <button onclick={handleLogout}>Log Out</button>
    {@render children?.()}

<!-- Authentication failed, render Auth -->
{:else}
    <Auth />
{/if}