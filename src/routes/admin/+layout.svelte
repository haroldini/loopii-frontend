
<script>
    import "$lib/styles/admin.css";
    import Icon from "@iconify/svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";

    import { UI_ICONS } from "$lib/stores/app.js";
    import QuickSettings from "$lib/components/QuickSettings.svelte";

    let { children } = $props();

    let qs = $state(null);

    function isActive(path) {
        const p = $page.url.pathname;

        if (path === "/admin") {
            return p === "/admin";
        }

        return p === path || p.startsWith(path + "/");
    }

    function openQuickSettings() {
        qs?.open?.();
    }
</script>


<svelte:head>
    <title>loopii • Admin</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h2 class="text-heading">Admin Panel</h2>
            </div>

            <div class="bar__actions">
                {#if browser}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        aria-label="Quick settings"
                        onclick={openQuickSettings}
                    >
                        <Icon icon={UI_ICONS.settings} class="btn__icon" />
                    </button>

                    <QuickSettings bind:this={qs} showTrigger={false} />
                {/if}

                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    aria-label="Back to app"
                    onclick={() => goto("/")}
                >
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                </button>
            </div>
        </div>
    </header>

    <div class="content stack">
        <div class="admin-wrap">
            <section class="card admin-shell">
                <nav class="segmented admin-tabs" aria-label="Admin navigation">
                    <a href="/admin" aria-current={isActive("/admin") ? "page" : undefined}>
                        Dashboard
                    </a>
                    <a href="/admin/profiles" aria-current={isActive("/admin/profiles") ? "page" : undefined}>
                        Profiles
                    </a>
                    <a href="/admin/reports" aria-current={isActive("/admin/reports") ? "page" : undefined}>
                        Reports
                    </a>
                </nav>

                <div class="admin-shell__body">
                    {@render children?.()}
                </div>
            </section>
        </div>
    </div>
</div>
