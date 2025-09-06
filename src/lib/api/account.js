
import request from "$lib/utils/request.js";

// Change the user's password, validating the current password
export function updatePassword({ currentPassword, newPassword }) {
    return request("/account/update-password", {
        method: "POST",
        data: { current_password: currentPassword, new_password: newPassword }
    });
}

// Delete the user's account, validating the current password
export function deleteAccount({ currentPassword }) {
    return request("/account/delete-account", {
        method: "POST",
        data: { current_password: currentPassword }
    });
}