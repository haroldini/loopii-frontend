
let overlayInstance = null;

export function registerCaptchaOverlay(instance) {
    overlayInstance = instance;
}

export async function solveCaptcha(opts = {}) {
    if (!overlayInstance || typeof overlayInstance.openAndSolve !== "function") {
        throw new Error("captcha_overlay_not_registered");
    }
    return overlayInstance.openAndSolve(opts);
}
