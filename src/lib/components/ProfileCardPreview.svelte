
<script>
    import { createEventDispatcher } from "svelte";

    export let profile;
    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }
</script>


<button
    type="button"
    class="preview"
    on:click={open}
    aria-label="Open profile preview">
    <div class="circle">
        <span class="age">{profile.age}</span>
        <span class="gender">{profile.gender.slice(0, 1).toUpperCase()}</span>
    </div>
</button>


<style>
    .preview {
        border: none;
        background: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
    }

    .circle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        position: relative;
    }

    .age {
        font-size: 1rem;
    }

    .gender {
        position: absolute;
        bottom: -5px;
        right: -5px;
        background: #fff;
        border: 1px solid #aaa;
        border-radius: 50%;
        padding: 0.25rem;
        font-size: 0.7rem;
    }
</style>
