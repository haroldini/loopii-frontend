
import request from "$lib/utils/request.js";

// List profiles for moderation (cursor-paginated, sortable)
export function adminListProfiles({ limit = 50, after_id = null, sort = "recent_joined" } = {}) {
    const q = new URLSearchParams();
    q.set("limit", String(limit));
    if (after_id) q.set("after_id", String(after_id));
    if (sort) q.set("sort", String(sort));

    return request(`/admin/profiles?${q.toString()}`, { method: "GET" });
}

// Get a single profile with full admin detail (meta + reports + admin actions)
export function adminGetProfile(profile_id) {
    return request(`/admin/profiles/${profile_id}`, { method: "GET" });
}

// List reports for moderation (cursor-paginated, filterable)
export function adminListReports({
    limit = 50,
    after_id = null,
    status = null,
    reason_code = null,
    reportee_profile_id = null,
    reporter_profile_id = null,
} = {}) {
    const q = new URLSearchParams();
    q.set("limit", String(limit));
    if (after_id) q.set("after_id", String(after_id));
    if (status) q.set("status", String(status));
    if (reason_code) q.set("reason_code", String(reason_code));
    if (reportee_profile_id) q.set("reportee_profile_id", String(reportee_profile_id));
    if (reporter_profile_id) q.set("reporter_profile_id", String(reporter_profile_id));

    return request(`/admin/reports?${q.toString()}`, { method: "GET" });
}

// Update a report status (optionally bulk-update matching open reports)
export function adminSetReportStatus(report_id, data) {
    return request(`/admin/reports/${report_id}/set-status`, {
        method: "POST",
        data,
    });
}

// Warn a profile (sets access.status="warning" + optional public_message)
export function adminWarnProfile(profile_id, data) {
    return request(`/admin/profiles/${profile_id}/warn`, {
        method: "POST",
        data,
    });
}

// Permanently ban a profile (sets access.status="banned")
export function adminBanProfile(profile_id, data) {
    return request(`/admin/profiles/${profile_id}/ban`, {
        method: "POST",
        data,
    });
}

// Temporarily ban a profile (sets access.status="temp_banned" until ISO datetime)
export function adminTempBanProfile(profile_id, data) {
    return request(`/admin/profiles/${profile_id}/temp-ban`, {
        method: "POST",
        data,
    });
}

// Clear bans/warnings (sets access.status="active" and clears restriction fields)
export function adminUnbanProfile(profile_id, data) {
    return request(`/admin/profiles/${profile_id}/unban`, {
        method: "POST",
        data,
    });
}

// Clear or overwrite a specific profile text field (bio, loop_bio, etc.)
export function adminClearContent(profile_id, data) {
    return request(`/admin/profiles/${profile_id}/clear-content`, {
        method: "POST",
        data,
    });
}

// Delete a profile image row (DB only; storage handled elsewhere)
export function adminDeleteProfileImage(profile_id, image_id, data) {
    return request(`/admin/profiles/${profile_id}/delete-image/${image_id}`, {
        method: "POST",
        data,
    });
}

// Delete a profile audio row (DB only; storage handled elsewhere)
export function adminDeleteProfileAudio(profile_id, audio_id, data) {
    return request(`/admin/profiles/${profile_id}/delete-audio/${audio_id}`, {
        method: "POST",
        data,
    });
}
