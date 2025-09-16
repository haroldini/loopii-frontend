<script>
    import { user, signOut } from "$lib/stores/auth";
</script>

<style>
    nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #ccc;
    }

    .nav-links {
        display: flex;
        list-style: none;
        gap: 1rem;
        margin: 0;
        padding: 0;
        align-items: center;
    }

    .nav-links li a {
        text-decoration: none;
        color: black;
    }

    .nav-links li button {
        cursor: pointer;
    }
</style>

<nav>
    <!-- Brand -->
    <div class="brand">
        <a href="/" style="font-size:16pt; font-weight:600;">loopii</a>
    </div>

    <!-- Navigation Links -->
    <ul class="nav-links">
        <li><a href="/">Find Loops</a></li>
        <li><a href="/loops">Loops</a></li>
        <li><a href="/profile">Your Profile</a></li>

        {#if $user}
            <li>
                <button on:click={signOut}>Log Out</button>
            </li>
        {/if}
    </ul>
</nav>
