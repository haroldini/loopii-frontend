
<script>
    import Icon from "@iconify/svelte";
    import "$lib/styles/app.css";

    import { get } from "svelte/store";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import { preloadData } from "$app/navigation";

    import { initReferences, retryReferences, referencesStatus, UI_ICONS, theme } from "$lib/stores/app.js";
    import { initAuth, user, signOut, authState } from "$lib/stores/auth.js";
    import { registerCaptchaOverlay } from "$lib/utils/captcha.js";
    import { initProfile, profile, profileState } from "$lib/stores/profile.js";
    import { initNotificationSub, clearNotificationSub } from "$lib/stores/notifications.js";
    import { initLoopsStore } from "$lib/stores/loops.js";
    import { initLoopRequestsStore } from "$lib/stores/loopRequests.js";
    import { initPeerStore } from "$lib/stores/feed.js";
    import { profileFormState, submissionProgress } from "$lib/stores/createProfile.js";
    import { subPage } from "$lib/stores/authForm.js";
    import { addToast } from "$lib/stores/popups.js";

    import Auth from "$lib/components/Auth.svelte";
    import CreateProfile from "$lib/components/CreateProfile.svelte";
    import Navbar from "$lib/components/Navbar.svelte";
    import Popups from "$lib/components/Popups.svelte";
    import QuickSettings from "$lib/components/QuickSettings.svelte";
    import CaptchaOverlay from "$lib/components/CaptchaOverlay.svelte";


    const LOADING_TIMEOUT = 5000; // 5 seconds
    let didPreloadRoutes = false;
    let captchaOverlay = $state(null);


    let { children } = $props();


    // ---------------- Page metadata ---------------- //
    const pageTitle = $derived.by(() => {
        if ($referencesStatus === "error" || $authState === "error" || $profileState === "error") {
            return "loopii • couldn't connect";
        }

        if (
            $referencesStatus === "loading" ||
            $referencesStatus === "unloaded" ||
            $authState === "loading" ||
            $profileState === "loading"
        ) {
            return "loopii • Loading";
        }

        if ($authState === "unauthenticated" && $subPage === "login") {
            return "loopii • Log In";
        }

        if ($authState === "unauthenticated" && $subPage === "signup") {
            return "loopii • Sign Up";
        }

        if (
            $authState === "recovery" || 
            $authState === "unauthenticated" && ["requestReset", "reset"].includes($subPage)
        ) {
            return "loopii • Reset Password";
        }

        if ($authState === "authenticated" && $profileState === "missing") {
            return "loopii • Create Profile";
        }

        return "loopii";
    });

    export const updateThemeColor = () => {
        const color = getComputedStyle(document.documentElement)
            .getPropertyValue("--bg-app")
            .trim();

        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute("content", color);
    };

    // ---------------- Initial setup ---------------- //
    onMount(() => {
        registerCaptchaOverlay(captchaOverlay); 
        initReferences();
        initAuth();

        updateThemeColor();

        const unsubscribeTheme = theme.subscribe(() => {
            updateThemeColor();
        });

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

        return () => {
            unsubscribeTheme();
        };
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
            // Initialise stores that need auth + profile
            initPeerStore();
            initLoopsStore();
            initLoopRequestsStore();
            initNotificationSub();

            // Preload main routes after auth + profile load
            if (!didPreloadRoutes) {
                didPreloadRoutes = true;
                preloadData("/requests");
                preloadData("/loops");
                preloadData("/profile");
                preloadData("/settings");
                preloadData("/profile/edit");
                preloadData("/profile/photos");
                preloadData("/profile/visibility-preferences");
                preloadData("/profile/search-preferences");
            }

        } else if ($authState === "unauthenticated") {
            clearNotificationSub();
            didPreloadRoutes = false;
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
    
    <title>{pageTitle}</title>

    <!-- Only index and follow on the homepage -->
    {#if $page.url.pathname === "/"}
        <meta name="robots" content="index, follow" />
    {:else}
        <meta name="robots" content="noindex, nofollow" />
    {/if}

</svelte:head>


<Popups />
{#if browser}
    <CaptchaOverlay bind:this={captchaOverlay} />
    {#if !($authState === "authenticated" && $profileState === "loaded" && $referencesStatus === "loaded")}
        <QuickSettings />
    {/if}
{/if}



<!-- Couldn't connect to loopii // Missing db, auth, profile, etc. -->
{#if $referencesStatus === "error" || $authState === "error" || $profileState === "error"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>
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
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center">Sorry, loopii is taking longer than expected to load.</p>
                    <p class="text-center text-hint">Try again, or log out and log back in.</p>
                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={refreshPage}>
                            <Icon icon={UI_ICONS.refresh} class="btn__icon" />Try again
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
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

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
                <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>
                <Icon icon={UI_ICONS.animLoadingDots} class="page__icon" />
                <p class="text-center text-fw-semibold">{$submissionProgress}...</p>
            </div>
        </div>
    {:else }
        <div class="gate">
            <div class="gate__inner content content--narrow stack">
                <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>
                <section class="card">
                    <div class="section stack">
                        <CreateProfile />
                    </div>
                </section>
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
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

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
