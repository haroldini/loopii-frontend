
<script>
    import { goto } from "$app/navigation";
    import { profile } from "$lib/stores/profile";
</script>


<svelte:head>
    <title>loopii • Your Profile</title>
</svelte:head>


<h1>Your Profile</h1>
<p>Name: {$profile.name}</p>
<p>Gender: {$profile.gender}</p>
<p>Location: {$profile.location}</p>
<p>Bio: {$profile.bio}</p>

<div style="display:flex; gap:0.75rem; margin-top:0.75rem;">
    <button type="button" on:click={() => goto("/profile/edit")}>
        Edit profile details
    </button>
    <button type="button" on:click={() => goto("/profile/security")}>
        Security (email & password)
    </button>
</div>