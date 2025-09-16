
<script>
    import { goto } from "$app/navigation";
    import ChangeAuthField from "$lib/components/ChangeAuthField.svelte";
    import { mode, setMode, status } from "$lib/stores/changeauthform";

    import { user } from "$lib/stores/auth";

    function select(tab) {
        setMode(tab);
    }
</script>


<svelte:head>
    <title>loopii • Account</title>
</svelte:head>


<div class="container bordered">
    <h3>Account</h3>
    
    <p>Currently logged in as {$user?.email}</p>
    <button type="button" on:click={() => goto("/profile")}>
        Back to Profile
    </button>
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

    <ChangeAuthField />
</div>