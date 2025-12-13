
<script>
    import { goto } from "$app/navigation";
</script>


<svelte:head>
    <title>loopii • Profile Customization</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Profile Customization</h3>
            </div>

            <div class="bar__actions">
                <button type="button" on:click={() => goto("/profile")}>Back</button>
            </div>
        </div>
    </header>

    <div class="content stack"></div>
</div>