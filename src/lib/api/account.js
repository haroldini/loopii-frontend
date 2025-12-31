
import request from "$lib/utils/request.js";

// Change the user's password, validating the current password
export function updatePassword({ currentPassword, newPassword, captchaToken }) {
    return request("/account/update-password", {
        method: "POST",
        data: { current_password: currentPassword, new_password: newPassword, captcha_token: captchaToken }
    });
}

// Delete the user's account, validating the current password
export function deleteAccount({ currentPassword, captchaToken }) {
    return request("/account/delete-account", {
        method: "POST",
        data: { current_password: currentPassword, captcha_token: captchaToken }
    });
}
