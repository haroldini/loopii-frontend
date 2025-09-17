

// Build a secure link based on a social entry and the platform map
export function buildSocialLink(social, platformMap) {
    
    // Normalize custom link (prepend https:// if missing)
    if (social.custom_link) {
        let link = social.custom_link.trim();
        if (!/^https?:\/\//i.test(link)) {
            link = "https://" + link;
        }
        try {
            new URL(link); // will throw if invalid
            return link;
        } catch {
            return null; // invalid
        }
    }

    // Build from handle and platform pattern
    if (social.platform_id && social.handle) {
        const platform = platformMap[social.platform_id];
        if (platform?.url_pattern) {
            // e.g. "https://twitter.com/{handle}"
            const url = platform.url_pattern.replace("{handle}", encodeURIComponent(social.handle));
            console.log("Built URL:", url);
            return url;
        }
    }

    return null;
}
