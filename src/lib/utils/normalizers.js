
import { get } from "svelte/store";
import { allPlatforms } from "$lib/stores/app.js";


// ---- Helpers ----

export function normalizeString(v, { lower = false } = {}) {
    if (v == null) return null;
    const trimmed = v.trim();
    if (trimmed === "") return null;
    return lower ? trimmed.toLowerCase() : trimmed;
}

export function normalizeNumber(v, precision = 6) {
    if (v == null || v === "") return null;
    const num = parseFloat(v);
    if (isNaN(num)) return null;
    return parseFloat(num.toFixed(precision));
}

export function normalizeSocial(social) {
    const platforms = get(allPlatforms);
    const platform = platforms.find((p) => p.id === social.platform_id);

    let handle = normalizeString(social.handle);

    if (handle) {
        if (handle.startsWith("@") || handle.startsWith("/")) {
            handle = handle.slice(1);
        }
        handle = handle.replace(/\s+/g, "");
    }

    return {
        platform_id: platform?.id || null,
        handle,
    };
}


// ---- Whole profile ----

export function normalizeProfile(profile = {}) {
    const out = {};

    if ("name" in profile) {
        out.name = normalizeString(profile.name);
    }

    if ("dob" in profile) {
        out.dob = profile.dob || null;
    }

    if ("username" in profile) {
        out.username = normalizeString(profile.username);
    }

    if ("gender" in profile) {
        out.gender = normalizeString(profile.gender, { lower: true });
    }

    if ("country_id" in profile) {
        out.country_id = profile.country_id;
    }

    if ("latitude" in profile) {
        out.latitude = normalizeNumber(profile.latitude);
    }

    if ("longitude" in profile) {
        out.longitude = normalizeNumber(profile.longitude);
    }

    if ("location" in profile) {
        out.location = normalizeString(profile.location);
    }

    if ("bio" in profile) {
        out.bio = normalizeString(profile.bio);
    }

    if ("interests" in profile) {
        out.interests = Array.isArray(profile.interests)
            ? profile.interests.filter(Boolean)
            : null;
    }

    if ("socials" in profile) {
        out.socials = Array.isArray(profile.socials)
            ? profile.socials.map(normalizeSocial)
            : null;
    }

    if ("star_sign" in profile) {
        out.star_sign = normalizeString(profile.star_sign);
    }

    if ("mbti" in profile) {
        const mbtiRaw = normalizeString(profile.mbti);
        out.mbti = mbtiRaw ? mbtiRaw.toUpperCase() : null;
    }

    if ("loop_bio" in profile) {
        out.loop_bio = normalizeString(profile.loop_bio);
    }

    if ("looking_for" in profile) {
        out.looking_for = normalizeString(profile.looking_for);
    }

    return out;
}
