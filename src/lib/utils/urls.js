

// Build a secure link based on a social entry and the platform map
export function buildSocialLink(social, platformMap) {
    if (social.platform_id && social.handle) {
        const platform = platformMap[social.platform_id];
        if (platform?.url_pattern) {
            return platform.url_pattern.replace("{handle}", encodeURIComponent(social.handle));
        }
    }
    return null;
}
