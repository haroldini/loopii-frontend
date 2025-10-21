
import request from "$lib/utils/request.js";

// Upload a new profile image
export function uploadProfileImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/image/upload", {
        method: "POST",
        body: formData,
    });
}

// Set a profile image as the avatar
export function setProfileAvatar(imageId) {
    return request(`/image/${imageId}/set-avatar`, {
        method: "PUT",
    });
}

// Get all profile images for the logged-in user
export function getMyProfileImages() {
    return request("/image/me", {
        method: "GET",
    });
}

// Delete a profile image by ID
export function deleteProfileImage(imageId) {
    return request(`/image/${imageId}`, {
        method: "DELETE",
    });
}
