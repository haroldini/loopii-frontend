
// ----- MODERATION / ADMIN CONSTANTS -----

const ADMIN_PUBLIC_MESSAGE_MAX_LENGTH = 400;
const ADMIN_INTERNAL_NOTE_MAX_LENGTH = 1000;
const REPORT_DETAILS_MAX_LENGTH = 2000;

// Used in reports (frontend allowlist).
export const REPORT_REASON_CODE_OPTIONS = [
    { value: "sexual_content", label: "Sexual / pornographic content" },
    { value: "ai_generated_content", label: "AI-generated or misleading content" },
    { value: "adult_platform_promo", label: "Promotion of adult platforms" },
    { value: "hate_or_harassment", label: "Hate / harassment / targeted abuse" },
    { value: "threats_or_violence", label: "Threats / violence" },
    { value: "illegal_activity", label: "Illegal content / solicitation" },
    { value: "fake_socials", label: "Fake socials / socials aren't theirs" },
    { value: "impersonation", label: "Impersonation / misleading identity" },
    { value: "scam_or_phishing", label: "Scam / phishing / fraud" },
    { value: "marketing_or_leadgen", label: "Advertising / lead-gen / “DM me for…”" },
    { value: "bot_or_automation", label: "Bots / automation / manipulation" },
    { value: "minor_suspected", label: "Underage suspected" },
    { value: "self_harm", label: "Self-harm content" },
    { value: "multiple_accounts", label: "Multiple accounts" },
    { value: "other", label: "Other" },
];

// Admin can use all report reasons + admin ones
export const ADMIN_REASON_CODE_OPTIONS = [
    ...REPORT_REASON_CODE_OPTIONS,
    { value: "data_scraping", label: "Admin: Data scraping" },
    { value: "ban_evasion", label: "Admin: Ban evasion" },
    { value: "revert_action", label: "Admin: Revert previous action" },
    { value: "appeal_granted", label: "Admin: Appeal granted / reinstated" },
    { value: "safety_review", label: "Admin: Safety review" },
    { value: "testing", label: "Admin: Testing" },
];

const _REPORT_REASON_CODE_SET = new Set(REPORT_REASON_CODE_OPTIONS.map((o) => o.value));
const _ADMIN_REASON_CODE_SET = new Set(ADMIN_REASON_CODE_OPTIONS.map((o) => o.value));

export function validateReportReasonCode(reason, { field = "reason_code", required = true } = {}) {
    reason = typeof reason === "string" ? reason.trim() : "";
    if (!reason) {
        return required ? { field, message: "Reason code is required.", display: false } : null;
    }
    if (!_REPORT_REASON_CODE_SET.has(reason)) {
        return { field, message: "Reason code is not a supported option.", display: true };
    }
    return null;
}

export function validateAdminReasonCode(reason, { field = "reason_code", required = true } = {}) {
    reason = typeof reason === "string" ? reason.trim() : "";
    if (!reason) {
        return required ? { field, message: "Reason code is required.", display: false } : null;
    }
    if (!_ADMIN_REASON_CODE_SET.has(reason)) {
        return { field, message: "Reason code is not a supported option.", display: true };
    }
    return null;
}

export function validateReportDetails(details, { field = "details", required = false } = {}) {
    details = typeof details === "string" ? details.trim() : "";
    if (!details) {
        return required ? { field, message: "Details are required.", display: false } : null;
    }
    if (details.length > REPORT_DETAILS_MAX_LENGTH) {
        return {
            field,
            message: `Details must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.`,
            display: true,
        };
    }
    return null;
}

export function validatePublicMessage(message, { field = "public_message", required = false } = {}) {
    message = message?.trim();
    if (!message) {
        return required ? { field, message: "Public message is required.", display: false } : null;
    }
    if (message.length > ADMIN_PUBLIC_MESSAGE_MAX_LENGTH) {
        return {
            field,
            message: `Public message must be ${ADMIN_PUBLIC_MESSAGE_MAX_LENGTH} characters or fewer.`,
            display: true,
        };
    }
    return null;
}

export function validateInternalNote(note, { field = "internal_note", required = false } = {}) {
    note = note?.trim();
    if (!note) {
        return required ? { field, message: "Internal note is required.", display: false } : null;
    }
    if (note.length > ADMIN_INTERNAL_NOTE_MAX_LENGTH) {
        return {
            field,
            message: `Internal note must be ${ADMIN_INTERNAL_NOTE_MAX_LENGTH} characters or fewer.`,
            display: true,
        };
    }
    return null;
}

export function validateUntil(until, { field = "until", required = true } = {}) {
    if (!until) {
        return required ? { field, message: "Until is required.", display: false } : null;
    }
    const d = new Date(until);
    if (isNaN(d.getTime())) {
        return { field, message: "Invalid date/time.", display: true };
    }
    if (d.getTime() <= Date.now()) {
        return { field, message: "Until must be in the future.", display: true };
    }
    return null;
}


// ----- CONFIG CONSTANTS -----

const MIN_AGE_YEARS = 18;
const DOB_MIN_YEAR = 1900;

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;

const NAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 1000;
const LOCATION_MAX_LENGTH = 30;
const LOOP_BIO_MAX_LENGTH = 1000;
const LOOKING_FOR_MAX_LENGTH = 1000;

const MAX_INTERESTS = 15;

const ALLOWED_AVATAR_TYPES = ["image/jpeg"];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB


// ----- BASIC FIELD VALIDATORS -----

export function validateUsername(username) {
    username = username?.trim();
    if (!username) {
        return { field: "username", message: "Username is required", display: false };
    }
    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
        return {
            field: "username",
            message: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`,
            display: true,
        };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return {
            field: "username",
            message: "Username may only contain letters, numbers, and underscores",
            display: true,
        };
    }
    return null;
}

export function validateDOB(dob) {
    if (!dob) {
        return { field: "dob", message: "Date of birth is required", display: false };
    }

    const d = new Date(dob);
    if (isNaN(d.getTime())) {
        return { field: "dob", message: "Invalid date of birth", display: true };
    }

    const today = new Date();
    const minDate = new Date(today.getFullYear() - MIN_AGE_YEARS, today.getMonth(), today.getDate());

    if (d > today) {
        return { field: "dob", message: "Date of birth cannot be in the future", display: true };
    }
    if (d < new Date(`${DOB_MIN_YEAR}-01-01`)) {
        return { field: "dob", message: `Date of birth must be after ${DOB_MIN_YEAR}`, display: true };
    }
    if (d > minDate) {
        return {
            field: "dob",
            message: `You must be at least ${MIN_AGE_YEARS} years old`,
            display: true,
        };
    }
    return null;
}

export function validateGender(gender) {
    if (!gender) {
        return { field: "gender", message: "Gender is required", display: false };
    }
    return null;
}

export function validateCountry(country) {
    if (!country) {
        return { field: "country", message: "Country is required", display: false };
    }
    return null;
}

export function validateName(name) {
    name = name?.trim();
    if (name && name.length > NAME_MAX_LENGTH) {
        return {
            field: "name",
            message: `Display name must be ${NAME_MAX_LENGTH} characters or fewer`,
            display: true,
        };
    }
    return null;
}

export function validateBio(bio) {
    bio = bio?.trim();
    if (bio && bio.length > BIO_MAX_LENGTH) {
        return {
            field: "bio",
            message: `Bio must be ${BIO_MAX_LENGTH} characters or fewer`,
            display: true,
        };
    }
    return null;
}

export function validateLocation(location) {
    location = location?.trim();
    if (location && location.length > LOCATION_MAX_LENGTH) {
        return {
            field: "location",
            message: `Location must be ${LOCATION_MAX_LENGTH} characters or fewer`,
            display: true,
        };
    }
    return null;
}

export function validateLoopBio(loopBio) {
    loopBio = loopBio?.trim();
    if (loopBio && loopBio.length > LOOP_BIO_MAX_LENGTH) {
        return {
            field: "loop_bio",
            message: `Loop bio must be ${LOOP_BIO_MAX_LENGTH} characters or fewer`,
            display: true,
        };
    }
    return null;
}

export function validateLookingFor(lookingFor) {
    lookingFor = lookingFor?.trim();
    if (lookingFor && lookingFor.length > LOOKING_FOR_MAX_LENGTH) {
        return {
            field: "looking_for",
            message: `This field must be ${LOOKING_FOR_MAX_LENGTH} characters or fewer`,
            display: true,
        };
    }
    return null;
}


// ----- AVATAR VALIDATION -----

export function validateAvatar(avatarFile) {
    if (!avatarFile) {
        return { field: "avatar", message: "Profile picture is required", display: false };
    }

    if (!ALLOWED_AVATAR_TYPES.includes(avatarFile.type)) {
        return { field: "avatar", message: "Profile picture must be a JPEG", display: true };
    }

    const size = avatarFile.size;
    const formatted =
        size < 1024 * 1024
            ? (size / 1024).toFixed(2) + " KB"
            : (size / (1024 * 1024)).toFixed(2) + " MB";

    if (size > MAX_AVATAR_SIZE_BYTES) {
        return {
            field: "avatar",
            message: `Profile picture must be smaller than 5 MB (current: ${formatted})`,
            display: true,
        };
    }

    return null;
}


// ----- INTERESTS VALIDATION -----

export function validateInterests(interests) {
    if (interests && interests.length > MAX_INTERESTS) {
        return {
            field: "interests",
            message: `You can select up to ${MAX_INTERESTS} interests`,
            display: true,
        };
    }
    return null;
}


// ----- SOCIALS VALIDATION -----

export function validateSocials(socials) {
    if (!socials || socials.length === 0) return [];

    const errors = [];

    socials.forEach((s, idx) => {
        const field = `socials.${idx}`;

        if (!s.platform_id) {
            errors.push({
                field,
                message: "Platform missing or invalid",
                display: true,
            });
            return;
        }

        const handle = s.handle?.trim();

        if (!handle) {
            errors.push({ field, message: "Username required", display: false });
            return;
        }

        if (handle.length > 50) {
            errors.push({
                field,
                message: "Username must be at most 50 characters",
                display: true,
            });
            return;
        }

        if (/\s/.test(handle)) {
            errors.push({
                field,
                message: "Username cannot contain spaces",
                display: true,
            });
            return;
        }
    });

    return errors;
}


// ----- ADMIN: CLEAR CONTENT VALIDATION (reuses existing validators) -----

export const ADMIN_CLEAR_FIELD_OPTIONS = [
    { value: "bio", label: "bio" },
    { value: "loop_bio", label: "loop_bio" },
    { value: "looking_for", label: "looking_for" },
    { value: "location", label: "location" },
    { value: "name", label: "name" },
];

const _CLEAR_FIELD_SET = new Set(ADMIN_CLEAR_FIELD_OPTIONS.map((o) => o.value));

export function validateAdminClearField(fieldKey, { field = "field_key" } = {}) {
    if (!fieldKey || !_CLEAR_FIELD_SET.has(fieldKey)) {
        return { field, message: "Invalid field key.", display: true };
    }
    return null;
}

export function validateAdminClearValue(fieldKey, value, { field = "field_value" } = {}) {
    const eField = validateAdminClearField(fieldKey, { field: "field_key" });
    if (eField) return eField;

    const v = typeof value === "string" ? value.trim() : value;

    if (v == null || v === "") return null;

    const map = {
        bio: validateBio,
        loop_bio: validateLoopBio,
        looking_for: validateLookingFor,
        location: validateLocation,
        name: validateName,
    };

    const validator = map[fieldKey];
    if (!validator) return { field, message: "Invalid field key.", display: true };

    return validator(v);
}


// ----- AGGREGATOR FUNCTION (Profile Fields) -----

export function validateProfileFields(fields) {
    const validators = {
        username: validateUsername,
        dob: validateDOB,
        gender: validateGender,
        country: validateCountry,
        name: validateName,
        bio: validateBio,
        location: validateLocation,
        interests: validateInterests,
        avatarFile: validateAvatar,
        loop_bio: validateLoopBio,
        looking_for: validateLookingFor,
    };

    const errors = [];

    for (const [key, validator] of Object.entries(validators)) {
        if (fields[key] !== undefined) {
            const result = validator(fields[key]);
            if (result) {
                if (Array.isArray(result)) errors.push(...result);
                else errors.push(result);
            }
        }
    }

    // socials are special because they can return multiple entries
    if (fields.socials !== undefined) {
        const socialErrors = validateSocials(fields.socials);
        if (socialErrors.length) errors.push(...socialErrors);
    }

    return errors;
}
