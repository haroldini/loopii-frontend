<script>
	import { get } from "svelte/store";
	import { onMount } from "svelte";
	import { initAuth, user, signOut, urlNotice, authState } from "$lib/stores/auth";
	import { initProfile, profile, profileState } from "$lib/stores/profile";

	import Auth from "$lib/components/Auth.svelte";
	import CreateProfile from "$lib/components/CreateProfile.svelte";

	import Navbar from "$lib/components/Navbar.svelte";
	import Notice from "$lib/components/Notice.svelte";

	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();

	// Whenever authState changes to authenticated, load profile
	onMount(() => {
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

<!-- Auth debugging Info -->
<!-- 
<p>authState: {$authState}</p>
<p>profileState: {$profileState}</p>  -->


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
	<div style="display:flex; flex-direction: column; align-items:center;">
		<h1>loopii</h1>
		<p>Loading...</p>
	</div>

<!-- Recovery flow -->
{:else if $authState === "unauthenticated" || $authState === "recovery"} 
    <Auth />

<!-- Logged in, but no profile -->
{:else if $authState === "authenticated" && $profileState === "missing"}
	<CreateProfile />

<!-- Authentication Passed & Profile Present - Render App -->
{:else if $authState === "authenticated" && $profileState === "loaded"}
	<Navbar />
    {@render children?.()}

<!-- Unexpected State -->
{:else}
	<div style="display:flex; flex-direction: column; align-items:center;">
		<h1>loopii</h1>
		<p>Stale session. Try refreshing the page, or log out and log back in.</p>
		<button onclick={signOut}>Log Out</button>
	</div>
{/if}

