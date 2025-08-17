<script>
	import { onMount } from 'svelte';
	import { initAuth } from '$lib/stores/auth';
	import Auth from '$lib/components/Auth.svelte';
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();

	onMount(initAuth);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<h1>loopii</h1>

<Auth />

{@render children?.()}