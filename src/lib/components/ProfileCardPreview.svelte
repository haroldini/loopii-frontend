
<script>
    import { createEventDispatcher } from "svelte";
    import { getAvatarUrl } from "../utils/profile";
    import { countryMap } from "$lib/stores/app";

    export let profile;
    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }
</script>


<button
    type="button"
    class="bare fill preview-container clickableImg"
    on:click={open}
    aria-label="Open profile preview">
    <div
        class="circle"
        style={`background-image: url('${getAvatarUrl(profile)}'); background-size: cover; background-position: center;`}
    >
        <span class="age">{profile.age}</span>
        <span class="location"> {$countryMap[profile.country_id]?.code || profile.country_id}</span>
        <span class="gender">{profile.gender.slice(0, 1).toUpperCase()}</span>
    </div>
</button>


<style>
    .preview-container {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .circle {
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        width: 100%;
        height: auto;
        background: #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        position: relative;
    }

    .location {
        position: absolute;
        top: -0.25rem;
        font-size: 0.75rem;
    }

    .age {
        font-size: 1rem;
    }

    .clickableImg:hover {
        transform: scale(1.03);
    }

    .gender {
        position: absolute;
        bottom: -0.25rem;
        font-size: 0.75rem;
    }
</style>
