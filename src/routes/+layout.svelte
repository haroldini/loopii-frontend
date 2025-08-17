<script>
	import { onMount } from 'svelte';
	import { initAuth, user, loading } from '$lib/stores/auth';
	import Auth from '$lib/components/Auth.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(async () => {
		await initAuth();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<h1>loopii</h1>

{#if $loading}
	<p>Loading...</p>
{:else if $user}
	{@render children?.()}
{:else}
	<Auth />
{/if}