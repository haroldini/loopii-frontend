
<script>
    import { page } from "$app/stores";
    import { user, signOut } from "$lib/stores/auth.js";
    import { newLoopsCount } from "$lib/stores/loops.js";
    import { newRequestsCount } from "$lib/stores/loopRequests.js";

    const isActive = (path) => $page.url.pathname === path;
</script>


<nav class="nav">
    <!-- Brand -->
    <div class="brand">
        <a href="/">loopii</a>
    </div>

    <!-- Navigation Links -->
    <ul class="nav-links">
        <li><a href="/" class:active={isActive("/")}>Find Loops</a></li>
        <li>
            <a href="/requests" class:active={isActive("/requests")}>
                Requests
                {#if $newRequestsCount > 0}
                    <span class="badge">{$newRequestsCount}</span>
                {/if}
            </a>
        </li>
        <li>
            <a href="/loops" class:active={isActive("/loops")}>
                Loops
                {#if $newLoopsCount > 0}
                    <span class="badge">{$newLoopsCount}</span>
                {/if}
            </a>
        </li>
        <li><a href="/profile" class:active={isActive("/profile")}>Your Profile</a></li>
    </ul>
</nav>


<style>
    .nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 4rem;
        padding: 0 1.5rem;
        background-color: var(--bg-1);
        border-bottom: 1px solid var(--border-1);
    }

    .brand a {
        font-size: 1.25rem;
        font-weight: 600;
        text-decoration: none;
        color: var(--text-1);
    }

    .nav-links {
        display: flex;
        list-style: none;
        margin: 0;
        padding: 0;
        height: 100%;
    }

    .nav-links li {
        height: 100%;
    }

    .nav-links li a {
        display: flex;
        align-items: center;
        height: 100%;
        padding: 0 1rem;
        text-decoration: none;
        color: var(--text-2);
        cursor: pointer;
        border: none;
        background: none;
        font: inherit;
        transition: background 0.2s, color 0.2s, border-bottom 0.2s;
        position: relative;
    }

    .nav-links li a:hover {
        background: var(--bg-hover);
        color: var(--accent-blue);
    }

    /* Highlight active link */
    .nav-links li a.active {
        color: var(--accent-blue);
        border-bottom: 2px solid var(--accent-blue);
        font-weight: 600;
    }

    .badge {
        position: absolute;
        top: 8px;
        right: -10px;
        min-width: 18px;
        height: 18px;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--red);
        color: white;
        font-size: 12px;
        line-height: 18px;
        text-align: center;
    }
</style>
