
import { writable, derived, get } from "svelte/store";
import { createProfile, getProfile, createProfileInterests, createProfileSocials, checkUsernameAvailability } from "$lib/api/profile.js";
import { uploadProfileImage, setProfileAvatar } from "$lib/api/image.js";
import { profile, profileState } from "$lib/stores/profile.js";
import { validateProfileFields } from "$lib/utils/validators.js";
import { normalizeProfile } from "$lib/utils/normalizers.js";
import { addToast } from "$lib/stores/popups.js";
import { updateSearchPrefs, updateVisibilityPrefs } from "$lib/api/prefs.js";
import { ENVIRONMENT } from "$lib/utils/env.js";


const isDev = ENVIRONMENT === "dev";


// --- Form state ---
export const username = writable(null);
export const dob = writable(null);
export const gender = writable(null);
export const country = writable(null);
export const name = writable(null);
export const bio = writable(null);
export const location = writable(null);
export const latitude = writable(null);
export const longitude = writable(null);
export const selectedInterests = writable([]);
export const socials = writable([]);
export const loop_bio = writable(null);
export const looking_for = writable(null);


// Avatar image state
export const avatarFile = writable(null);
export const avatarOriginalUrl = writable(null);
export const avatarCropState = writable(null);
export const avatarUrl = derived(avatarFile, ($file, set) => {
	if ($file) {
		const url = URL.createObjectURL($file);
		set(url);
		return () => URL.revokeObjectURL(url);
	} else {
		set(null);
	}
});


// --- UI state ---
export const currentPage = writable(0);
export const validationErrors = writable([]);
export const error = writable(null);
export const submissionProgress = writable(null);
export const profileFormState = writable("idle");
// "idle" | "submitting" | "success" | "exists" | "partial" | "error"


// Username availability: "idle" | "checking" | "available" | "taken" | "error"
export const usernameAvailability = writable({
    state: "idle",
    message: null,
});

// Reset username availability when username changes
username.subscribe(() => {
    usernameAvailability.set({ state: "idle", message: null });
});


// Onboarding prefs (from PrefsForm)
export const prefsState = writable({
	payload: null,
	valid: true,
});

export const pageFields = {
	0: ["username", "dob", "gender", "country", "name", "avatar"],
	1: ["bio", "interests", "latitude", "longitude", "looking_for"],
	2: ["socials", "loop_bio"],
	3: [],
};


// --- Validation ---
export function validateProfile(
	username, dob, gender, country, name, bio,
	location, selectedInterests, socials, avatarFile,
	loop_bio, looking_for
) {
	const errors = validateProfileFields({
		username, dob, gender, country, name, bio,
		location, interests: selectedInterests, socials, avatarFile,
		loop_bio, looking_for
	});
	validationErrors.set(errors);
	return errors.length === 0;
}


// --- Derived: ready to submit ---
export const readyToSubmit = derived(
	[
		currentPage, username, dob, gender, country,
		name, bio, location, selectedInterests, socials,
		avatarFile, loop_bio, looking_for,
	],
	([
		$currentPage, $username, $dob, $gender, $country,
		$name, $bio, $location, $selectedInterests, $socials,
		$avatarFile, $loop_bio, $looking_for,
	]) => {
		const allValid = validateProfile(
			$username, $dob, $gender, $country, $name, $bio,
			$location, $selectedInterests, $socials, $avatarFile,
			$loop_bio, $looking_for,
		);

		const isLastPage = $currentPage === 3;
		if (isLastPage) return allValid;

		const fields = pageFields[$currentPage] || [];
		const errs = get(validationErrors);
		const pageErrors = errs.filter((e) => {
			if (fields.includes(e.field)) return true;
			if (fields.includes("socials") && typeof e.field === "string" && e.field.startsWith("socials.")) {
				return true;
			}
			return false;
		});
		return pageErrors.length === 0;
	},
	false
);


// --- Socials helpers ---
export function removeSocial(i) {
	socials.update(s => {
		s.splice(i, 1);
		return [...s];
	});
}

export function updateHandle(i, value) {
	socials.update(s => {
		s[i].handle = value;
		return [...s];
	});
}


// --- Check username availability ---
export async function ensureUsernameAvailable() {
    const value = (get(username) || "").trim();

    if (!value) {
        usernameAvailability.set({
            state: "error",
            message: "Username is required",
        });
        return false;
    }

    try {
        usernameAvailability.set({ state: "checking", message: null });

        const res = await checkUsernameAvailability(value); // { available: boolean, username: string }

        if (res.available) {
            usernameAvailability.set({ state: "available", message: null });
            return true;
        } else {
            usernameAvailability.set({
                state: "taken",
                message: "This username is already taken",
            });
            return false;
        }
    } catch (err) {
		if (isDev) console.error("Username availability check failed:", err);
        usernameAvailability.set({
            state: "error",
            message: "Could not check username availability, please try again",
        });
        return false;
    }
}


// --- Submit profile ---
export async function submitProfile() {
	profileFormState.set("submitting");
	submissionProgress.set("Creating your profile");
	error.set(null);

	try {
		if (!get(readyToSubmit)) {
			error.set("Please fix validation errors");
			profileFormState.set("error");
			return;
		}

		const normalized = normalizeProfile({
			username: get(username),
			dob: get(dob),
			gender: get(gender),
			country_id: get(country),
			name: get(name),
			bio: get(bio),
			location: get(location),
			latitude: get(latitude),
			longitude: get(longitude),
			loop_bio: get(loop_bio),
			looking_for: get(looking_for),
			socials: get(socials),
			interests: get(selectedInterests),
		});

		// Step 1: Create profile
		let createdProfile;
		try {
			submissionProgress.set("Creating your profile");
			createdProfile = await createProfile({
				username: normalized.username,
				dob: normalized.dob,
				gender: normalized.gender,
				country_id: normalized.country_id,
				name: normalized.name,
				bio: normalized.bio,
				loop_bio: normalized.loop_bio,
				looking_for: normalized.looking_for,
				location: normalized.location,
				latitude: normalized.latitude,
				longitude: normalized.longitude,
			});
		} catch (err) {
    		if (err.status === 409) {
				const msg = "You already have a profile. Continuing to app...";
				error.set(msg);
				addToast({
					variant: "banner",
					text: "Welcome back to loopii!",
					description: msg,
					autoHideMs: null,
				});
				profileFormState.set("exists");
			} else if (err.status === 422) {
				error.set(err.message || "Invalid profile data");
				profileFormState.set("error");
			} else {
				error.set(err.message || "Couldn't create profile");
				profileFormState.set("error");
			}
			return;
		}

		// Step 2: Interests
		let interestsError = false;
		if (normalized.interests && normalized.interests.length > 0) {
			try {
				submissionProgress.set("Adding your interests");
				await createProfileInterests({ interest_ids: normalized.interests });
			} catch {
				if (isDev) console.error("Interests save failed:", err);
				interestsError = true;
			}
		}

		// Step 3: Socials
		let socialsError = false;
		if (normalized.socials && normalized.socials.length > 0) {
			try {
				submissionProgress.set("Adding your socials");
				await createProfileSocials({ socials: normalized.socials });
			} catch {
				if (isDev) console.error("Socials save failed:", err);
				socialsError = true;
			}
		}

		// Step 4: Avatar
		let avatarError = false;
		try {
			const $avatarFile = get(avatarFile);
			if ($avatarFile) {
				submissionProgress.set("Uploading profile picture");
				const uploadRes = await uploadProfileImage($avatarFile);
				const imageId = uploadRes.id;
				await setProfileAvatar(imageId);
			}
		} catch (err) {
			if (isDev) console.error("Avatar upload failed:", err);
			avatarError = true;
		}

		// Preferences (search + visibility-genders)
		let searchPrefsError = false;
		let visibilityPrefsError = false;

		const prefsSnapshot = get(prefsState) || {};
		const prefsPayload = prefsSnapshot.payload ?? null;
		const prefsValid = prefsSnapshot.valid ?? true;

		if (prefsValid && prefsPayload) {
			const {
				genders = null,
				age_min = null,
				age_max = null,
				country_ids = null,
				proximity_km = null,
				proximity_lat = null,
				proximity_lng = null,
			} = prefsPayload;

			// Search prefs: full payload
			try {
				submissionProgress.set("Setting your preferences");
				const searchPayload = {
					genders,
					age_min,
					age_max,
					country_ids,
					proximity_km,
					proximity_lat,
					proximity_lng,
				};
				const savedSearch = await updateSearchPrefs(searchPayload);

				const current = get(profile);
				if (current) {
					profile.set({
						...current,
						search_prefs: savedSearch,
					});
				}
			} catch (err) {
				if (isDev) console.error("Search prefs save failed:", err);
				searchPrefsError = true;
			}

			// Visibility prefs: only genders + is_visible = true
			if (Array.isArray(genders) && genders.length > 0) {
				try {
					submissionProgress.set("Setting your preferences");
					const visibilityPayload = {
						genders,
						age_min: null,
						age_max: null,
						country_ids: null,
						proximity_km: null,
						proximity_lat: null,
						proximity_lng: null,
						is_visible: true,
					};
					const savedVisibility = await updateVisibilityPrefs(visibilityPayload);

					const current = get(profile);
					if (current) {
						profile.set({
							...current,
							visibility_prefs: savedVisibility,
						});
					}
				} catch (err) {
					if (isDev) console.error("Visibility prefs save failed:", err);
					visibilityPrefsError = true;
				}
			}
		}

		// Step 5: Handle partial success
		if (interestsError || socialsError || avatarError || searchPrefsError || visibilityPrefsError) {
			const parts = [];
			if (interestsError) parts.push("interests");
			if (socialsError) parts.push("socials");
			if (avatarError) parts.push("profile picture");
			if (searchPrefsError) parts.push("search preferences");
			if (visibilityPrefsError) parts.push("visibility preferences");

			let msg = "Your profile was created, but we couldn't add your ";
			if (parts.length === 1) msg += parts[0];
			else if (parts.length === 2) msg += parts.join(" and ");
			else msg += parts.slice(0, -1).join(", ") + " and " + parts.at(-1);

			msg += " — please try adding them later from your profile page.";
			error.set(msg);
			addToast({
				variant: "banner",
				text: "Welcome to loopii!",
				description: msg,
				autoHideMs: null,
			});
			profileFormState.set("partial");
		} else {
			addToast({
				variant: "banner",
				text: "Welcome to loopii!",
				description: "Your profile is ready.",
				autoHideMs: 5000,
			});
			profileFormState.set("success");
		}

		// Step 6: Fetch profile
		try {
			submissionProgress.set("Done. Logging you in");
			const fetchedProfile = await getProfile();
			profile.set(fetchedProfile);
			profileState.set("loaded");
		} catch {
			// ignore
		}
	} catch (err) {
		error.set(err.message || "Unexpected error");
		profileFormState.set("error");
	} finally {
		submissionProgress.set(null);
		if (["exists", "success", "partial"].includes(get(profileFormState))) {
			resetFields();
		}
	}
}


// --- Reset ---
function resetFields() {
	name.set(null);
	username.set(null);
	dob.set(null);
	gender.set(null);
	country.set(null);
	bio.set(null);
	location.set(null);
	latitude.set(null);
	longitude.set(null);
	selectedInterests.set([]);
	loop_bio.set(null);
	looking_for.set(null);
	socials.set([]);
	avatarFile.set(null);
	avatarOriginalUrl.set(null);
	avatarCropState.set(null);
	prefsState.set({ payload: null, valid: true });
}

export function resetState() {
	error.set(null);
	validationErrors.set([]);
	currentPage.set(0);
	profileFormState.set("idle");
}

export function resetAllCreateProfile() {
    resetFields();
    resetState();
}
