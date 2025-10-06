
import { get } from "svelte/store";
import { allCountries, allPlatforms } from "$lib/stores/app";


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

export function normalizeLink(v) {
    let link = normalizeString(v);
    if (!link) return null;

    // add https:// if missing
    if (!/^https?:\/\//i.test(link)) {
        link = "https://" + link;
    }

    try {
        const url = new URL(link);
        url.hostname = url.hostname.toLowerCase();
        return url.toString();
    } catch {
        return link;
    }
}

export function normalizeSocial(social) {
    const platforms = get(allPlatforms);
    const platform = platforms.find(p => p.id === social.platform_id);

    return {
        platform_id: platform?.id || null,
        custom_platform: normalizeString(social.custom_platform),
        custom_link: normalizeLink(social.custom_link),
        handle: normalizeString(social.handle),
    };
}


// ---- Whole profile ----

export function normalizeProfile(profile = {}) {
    const out = {};

    if ("name" in profile)
        out.name = normalizeString(profile.name);

    if ("dob" in profile)
        out.dob = profile.dob || null;

    if ("username" in profile)
        out.username = normalizeString(profile.username);

    if ("gender" in profile)
        out.gender = normalizeString(profile.gender, { lower: true });

    if ("country_id" in profile)
        out.country_id = profile.country_id;

    if ("latitude" in profile)
        out.latitude = normalizeNumber(profile.latitude);

    if ("longitude" in profile)
        out.longitude = normalizeNumber(profile.longitude);

    if ("location" in profile)
        out.location = normalizeString(profile.location);

    if ("bio" in profile)
        out.bio = normalizeString(profile.bio);

    if ("interests" in profile)
        out.interests = Array.isArray(profile.interests)
            ? profile.interests.filter(Boolean)
            : null;

    if ("socials" in profile)
        out.socials = Array.isArray(profile.socials)
            ? profile.socials.map(normalizeSocial)
            : null;

    return out;
}