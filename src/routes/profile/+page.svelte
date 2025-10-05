
<script>
    import { profile } from "$lib/stores/profile";
    import { goto } from "$app/navigation";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
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
    <h3>{$profile?.username}'s Profile</h3>
    <nav>
        <button type="button" on:click={() => goto("/profile/edit")}>
            Edit Profile
        </button>
        <button type="button" on:click={() => goto("/profile/security")}>
            Account Settings
        </button>
    </nav>
</div>

<div class="container bordered">
    {#if expanded}
        <nav>
            <button
                type="button"
                on:click={close}
                aria-label="Back to profile preview">
                ← Back
            </button>
        </nav>
        <ProfileCardExpanded profile={$profile} />
    {:else}
        <ProfileCard profile={$profile} on:expand={open} />
    {/if}
</div>
