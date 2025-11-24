
<script>
    import { goto } from "$app/navigation";
    import { profile } from "$lib/stores/profile.js";
    import { addToast } from "$lib/stores/popups.js";
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
    {#if $profile?.username?.slice(-1) === "s"}
        <h3>{$profile?.username}' Profile</h3>
    {:else}
        <h3>{$profile?.username}'s Profile</h3>
    {/if}
    <nav>
        <button type="button" on:click={() => goto("/profile/edit")}>
            Edit
        </button>
        <button type="button" on:click={() => goto("/profile/photos")}>
            Edit Photos
        </button>
        <button type="button" on:click={() => goto("/profile/customization")}>
            Customization
        </button>
        <button type="button" on:click={() => goto("/profile/visibility-preferences")}>
            Visibility
        </button>
        <button type="button" on:click={() => goto("/profile/security")}>
            Account Settings
        </button>
    </nav>
</div>

{#if expanded}
    <ProfileCardExpanded profile={$profile} onAvatarClick={close} />
{:else}
    <ProfileCard profile={$profile} on:expand={open} />
{/if}
