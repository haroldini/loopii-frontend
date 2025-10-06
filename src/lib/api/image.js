
import request from "$lib/utils/request.js";

// Upload a new profile image
export function uploadProfileImage(file, accessLevel = 0) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("access_level", accessLevel);

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

// Set access level for a profile image
export function setImageAccessLevel(imageId, accessLevel) {
    return request(`/image/${imageId}/set-access-level`, {
        method: "PUT",
        data: { access_level: accessLevel },
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
