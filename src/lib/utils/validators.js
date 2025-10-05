
// ----- BASIC FIELD VALIDATORS -----

export function validateUsername(username) {
	if (!username) {
		return { field: "username", message: "Username is required", display: false };
	}
	if (username.length < 3 || username.length > 30) {
		return { field: "username", message: "Username must be 3–30 characters", display: true };
	}
	if (!/^[a-zA-Z0-9_]+$/.test(username)) {
		return { field: "username", message: "Username may only contain letters, numbers, underscores", display: true };
	}
	return null;
}

export function validateDOB(dob) {
	if (!dob) {
		return { field: "dob", message: "Date of birth is required", display: false };
	}
	const d = new Date(dob);
	const today = new Date();
	const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

	if (d > today) {
		return { field: "dob", message: "Date of birth cannot be in the future", display: true };
	}
	if (d < new Date("1900-01-01")) {
		return { field: "dob", message: "Date of birth must be after 1900", display: true };
	}
	if (d > minDate) {
		return { field: "dob", message: "You must be at least 13 years old", display: true };
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
	if (name && name.length > 30) {
		return { field: "name", message: "Display name must be 30 characters or fewer", display: true };
	}
	return null;
}

export function validateBio(bio) {
	if (bio && bio.length > 500) {
		return { field: "bio", message: "Bio must be 500 characters or fewer", display: true };
	}
	return null;
}

export function validateLocation(location) {
	if (location && location.length > 50) {
		return { field: "location", message: "Location must be 50 characters or fewer", display: true };
	}
	return null;
}

// ----- AVATAR VALIDATION -----

export function validateAvatar(avatarFile) {
	if (!avatarFile) {
		return { field: "avatar", message: "Profile picture is required", display: false };
	}

	const allowedTypes = ["image/jpeg"];
	if (!allowedTypes.includes(avatarFile.type)) {
		return { field: "avatar", message: "Profile picture must be a JPEG", display: true };
	}

	const maxSize = 5 * 1024 * 1024; // 5 MB
	const size = avatarFile.size;
	const formatted =
		size < 1024 * 1024
			? (size / 1024).toFixed(2) + " KB"
			: (size / (1024 * 1024)).toFixed(2) + " MB";

	if (size > maxSize) {
		return {
			field: "avatar",
			message: `Profile picture must be smaller than 5 MB (current: ${formatted})`,
			display: true
		};
	}

	return null;
}

// ----- INTERESTS VALIDATION -----

export function validateInterests(interests) {
	if (interests && interests.length > 20) {
		return { field: "interests", message: "You can select up to 20 interests", display: true };
	}
	return null;
}

// ----- SOCIALS VALIDATION -----

export function validateSocials(socials) {
	if (!socials || socials.length === 0) return [];

	const errors = [];

	socials.forEach((s, idx) => {
		const field = `socials.${idx}`;

		// Case 1: predefined platform
		if (s.platform_id) {
			if (!s.handle || !s.handle.trim()) {
				errors.push({ field, message: "Handle required", display: true });
			} else if (s.handle.trim().length > 50) {
				errors.push({ field, message: "Handle too long", display: true });
			}
			return;
		}

		// Case 2: custom platform
		if (s.custom_platform || s.custom_link) {
			if (!s.custom_platform || !s.custom_platform.trim()) {
				errors.push({ field, message: "Custom platform required", display: true });
			} else if (s.custom_platform.trim().length > 30) {
				errors.push({ field, message: "Custom platform too long", display: true });
			}

			const link = s.custom_link?.trim();
			if (!link) {
				errors.push({ field, message: "Custom link required", display: true });
			} else {
				if (link.length > 150) {
					errors.push({ field, message: "Custom link too long", display: true });
				}
				try {
					const u = new URL(link);
					const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
					if (!domainRegex.test(u.hostname)) {
						errors.push({ field, message: "Custom link must have a valid domain", display: true });
					}
				} catch {
					errors.push({ field, message: "Custom link must be a valid URL", display: true });
				}
			}
			return;
		}

		// Neither case satisfied
		errors.push({
			field,
			message: "Must provide either platform+handle or custom platform+link",
			display: true
		});
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