<script>
    import favicon from "$lib/assets/favicon.svg";
    import "$lib/styles/app.css";

    import { get } from "svelte/store";
    import { onMount } from "svelte";

    import { initReferences } from "$lib/stores/app.js";
    import { initAuth, user, signOut, authState } from "$lib/stores/auth";
    import { initProfile, profile, profileState } from "$lib/stores/profile";
	import { initPopupsWithNotifications } from "$lib/stores/popups";
	import { loadInitialNotifications, resetInbox, initNotificationSub, clearNotificationSub, notifications } from "$lib/stores/notifications";
    import { initLoopsStore } from "$lib/stores/loops.js";
    import { initPeerStore } from "$lib/stores/feed";

    import Auth from "$lib/components/Auth.svelte";
    import CreateProfile from "$lib/components/CreateProfile.svelte";

    import Navbar from "$lib/components/Navbar.svelte";
    import Popups from "$lib/components/Popups.svelte";

    const LOADING_TIMEOUT = 8000; // 8 seconds

    let { children } = $props();

	
    // ---------------- Initial setup ---------------- //
    onMount(() => {
        initReferences();
        initAuth();
        setTimeout(() => {
            if ($authState === "loading") {
                console.warn("Auth loading timeout → forcing timeout");
                authState.set("timeout");
            }
        }, LOADING_TIMEOUT);
    });

    // ---------------- Profile load ---------------- //
    $effect(() => {
        if ($authState === "authenticated") {
            initProfile();
            setTimeout(() => {
                if ($profileState === "loading") {
                    console.warn("Profile loading timeout → forcing timeout");
                    profileState.set("timeout");
                }
            }, LOADING_TIMEOUT);
        }
    });

    // ---------------- App data setup ---------------- //
    $effect(() => {
        if ($authState === "authenticated" && $profileState === "loaded") {
            initLoopsStore();
            initPeerStore();
            initNotificationSub();
			loadInitialNotifications();
			initPopupsWithNotifications({ notifications });

        } else if ($authState === "unauthenticated") {
            clearNotificationSub();
			resetInbox();
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>


<!-- Global popups overlay -->
<Popups />


<!-- Timeout -->
{#if $authState === "timeout" || $profileState === "timeout"}
<div class="fill fillvh center">
    <div class="container">
        <h1>loopii</h1>
        <p>Loading is taking longer than expected.</p>
        <p>Please try refreshing the page, or log out and log back in.</p>
        <button onclick={signOut}>Log Out</button>
    </div>
</div>


<!-- Authenticating user or loading profile -->
{:else if $authState === "loading" || $profileState === "loading"}
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


<!-- Fully authenticated + profile loaded -->
{:else if $authState === "authenticated" && $profileState === "loaded"}
    <Navbar />
    <div class="flex-vertical">
        {@render children?.()}
    </div>


<!-- Fallback -->
{:else}
    <div class="container bordered">
        <h1>loopii</h1>
        <p>Stale session. Try refreshing the page, or log out and log back in.</p>
        <button onclick={signOut}>Log Out</button>
    </div>
{/if}
