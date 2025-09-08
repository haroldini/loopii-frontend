
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


<h1>Account</h1>
<p>{$status}</p>
<p>{$mode}</p>

<p>Currently logged in as {$user?.email}</p>
<button type="button" on:click={() => goto("/profile")}>
    ← Back to profile
</button>

<!-- Horizontal selector -->
<div style="display:flex; gap:1rem; margin-top:1rem; border-bottom:1px solid #ddd; max-width:520px;">
    <button
        type="button"
        on:click={() => select("password")}
        style="padding:0.5rem 0.75rem; border:none; border-bottom:3px solid {$mode === 'password' ? 'black' : 'transparent'}; background:transparent; cursor:pointer;"
        aria-current={$mode === "password" ? "page" : undefined}
    >
        Change Password
    </button>
    <button
        type="button"
        on:click={() => select("email")}
        style="padding:0.5rem 0.75rem; border:none; border-bottom:3px solid {$mode === 'email' ? 'black' : 'transparent'}; background:transparent; cursor:pointer;"
        aria-current={$mode === "email" ? "page" : undefined}
    >
        Change Email
    </button>
    <button
        type="button"
        on:click={() => select("revoke")}
        style="padding:0.5rem 0.75rem; border:none; border-bottom:3px solid {$mode === 'revoke' ? 'black' : 'transparent'}; background:transparent; cursor:pointer;"
        aria-current={$mode === "revoke" ? "page" : undefined}
    >
        Sign Out Everywhere
    </button>
    <button
        type="button"
        on:click={() => select("delete")}
        style="padding:0.5rem 0.75rem; border:none; border-bottom:3px solid {$mode === 'delete' ? 'black' : 'transparent'}; background:transparent; cursor:pointer;"
        aria-current={$mode === "delete" ? "page" : undefined}
    >
        Delete Account
    </button>
</div>

<!-- Form area -->
<ChangeAuthField />