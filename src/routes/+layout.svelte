
<script>
    import Icon from "@iconify/svelte";
    import "$lib/styles/app.css";

    import { get } from "svelte/store";
    import { onMount } from "svelte";

    import { initReferences, retryReferences, referencesStatus, UI_ICONS } from "$lib/stores/app.js";
    import { initAuth, user, signOut, authState } from "$lib/stores/auth.js";
    import { initProfile, profile, profileState } from "$lib/stores/profile.js";
    import { initNotificationSub, clearNotificationSub } from "$lib/stores/notifications.js";
    import { initLoopsStore } from "$lib/stores/loops.js";
    import { initLoopRequestsStore } from "$lib/stores/loopRequests.js";
    import { initPeerStore } from "$lib/stores/feed.js";
    import { profileFormState, submissionProgress } from "$lib/stores/createProfile.js";
    import { addToast } from "$lib/stores/popups.js";

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
            if ($referencesStatus === "loading") {
                console.warn("References loading timeout.");
                referencesStatus.set("error");
            }

            if ($authState === "loading") {
                console.warn("Auth loading timeout.");
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
                    console.warn("Profile loading timeout.");
                    profileState.set("timeout");
                }
            }, LOADING_TIMEOUT);
        }
    });

    // ---------------- App data setup ---------------- //
    $effect(() => {
        if (
            $authState === "authenticated" &&
            $profileState === "loaded" &&
            $referencesStatus === "loaded"
        ) {
            initPeerStore();
            initLoopsStore();
            initLoopRequestsStore();
            initNotificationSub();
        } else if ($authState === "unauthenticated") {
            clearNotificationSub();
        }
    });

    function retryAll() {
        if ($referencesStatus === "error") {
            retryReferences();
        }
        if ($authState === "error") {
            initAuth();
        }
        if ($authState === "authenticated" && $profileState === "error") {
            initProfile();
        }
    }

    function refreshPage() {
        window.location.replace("/");
    }

    // Confirm single-device sign-out
    function confirmLocalSignOut() {
        addToast({
            variant: "modal",
            text: "Are you sure?",
            description: "You'll be logged out on this device. You can sign back in any time.",
            autoHideMs: null,
            actions: [
                {
                    label: "Cancel",
                    variant: "secondary",
                },
                {
                    label: "Log out",
                    variant: "danger",
                    onClick: () => {
                        signOut();
                    },
                },
            ],
        });
    }
</script>


<svelte:head>
    <link rel="icon" href="/favicon.svg" />
</svelte:head>


<Popups />


<!-- Couldn't connect to loopii // Missing db, auth, profile, etc. -->
{#if $referencesStatus === "error" || $authState === "error" || $profileState === "error"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            
            <h1 class="gate__brand text-heading">loopii</h1>
            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center text-fw-semibold">Couldn't connect to loopii.</p>
                    <p class="text-center text-hint">Please refresh or try again later.</p>
                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={retryAll}>
                            <Icon icon={UI_ICONS.refresh} class="btn__icon" />Retry
                        </button>
    
                        {#if $authState === "authenticated"}
                            <button type="button" class="btn btn--danger btn--block" onclick={confirmLocalSignOut}>
                                <Icon icon={UI_ICONS.logout} class="btn__icon" />Log out
                            </button>
                        {/if}
                    </div>
                </div>
            </section>
        </div>
    </div>

<!-- Loading -->
{:else if 
        $referencesStatus === "loading" 
        || $referencesStatus === "unloaded" 
        || $authState === "loading"
        || $profileState === "loading"}

    <div class="gate">
        <div class="gate__inner content content--narrow stack">

            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>
            <Icon icon={UI_ICONS.animLoading} class="page__icon" />

            <!-- Loading // fetching resources -->
            {#if $referencesStatus === "loading" || $referencesStatus === "unloaded"}
                <p class="text-center text-hint">Connecting...</p>
            
            <!-- Loading // Logging in -->
            {:else if $authState === "loading" || $profileState === "loading"}
                <p class="text-center text-hint">Logging in...</p>
            {/if}
        </div>
    </div>

{:else if $authState === "timeout" || $profileState === "timeout"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loopii</h1>

            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center">Sorry, loopii is taking longer than expected to load.</p>
                    <p class="text-center text-hint">Try refreshing, or log out and log back in.</p>
                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={refreshPage}>
                            <Icon icon={UI_ICONS.refresh} class="btn__icon" />Refresh
                        </button>
                        <button type="button" class="btn btn--danger btn--block" onclick={confirmLocalSignOut}>
                            <Icon icon={UI_ICONS.logout} class="btn__icon" />Log out
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>

{:else if $authState === "unauthenticated" || $authState === "recovery"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loopii</h1>

            <section class="card">
                <div class="section stack">
                    <Auth />
                </div>
            </section>
        </div>
    </div>

{:else if $authState === "authenticated" && $profileState === "missing"}

    {#if $profileFormState === "submitting"}
        <div class="gate">
            <div class="gate__inner content content--narrow stack">
                <h1 class="gate__brand text-heading">loopii</h1>
                <Icon icon={UI_ICONS.animLoadingDots} class="page__icon" />
                <p class="text-center text-fw-semibold">{$submissionProgress}...</p>
            </div>
        </div>
    {:else }
        <div class="gate">
            <div class="gate__inner content content--narrow stack">
                <h1 class="gate__brand text-heading">loopii</h1>

                <section class="card">
                    <div class="section stack">
                        <CreateProfile />
                    </div>
                </section>

                {#if !["success", "partial", "exists", "submitting"].includes($profileFormState)}
                    <section class="u-separator-top">
                        <div class="section stack">
                            <p class="text-hint text-center">Logged in as {$user.email}</p>
                            <button type="button" class="btn btn--danger btn--mini text-center" onclick={confirmLocalSignOut}>
                                <Icon icon={UI_ICONS.logout} class="btn__icon" /> Log out
                            </button>
                        </div>
                    </section>
                {/if}
            </div>
        </div>
    {/if}


{:else if $authState === "authenticated" && $profileState === "loaded" && $referencesStatus === "loaded"}
    <div class="app">
        <Navbar />
        <div class="app-body">
            {@render children?.()}
        </div>
    </div>

{:else}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loopii</h1>

            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p>Sorry, something went wrong.</p>
                    <p class="text-hint">Try refreshing, or log out and log back in.</p>
                    <button type="button" class="btn btn--danger btn--block" onclick={confirmLocalSignOut}>
                        <Icon icon={UI_ICONS.logout} class="btn__icon" /> Log out
                    </button>
                </div>
            </section>
        </div>
    </div>
{/if}
