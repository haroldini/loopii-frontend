
<script>
    import { profile } from "$lib/stores/profile";
    import { goto } from "$app/navigation";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

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
<div style="display:flex; gap:0.75rem; margin-bottom:0.75rem;">
    <button type="button" on:click={() => goto("/profile/edit")}>
        Edit profile details
    </button>
    <button type="button" on:click={() => goto("/profile/security")}>
        Security (email &amp; password)
    </button>
</div>

<div style="max-width:600px; margin:2rem auto; padding:1rem;">
    {#if expanded}
        <ProfileCardExpanded profile={$profile} onBack={close} />
    {:else}
        <ProfileCard profile={$profile} on:expand={open} />
    {/if}
</div>
