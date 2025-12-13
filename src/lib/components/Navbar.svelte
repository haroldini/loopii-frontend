
<script>
    import { page } from "$app/stores";
    import { user, signOut } from "$lib/stores/auth.js";
    import { newLoopsCount } from "$lib/stores/loops.js";
    import { newRequestsCount } from "$lib/stores/loopRequests.js";

    // Determine if the given path is the active route
    const isActive = (path) => {
        const current = $page.url.pathname;

        if (path === "/profile") {
            return (
                current === "/profile" ||
                current.startsWith("/profile/") ||
                current === "/account"
            );
        }

        return current === path;
    };
</script>


<nav class="app-nav" aria-label="Primary navigation">
	<div class="app-nav__inner">
		<a href="/" class="app-nav__link" class:active={isActive("/")} aria-label="Find loops">
			🧭
		</a>

		<a href="/requests" class="app-nav__link" class:active={isActive("/requests")} aria-label="Requests">
			📩
			{#if $newRequestsCount > 0}
				<span class="app-nav__badge">{$newRequestsCount}</span>
			{/if}
		</a>

		<a href="/loops" class="app-nav__link" class:active={isActive("/loops")} aria-label="Loops">
			🔁
			{#if $newLoopsCount > 0}
				<span class="app-nav__badge">{$newLoopsCount}</span>
			{/if}
		</a>

		<a href="/profile" class="app-nav__link" class:active={isActive("/profile")} aria-label="Your profile">
			👤
		</a>
	</div>
</nav>


