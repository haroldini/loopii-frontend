
import request from "$lib/utils/request.js";

// Upload a new profile audio clip
export function uploadProfileAudio(file) {
    const formData = new FormData();
    formData.append("file", file);

    return request("/audio/upload", {
        method: "POST",
        body: formData,
    });
}

// Get the current profile audio for the logged-in user
export function getMyProfileAudio() {
    return request("/audio/me", {
        method: "GET",
    });
}

// Delete a profile audio by ID
export function deleteProfileAudio(audioId) {
    return request(`/audio/${audioId}`, {
        method: "DELETE",
    });
}
