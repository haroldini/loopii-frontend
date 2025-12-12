
<script>
    import { page } from "$app/stores";
    import { user, signOut } from "$lib/stores/auth.js";
    import { newLoopsCount } from "$lib/stores/loops.js";
    import { newRequestsCount } from "$lib/stores/loopRequests.js";

    const isActive = (path) => $page.url.pathname === path;
</script>


<nav class="app-nav" aria-label="Primary navigation">
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
</nav>

