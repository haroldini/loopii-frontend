
<script>
    import { goto } from "$app/navigation";
</script>


<svelte:head>
    <title>loopii • Edit Profile</title>
</svelte:head>


<div class="container bordered">
    <h3>Edit Profile</h3>
    <button type="button" on:click={() => goto("/profile")}>
        Back to Profile
    </button>
</div>