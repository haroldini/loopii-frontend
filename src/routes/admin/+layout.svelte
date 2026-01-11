
<script>
    import "$lib/styles/admin.css";
    import Icon from "@iconify/svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";

    let { children } = $props();

    function isActive(path) {
        const p = $page.url.pathname;
        return p === path || p.startsWith(path + "/");
    }
</script>


<svelte:head>
    <title>loopii • Admin</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h2 class="text-heading">Admin</h2>
                <p class="text-hint">Moderation</p>
            </div>

            <div class="bar__actions">
                <button type="button" class="btn btn--ghost btn--icon" onclick={() => goto("/")}>
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                </button>
            </div>
        </div>
    </header>

    <div class="content content--full stack admin-wrap">
        <nav class="segmented">
            <a href="/admin/profiles" aria-current={isActive("/admin/profiles") ? "page" : undefined}>
                Profiles
            </a>
            <a href="/admin/reports" aria-current={isActive("/admin/reports") ? "page" : undefined}>
                Reports
            </a>
        </nav>

        {@render children?.()}
    </div>
</div>
