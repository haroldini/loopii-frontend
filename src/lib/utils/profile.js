
// Get the avatar URL from a profile object
export function getAvatarUrl(profile, size = "medium") {
    if (!profile || typeof profile !== "object") return null; 
    const avatar = profile.images?.find?.(img => img?.is_avatar);
    return avatar?.urls?.[size] || null;
}