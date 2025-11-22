
<script>
    import { goto } from "$app/navigation";
    import { user } from "$lib/stores/auth.js";
    import { mode, setMode, status } from "$lib/stores/authSettings.js";
    import AuthSettings from "$lib/components/AuthSettings.svelte";

    function select(tab) {
        setMode(tab);
    }
</script>


<svelte:head>
    <title>loopii • Account</title>
</svelte:head>


<div class="container bordered">
    <h3>Account</h3>
    <nav>
        <button type="button" on:click={() => goto("/profile")}>
            Back to Profile
        </button>
        <button type="button" on:click={signOut}>
            Log Out
        </button>
    </nav>
</div>

<div class="container bordered">
    <div class="tab-selector">
        <button
            type="button"
            on:click={() => select("password")}
            aria-current={$mode === "password" ? "page" : undefined}
        >Change Password</button>
        <button
            type="button"
            on:click={() => select("email")}
            aria-current={$mode === "email" ? "page" : undefined}
        >
            Change Email
        </button>
        <button
            type="button"
            on:click={() => select("revoke")}
            aria-current={$mode === "revoke" ? "page" : undefined}
        >
            Sign Out Everywhere
        </button>
        <button
            type="button"
            on:click={() => select("delete")}
            aria-current={$mode === "delete" ? "page" : undefined}
        >
            Delete Account
        </button>
    </div>

    <AuthSettings />
</div>