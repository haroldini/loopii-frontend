
export function timeAgo(date, short = false) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

    const divisions = [
        { amount: 60, name: "second", short: "s" },
        { amount: 60, name: "minute", short: "m" },
        { amount: 24, name: "hour",   short: "h" },
        { amount: 7,  name: "day",    short: "d" },
        { amount: 4.34524, name: "week",  short: "w" },
        { amount: 12, name: "month",  short: "mo" },
        { amount: Infinity, name: "year", short: "y" },
    ];

    let duration = seconds;

    for (const division of divisions) {
        if (Math.abs(duration) < division.amount) {
            const value = Math.round(duration);

            if (short) {
                return `${value}${division.short} ago`;
            }

            const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
            return rtf.format(-value, division.name);
        }

        duration /= division.amount;
    }
}

/**
 * Haversine distance in kilometers between two lat/lng pairs.
 * Returns null if inputs are not valid numbers.
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
    const nums = [lat1, lon1, lat2, lon2];
    if (nums.some((n) => typeof n !== "number" || Number.isNaN(n))) {
        return null;
    }

    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function formatLastSeenShort(date) {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";

    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(months / 12);
    return `${years}y ago`;
}

export function formatNumber(n) {
    if (typeof n !== "number" || !isFinite(n)) return "";
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatStarSign(sign) {
    if (!sign || typeof sign !== "string") return "";
    return sign.charAt(0).toUpperCase() + sign.slice(1);
}

/**
 * Build a human-readable proximity label between two profiles.
 */
export function computeDistanceLabel(target, viewer) {
    if (!target || !viewer) return null;
    if (!target.id || !viewer.id) return null;
    if (target.id === viewer.id) return null;

    const hasTargetCoords =
        typeof target.latitude === "number" &&
        typeof target.longitude === "number";
    const hasViewerCoords =
        typeof viewer.latitude === "number" &&
        typeof viewer.longitude === "number";

    if (!hasTargetCoords || !hasViewerCoords) return null;

    const d = distanceKm(
        target.latitude,
        target.longitude,
        viewer.latitude,
        viewer.longitude
    );

    if (d == null || !isFinite(d)) return null;

    const prefs = viewer.search_prefs || null;
    const hasProximityFilters =
        prefs &&
        typeof prefs.proximity_km === "number" &&
        typeof prefs.proximity_lat === "number" &&
        typeof prefs.proximity_lng === "number";

    if (!hasProximityFilters && d >= 100) return null;

    if (d < 1) return "<1 km away";

    if (d < 100) {
        const rounded = Math.round(d * 10) / 10;
        return `${rounded.toLocaleString
            ? rounded.toLocaleString("en-US")
            : rounded} km away`;
    }

    const rounded = Math.round(d);
    return `${formatNumber(rounded)} km away`;
}
