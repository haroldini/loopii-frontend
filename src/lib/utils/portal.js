
export function portal(node, target = "body") {
    if (typeof document === "undefined") {
        return {};
    }

    let targetEl = typeof target === "string" ? document.querySelector(target) : target;
    if (!targetEl) targetEl = document.body;

    const parent = node.parentNode;
    const placeholder = document.createComment("portal");

    if (parent) {
        parent.insertBefore(placeholder, node);
    }

    targetEl.appendChild(node);

    return {
        update(nextTarget) {
            const nextEl =
                typeof nextTarget === "string" ? document.querySelector(nextTarget) : nextTarget;

            if (nextEl && nextEl !== targetEl) {
                targetEl = nextEl;
                targetEl.appendChild(node);
            }
        },
        destroy() {
            if (placeholder.parentNode) {
                placeholder.parentNode.insertBefore(node, placeholder);
                placeholder.remove();
            } else {
                node.remove();
            }
        },
    };
}
