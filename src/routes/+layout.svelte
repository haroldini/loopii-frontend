<script>
	import favicon from "$lib/assets/favicon.svg";
	import "$lib/styles/app.css";

	import { get } from "svelte/store";
	import { onMount } from "svelte";

	import { initReferences, initLoopSub, clearLoopSub } from "$lib/stores/app.js";
	import { initAuth, user, signOut, authState } from "$lib/stores/auth";
	import { initProfile, profile, profileState } from "$lib/stores/profile";
	import { initLoopsStore } from "$lib/stores/loops.js";
	import { initPeerStore } from "$lib/stores/feed";

	import Auth from "$lib/components/Auth.svelte";
	import CreateProfile from "$lib/components/CreateProfile.svelte";

	import Navbar from "$lib/components/Navbar.svelte";
	import Notifications from "$lib/components/Notifications.svelte";

	let { children } = $props();

	// Initial setup
	onMount(() => {
		initReferences();
        initAuth();
    });

	// Load profile when authenticated
	$effect(() => {
        if ($authState === "authenticated") {
            initProfile();
        }
    });

	// Load profile-dependent stores when profile is loaded
	$effect(() => {
		if ($authState === "authenticated" && $profileState === "loaded") {
			initLoopsStore();		
			initPeerStore();
			initLoopSub();
		} else if ($authState === "unauthenticated") {
			clearLoopSub();
		}
	});

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<!-- Render notifications if present -->
<Notifications />


<!-- Authenticating user or loading profile -->
{#if $authState === "loading" || $profileState === "loading"}
<div class="fill fillvh center">
	<div class="container">
		<h1>loopii</h1>
		<p>Loading...</p>
	</div>
</div>
	
<!-- Recovery / account creation flow -->
{:else if $authState === "unauthenticated" || $authState === "recovery"} 
<div class="center fill">
	<div class="container bordered" style="width: 100%; max-width: min(calc(100% - 2rem), 500px);">
		<Auth />
	</div>
</div>

<!-- Logged in, but no profile -->
{:else if $authState === "authenticated" && $profileState === "missing"}
<div class="center fill">
	<div class="container bordered" style="width: 100%; max-width: min(calc(100% - 2rem), 500px);">
		<CreateProfile />
	</div>
</div>

<!-- Authentication Passed & Profile Present - Render App -->
{:else if $authState === "authenticated" && $profileState === "loaded"}
	<Navbar />
	<div class="flex-vertical">
		{@render children?.()}
	</div>

<!-- Unexpected State -->
{:else}
	<div class="container bordered">
		<h1>loopii</h1>
		<p>Stale session. Try refreshing the page, or log out and log back in.</p>
		<button onclick={signOut}>Log Out</button>
	</div>
{/if}

