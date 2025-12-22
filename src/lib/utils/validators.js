
// ----- CONFIG CONSTANTS -----

const MIN_AGE_YEARS = 18;
const DOB_MIN_YEAR = 1900;

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

const NAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 500;
const LOCATION_MAX_LENGTH = 50;
const LOOP_BIO_MAX_LENGTH = 500;
const LOOKING_FOR_MAX_LENGTH = 500;

const MAX_INTERESTS = 20;

const ALLOWED_AVATAR_TYPES = ["image/jpeg"];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB


// ----- BASIC FIELD VALIDATORS -----

export function validateUsername(username) {
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

        if (handle.startsWith("@") || handle.startsWith("/")) {
            errors.push({
                field,
                message: "Username cannot start with '@' or '/'",
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
