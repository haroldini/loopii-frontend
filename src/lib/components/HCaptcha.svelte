
<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";

    export let sitekey;
    export let theme = "dark";
    export let size = "normal";

    const dispatch = createEventDispatcher();

    let container;
    let widgetId = null;
    let token = "";

    function emit(t) {
        token = t || "";
        dispatch("token", { token });
    }

    function renderWidget() {
        if (!window.hcaptcha || !container || widgetId !== null) return;

        widgetId = window.hcaptcha.render(container, {
            sitekey,
            theme,
            size,
            callback: (t) => emit(t),
            "expired-callback": () => emit(""),
            "error-callback": () => emit(""),
        });
    }

    function loadScriptOnce() {
        if (window.hcaptcha) return Promise.resolve();

        if (document.querySelector('script[data-hcaptcha="1"]')) {
            return new Promise((resolve) => {
                const i = setInterval(() => {
                    if (window.hcaptcha) {
                        clearInterval(i);
                        resolve();
                    }
                }, 50);
            });
        }

        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
            s.async = true;
            s.defer = true;
            s.dataset.hcaptcha = "1";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load hCaptcha script"));
            document.head.appendChild(s);
        });
    }

    export function reset() {
        try {
            if (window.hcaptcha && widgetId !== null) {
                window.hcaptcha.reset(widgetId);
            }
        } finally {
            emit("");
        }
    }

    onMount(async () => {
        await loadScriptOnce();
        renderWidget();
    });

    onDestroy(() => {
        widgetId = null;
    });
</script>


<div bind:this={container}></div>
