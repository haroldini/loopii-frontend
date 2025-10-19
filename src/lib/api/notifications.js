
import request from "$lib/utils/request.js";

// Get paginated notifications for the logged-in user
export function getNotifications({ limit = 20, after_id = null } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (after_id) query.set("after_id", after_id);
    return request(`/notifications/get-user-notifications?${query.toString()}`, { method: "GET" });
}

// Mark a notification as read
export function markNotificationRead(notificationId) {
    return request(`/notifications/mark-read/${notificationId}`, {
        method: "POST"
    });
}

// Mark all notifications as read
export function markAllNotificationsRead() {
    return request("/notifications/mark-all-read", {
        method: "POST"
    });
}

// Delete all read notifications
export function deleteAllReadNotifications() {
    return request("/notifications/delete-all-read", {
        method: "DELETE"
    });
}