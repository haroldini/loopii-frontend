<script>
    import { user, signOut } from "$lib/stores/auth";
    import { page } from "$app/stores";
    import { unreadCount } from "$lib/stores/notifications";

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
        <li><a href="/loops" class:active={isActive("/loops")}>Loops</a></li>
        <li>
            <a href="/notifications" class:active={isActive("/notifications")} style="position: relative;">
                Notifications
                {#if $unreadCount > 0}
                    <span class="badge">{$unreadCount}</span>
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
        background-color: #fff;
        border-bottom: 1px solid #eee;
    }

    .brand a {
        font-size: 1.25rem;
        font-weight: 600;
        text-decoration: none;
        color: #333;
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
        color: #333;
        cursor: pointer;
        border: none;
        background: none;
        font: inherit;
        transition: background 0.2s, color 0.2s, border-bottom 0.2s;
    }

    .nav-links li a:hover {
        background: #f5f5f5;
        color: #0070f3;
    }

    /* Highlight active link */
    .nav-links li a.active {
        color: #0070f3;
        border-bottom: 2px solid #0070f3;
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
        background: #ff3b30;
        color: white;
        font-size: 12px;
        line-height: 18px;
        text-align: center;
    }
</style>
