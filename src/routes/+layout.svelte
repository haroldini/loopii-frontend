
<script>
    import Icon from "@iconify/svelte";
    import "$lib/styles/app.css";

    import { get } from "svelte/store";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import { preloadData, goto } from "$app/navigation";

    import { registerCaptchaOverlay } from "$lib/utils/captcha.js";

    import { initReferences, retryReferences, referencesStatus, UI_ICONS, theme } from "$lib/stores/app.js";
    import { initAuth, user, signOut, authState } from "$lib/stores/auth.js";
    import { initProfile, profile, profileState } from "$lib/stores/profile.js";
    import { initNotificationSub, clearNotificationSub } from "$lib/stores/notifications.js";
    import { initLoopsStore } from "$lib/stores/loops.js";
    import { initLoopRequestsStore } from "$lib/stores/loopRequests.js";
    import { initPeerStore } from "$lib/stores/feed.js";
    import { profileFormState, submissionProgress } from "$lib/stores/createProfile.js";
    import { subPage, authFormStatus } from "$lib/stores/authForm.js";
    import { addToast } from "$lib/stores/popups.js";

    import Auth from "$lib/components/Auth.svelte";
    import CreateProfile from "$lib/components/CreateProfile.svelte";
    import RestrictedGate from "$lib/components/RestrictedGate.svelte";
    import Navbar from "$lib/components/Navbar.svelte";
    import Popups from "$lib/components/Popups.svelte";
    import QuickSettings from "$lib/components/QuickSettings.svelte";
    import CaptchaOverlay from "$lib/components/CaptchaOverlay.svelte";


    const LOADING_TIMEOUT = 10000; // 10 seconds
    let didPreloadRoutes = false;
    let captchaOverlay = $state(null);


    // ---------------- App height init ---------------- //
    function installAppHeightSync() {
        let maxHeight = 0;

        const apply = (h) => {
            maxHeight = h;

            document.documentElement.style.setProperty("--app-height", `${maxHeight}px`);
            document.documentElement.style.setProperty("--app-vh", `${maxHeight / 100}px`);
        };

        const setSoft = () => {
            const h = Math.round(window.innerHeight);

            // Ignore keyboard + other shrink events
            if (h <= maxHeight) return;

            apply(h);
        };

        const setHard = () => {
            // Used for real layout changes like rotation
            const h = Math.round(window.innerHeight);
            apply(h);
        };

        const rafSoft = () => requestAnimationFrame(setSoft);
        const rafHard = () => requestAnimationFrame(setHard);

        const onPageShow = () => {
            rafSoft();

            // One-time scroll correction after resume/autofill/biometrics
            try { document.scrollingElement.scrollTop = 0; } catch {}
            try { window.scrollTo(0, 0); } catch {}
        };

        // Initial
        setHard();
        requestAnimationFrame(setHard);

        window.addEventListener("resize", rafSoft, { passive: true });
        window.addEventListener("pageshow", onPageShow, { passive: true });
        window.addEventListener("orientationchange", rafHard, { passive: true });

        return () => {
            window.removeEventListener("resize", rafSoft);
            window.removeEventListener("pageshow", onPageShow);
            window.removeEventListener("orientationchange", rafHard);
        };
    }


    // ---------------- Account access gating ---------------- //

    const accessStatus = $derived.by(() => {
        const s = $profile?.access?.status;
        return (s || "active").toLowerCase();
    });

    const isAccountRestricted = $derived.by(() => {
        return (
            $authState === "authenticated" &&
            $profileState === "loaded" &&
            $referencesStatus === "loaded" &&
            accessStatus !== "active"
        );
    });

    const appReady = $derived.by(() => {
        return (
            $authState === "authenticated" &&
            $profileState === "loaded" &&
            $referencesStatus === "loaded" &&
            !isAccountRestricted
        );
    });

    const PUBLIC_ROUTES = new Set(["/privacy", "/terms", "/contact"]);
    const shouldBypassGates = $derived.by(() => {
        const isPublic = PUBLIC_ROUTES.has($page.url.pathname);
        return isPublic && !appReady;
    });

    // ---------------- Admin route gating ---------------- //

    const isAdminRoute = $derived.by(() => {
        const p = $page?.url?.pathname || "/";
        return p === "/admin" || p.startsWith("/admin/");
    });

    const isAdminUser = $derived.by(() => {
        const role = ($profile?.access?.role || "").toLowerCase();
        return role === "admin";
    });

    const isAdminBlocked = $derived.by(() => {
        return appReady && isAdminRoute && !isAdminUser;
    });


    // ---------------- Page metadata ---------------- //
    const pageTitle = $derived.by(() => {
        if ($referencesStatus === "error" || $authState === "error" || $profileState === "error") {
            return "loopii • Find mutuals, friends, and partners";
        }

        if (
            $referencesStatus === "loading" ||
            $referencesStatus === "unloaded" ||
            $authState === "loading" ||
            $profileState === "loading"
        ) {
            return "loopii • Find mutuals, friends, and partners";
        }

        if ($authState === "unauthenticated" && $authFormStatus === "landing") {
            return "loopii • Find mutuals, friends, and partners";
        }

        if ($authState === "unauthenticated" && $subPage === "login") {
            return "loopii • Log in";
        }

        if ($authState === "unauthenticated" && $subPage === "signup") {
            return "loopii • Sign up";
        }

        if (
            $authState === "recovery" || 
            $authState === "unauthenticated" && ["requestReset", "reset"].includes($subPage)
        ) {
            return "loopii • Reset password";
        }

        if ($authState === "authenticated" && $profileState === "missing") {
            return "loopii • Create profile";
        }

        return "loopii • Find mutuals, friends, and partners";
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
        const uninstall = installAppHeightSync();
        registerCaptchaOverlay(captchaOverlay); 
        initReferences();
        initAuth();

        preloadData("/privacy");
        preloadData("/terms");
        preloadData("/contact");
        
        updateThemeColor();

        const unsubscribeTheme = theme.subscribe(() => {
            updateThemeColor();
        });

        setTimeout(() => {
            if ($referencesStatus === "loading") {
                console.warn("References loading timeout.");
                referencesStatus.set("timeout");
            }

            if ($authState === "loading") {
                console.warn("Auth loading timeout.");
                authState.set("timeout");
            }
        }, LOADING_TIMEOUT);

        return () => {
            unsubscribeTheme();
            uninstall?.();
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
        if (appReady) {
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

    let { children } = $props();
</script>


<svelte:head>
    
    <title>{pageTitle}</title>

    <!-- Only index and follow on the homepage -->
    {#if $page.url.pathname === "/"}
        <meta name="robots" content="index, follow" />
    {:else if PUBLIC_ROUTES.has($page.url.pathname)}
        <meta name="robots" content="noindex, follow" />
    {:else}
        <meta name="robots" content="noindex, nofollow" />
    {/if}

</svelte:head>


<Popups />
{#if browser}
    <CaptchaOverlay bind:this={captchaOverlay} />
    {#if !shouldBypassGates && !appReady}
        <QuickSettings />
    {/if}
{/if}


<!-- Display public routes -->
{#if shouldBypassGates}
    <div class="app app--no-nav">
        <div class="app-body">
            {@render children?.()}
        </div>
    </div>


<!-- Couldn't connect to loopii // Missing db, auth, profile, etc. -->
{:else if $referencesStatus === "error" || $authState === "error" || $profileState === "error"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>
            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center text-fw-semibold">Couldn't connect to loopii.</p>
                    <p class="text-hint text-center">If the problem persists, refresh or try again later.</p>
                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={retryAll}>
                            <Icon icon={UI_ICONS.refresh} class="btn__icon" />Try again
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
{:else if $referencesStatus === "loading" || $referencesStatus === "unloaded" || $authState === "loading" || $profileState === "loading"}

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

{:else if $authState === "timeout" || $profileState === "timeout" || $referencesStatus === "timeout"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center text-fw-semibold">Couldn't connect to loopii.</p>
                    <p class="text-hint text-center">If the problem persists, refresh or try again later.</p>
                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={refreshPage}>
                            <Icon icon={UI_ICONS.refresh} class="btn__icon" />Try again
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

{:else if $authState === "unauthenticated" || $authState === "recovery"}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

            <section class="card">
                <Auth />
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


{:else if isAccountRestricted}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>
            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <RestrictedGate onSignOut={confirmLocalSignOut} />
                </div>
            </section>
        </div>
    </div>

{:else if isAdminBlocked}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center text-fw-semibold">Not authorized.</p>
                    <p class="text-hint text-center">You don't have admin access.</p>

                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={() => goto("/")}>
                            <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />Back
                        </button>
                        <button type="button" class="btn btn--danger btn--block" onclick={confirmLocalSignOut}>
                            <Icon icon={UI_ICONS.logout} class="btn__icon" />Log out
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>

{:else if appReady}
    {#if isAdminRoute}
        <div class="app app--no-nav">
            <div class="app-body">
                {@render children?.()}
            </div>
        </div>
    {:else}
        <div class="app">
            <Navbar />
            <div class="app-body">
                {@render children?.()}
            </div>
        </div>
    {/if}

{:else}
    <div class="gate">
        <div class="gate__inner content content--narrow stack">
            <h1 class="gate__brand text-heading">loop<span class="logo--i">ii</span></h1>

            <section class="card">
                <div class="section stack">
                    <Icon icon={UI_ICONS.animFailed} class="icon--large" />
                    <p class="text-center text-fw-semibold">Sorry, something went wrong.</p>
                    <p class="text-hint text-center">If the problem persists, log out or try again later.</p>
                    <div class="actionbar">
                        <button type="button" class="btn btn--primary btn--block" onclick={refreshPage}>
                            <Icon icon={UI_ICONS.refresh} class="btn__icon" />Reconnect
                        </button>
                        <button type="button" class="btn btn--danger btn--block" onclick={confirmLocalSignOut}>
                            <Icon icon={UI_ICONS.logout} class="btn__icon" />Log out
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>
{/if}
