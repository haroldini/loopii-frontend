
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


<div class="page page--viewport">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                {#if $profile?.name}
                    <h3>{$profile.name}</h3>
                    <p class="text-hint">@{$profile.username}</p>
                {:else if $profile?.username}
                    <h3>@{$profile.username}</h3>
                {/if}
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={() => goto("/profile/visibility-preferences")}
                >
                    Visibility
                </button>

                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={() => goto("/account")}
                >
                    Settings
                </button>
            </div>
        </div>
    </header>

    <div class="content stack" class:content--scroll={expanded}>
        {#if expanded}
            <ProfileCardExpanded profile={$profile} onAvatarClick={close} />
        {:else}
            <ProfileCard profile={$profile} on:expand={open} />
        {/if}
    </div>

    <div class="bar bar--actionbar">
        <div class="bar__inner">
            <div class="actionbar">
                <button type="button" class="btn btn--ghost" on:click={() => goto("/profile/edit")}>
                    Edit
                </button>
                <button type="button" class="btn btn--ghost" on:click={() => goto("/profile/photos")}>
                    Photos
                </button>
                <button type="button" class="btn btn--ghost" on:click={() => goto("/profile/style")}>
                    Style
                </button>
            </div>
        </div>
    </div>
</div>
