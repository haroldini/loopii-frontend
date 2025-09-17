<script>
	import favicon from "$lib/assets/favicon.svg";
	import "$lib/styles/app.css";

	import { get } from "svelte/store";
	import { onMount } from "svelte";
	import { initReferences } from "$lib/stores/app.js";
	import { initAuth, user, signOut, urlNotice, authState } from "$lib/stores/auth";
	import { initProfile, profile, profileState } from "$lib/stores/profile";

	import Auth from "$lib/components/Auth.svelte";
	import CreateProfile from "$lib/components/CreateProfile.svelte";

	import Navbar from "$lib/components/Navbar.svelte";
	import Notice from "$lib/components/Notice.svelte";

	let { children } = $props();

	// Whenever authState changes to authenticated, load profile
	onMount(() => {
		initReferences();
        initAuth();
    });
    $effect(() => {
        if ($authState === "authenticated") {
            initProfile();
        }
    });

	async function handleLogout() {
		await signOut();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<!-- Render URL notice if present -->
{#if $urlNotice}
	<Notice
			text={$urlNotice.text}
			type={$urlNotice.type}
			autoHideMs={$urlNotice.type === "success" ? 6000 : null}
			on:dismiss={() => urlNotice.set(null)}
		/>
{/if}


<!-- Authenticating user or loading profile -->
{#if $authState === "loading" || $profileState === "loading"}
<div class="fill fillvh center">
	<div class="container">
		<h1>loopii</h1>
		<p>Loading...</p>
	</div>
</div>
	
<!-- Recovery flow -->
{:else if $authState === "unauthenticated" || $authState === "recovery"} 
<div class="center fill">
	<div class="container bordered" style="width: 100%; max-width: 500px;">
		<Auth />
	</div>
</div>

<!-- Logged in, but no profile -->
{:else if $authState === "authenticated" && $profileState === "missing"}
<div class="center fill">
	<div class="container bordered" style="width: 100%; max-width: 500px;">
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

