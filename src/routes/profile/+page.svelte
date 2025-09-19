
<script>
    import { profile } from "$lib/stores/profile";
    import { goto } from "$app/navigation";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";
    import Navbar from "$lib/components/Navbar.svelte";

    let expanded = false;

    function open() {
        expanded = true;
    }

    function close() {
        expanded = false;
    }
</script>


<svelte:head>
    <title>loopii • Your Profile</title>
</svelte:head>


<!-- Account settings buttons -->
<div class="container bordered">
    <nav>
        <button type="button" on:click={() => goto("/profile/edit")}>
            Edit
        </button>
        <button type="button" on:click={() => goto("/profile/security")}>
            Security
        </button>
        <button type="button" on:click={signOut}>
            Log Out
        </button>
    </nav>
</div>

<div class="container bordered">
    {#if expanded}
        <ProfileCardExpanded profile={$profile} onBack={close} />
    {:else}
        <ProfileCard profile={$profile} on:expand={open} />
    {/if}
</div>
