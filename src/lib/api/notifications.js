
import request from "$lib/utils/request.js";

// Get paginated notifications for the logged-in user
export function getNotifications({ limit = 20, offset = 0 } = {}) {
    return request(`/notifications/get-user-notifications?limit=${limit}&offset=${offset}`, {
        method: "GET"
    });
}

// Mark a notification as read
export function markNotificationRead(notificationId) {
    return request(`/notifications/mark-read/${notificationId}`, {
        method: "POST"
    });
}
