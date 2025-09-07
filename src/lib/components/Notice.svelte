
<script>
    import { onDestroy } from "svelte";
    import { createEventDispatcher } from "svelte";

    // Props
    let { text = "", type = "success", autoHideMs = null } = $props();
    // type: "success" | "error" | "info"

    const dispatch = createEventDispatcher();
    let timer;

    onDestroy(() => clearTimeout(timer));

    function dismiss() {
        dispatch("dismiss");
    }

    // Keyboard: allow Escape to dismiss
    function onKeydown(e) {
        if (e.key === "Escape") dismiss();
    }

    const isError = type === "error";
    const bg = isError ? "#fdecea" : type === "info" ? "#eef3ff" : "#eef9f0";
    const fg = isError ? "#811d1d" : type === "info" ? "#1c3c86" : "#0b5e2b";
</script>

<div
    role={isError ? "alert" : "status"}
    aria-live={isError ? "assertive" : "polite"}
    onkeydown={onKeydown}
    style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(0,0,0,0.1);
        background: {bg};
        color: {fg};
        font-weight: 500;
    "
>
    <span style="user-select: text;">{text}</span>
    <button
        type="button"
        onclick={dismiss}
        style="
            padding: 0.35rem 0.6rem;
            border: 1px solid rgba(0,0,0,0.15);
            background: white;
            border-radius: 6px;
            cursor: pointer;
        "
    >
        OK
    </button>
</div>
