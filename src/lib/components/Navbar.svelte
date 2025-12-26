
<script>
    import Icon from "@iconify/svelte";
    import { page } from "$app/stores";
    import { user, signOut } from "$lib/stores/auth.js";
	import { profile } from "$lib/stores/profile.js";
    import { newLoopsCount } from "$lib/stores/loops.js";
    import { newRequestsCount } from "$lib/stores/loopRequests.js";

    // Determine if the given path is the active route
    const isActive = (path) => {
        const current = $page.url.pathname;

		if (current === "/profile/search-preferences") {
			return path === "/";
		}

        if (path === "/profile") {
            return (
                current === "/profile" ||
                current.startsWith("/profile/") ||
                current === "/settings"
            );
        }

        return current === path;
    };
</script>


<nav class="app-nav" aria-label="Primary navigation">
	<div class="app-nav__inner">
		<a href="/" class="app-nav__link" class:active={isActive("/")} aria-label="Find loops">
			<Icon 
				icon="mdi:square-rounded-outline"
				class="app-nav__icon"
			/>
		</a>

		<a href="/requests" class="app-nav__link" class:active={isActive("/requests")} aria-label="Requests">
			<Icon 
				icon="mdi:heart-half-full"
				class="app-nav__icon"
			/>
			{#if $newRequestsCount > 0}
				<span class="app-nav__badge">{$newRequestsCount}</span>
			{/if}
		</a>

		<a href="/loops" class="app-nav__link" class:active={isActive("/loops")} aria-label="Loops">
			<Icon 
				icon="mdi:circle-multiple-outline"
				class="app-nav__icon"
			/>
			{#if $newLoopsCount > 0}
				<span class="app-nav__badge">{$newLoopsCount}</span>
			{/if}
		</a>

		<a href="/profile" class="app-nav__link" class:active={isActive("/profile")} aria-label="Your profile">
			<Icon 
				icon="mdi:account"
				class="app-nav__icon"
			/>
		</a>
	</div>
</nav>
