
<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 
    import { profile } from "$lib/stores/profile.js";
    import { addToast } from "$lib/stores/popups.js";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
    import Navbar from "$lib/components/Navbar.svelte";

    let expanded = true;

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
                    <h3 class="text-heading">{$profile.name}</h3>
                    <p class="text-hint">@{$profile.username}</p>
                {:else if $profile?.username}
                    <h3 class="text-heading">{$profile.username}</h3>
                {/if}
            </div>

            <div class="bar__actions">
                <!-- {#if !expanded} -->
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => goto("/profile/visibility-preferences")}
                    >
                        <Icon icon={UI_ICONS.eyeOpen} class="btn__icon" />
                    </button>

                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => goto("/settings")}
                    >
                        <Icon icon={UI_ICONS.settings} class="btn__icon" />
                    </button>
                <!-- {:else}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={close}
                    >
                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                    </button>
                {/if} -->
            </div>
        </div>
    </header>

    <div class="content stack" class:content--scroll={expanded}>
        <!-- {#if expanded} -->
            <ProfileCardExpanded profile={$profile} onAvatarClick={close} />
        <!-- {:else}
            <ProfileCard profile={$profile} on:expand={open} />
        {/if} -->
    </div>

    <div class="bar bar--actionbar">
        <div class="bar__inner">
            <div class="actionbar">
                <button type="button" class="btn btn--ghost text-fw-semibold" on:click={() => goto("/profile/edit")}>
                    <Icon icon={UI_ICONS.editProfile} class="btn__icon" />
                    <span class="btn__label">Edit</span>
                </button>
                <button type="button" class="btn btn--ghost text-fw-semibold" on:click={() => goto("/profile/photos")}>
                    <Icon icon={UI_ICONS.image} class="btn__icon" />
                    <span class="btn__label">Photos</span>
                </button>
            </div>
        </div>
    </div>
</div>
