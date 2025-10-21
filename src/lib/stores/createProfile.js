
import { writable, derived, get } from "svelte/store";
import { createProfile, getProfile, createProfileInterests, createProfileSocials } from "$lib/api/profile";
import { uploadProfileImage, setProfileAvatar } from "$lib/api/image";
import { allCountries, allInterests, allPlatforms } from "$lib/stores/app";
import { profile } from "$lib/stores/profile";
import { validateProfileFields } from "$lib/utils/validators";
import { normalizeProfile } from "$lib/utils/normalizers";


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

export const pageFields = {
	0: ["username", "dob", "gender", "country", "name", "avatar"],
	1: ["bio", "interests", "latitude", "longitude", "location"],
	2: ["socials"]
};


// --- Validation ---
export function validateProfile(
	username, dob, gender, country, name, bio,
	location, selectedInterests, socials, avatarFile
) {
	const errors = validateProfileFields({
		username, dob, gender, country, name, bio,
		location, interests: selectedInterests, socials, avatarFile
	});
	validationErrors.set(errors);
	return errors.length === 0;
}


// --- Derived: ready to submit ---
export const readyToSubmit = derived(
	[currentPage, username, dob, gender, country, name, bio, location, selectedInterests, socials, avatarFile],
	([$currentPage, $username, $dob, $gender, $country, $name, $bio, $location, $selectedInterests, $socials, $avatarFile]) => {
		const allValid = validateProfile(
			$username, $dob, $gender, $country, $name, $bio, $location, $selectedInterests, $socials, $avatarFile
		);
		if ($currentPage === 2) return allValid;

		const fields = pageFields[$currentPage] || [];
		const pageErrors = get(validationErrors).filter(e => fields.includes(e.field));
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


// --- Submit profile ---
export async function submitProfile() {
	profileFormState.set("submitting");
	submissionProgress.set("Creating profile");
	error.set(null);

	try {
		if (!get(readyToSubmit)) {
			error.set("Please fix validation errors");
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
			socials: get(socials),
			interests: get(selectedInterests),
		});

		// Step 1: Create profile
		let createdProfile;
		try {
			submissionProgress.set("Creating profile");
			createdProfile = await createProfile({
				username: normalized.username,
				dob: normalized.dob,
				gender: normalized.gender,
				country_id: normalized.country_id,
				name: normalized.name,
				bio: normalized.bio,
				location: normalized.location,
				latitude: normalized.latitude,
				longitude: normalized.longitude,
			});
		} catch (err) {
			if (err.status === 409) {
				error.set("You already have a profile");
				profileFormState.set("exists");
			} else if (err.status === 422) {
				let validationMsg = "Invalid profile data";
				const detail = err.data?.detail;

				if (Array.isArray(detail) && detail.length > 0) {
					validationMsg = detail.map(d => d.msg || String(d)).join("; ");
				} else if (typeof detail === "string") {
					validationMsg = detail;
				} else if (detail?.message) {
					validationMsg = detail.message;
				}

				error.set(validationMsg);
				profileFormState.set("error");
			} else {
				error.set(err.message || "Unexpected error creating profile");
				profileFormState.set("error");
			}
			return;
		}

		// Step 2: Interests
		let interestsError = false;
		if (normalized.interests && normalized.interests.length > 0) {
			try {
				submissionProgress.set("Adding interests");
				await createProfileInterests({ interest_ids: normalized.interests });
			} catch {
				interestsError = true;
			}
		}

		// Step 3: Socials
		let socialsError = false;
		if (normalized.socials && normalized.socials.length > 0) {
			try {
				submissionProgress.set("Adding socials");
				await createProfileSocials({ socials: normalized.socials });
			} catch {
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
			console.error("Avatar upload failed:", err);
			avatarError = true;
		}

		// Step 5: Handle partial success
		if (interestsError || socialsError || avatarError) {
			const parts = [];
			if (interestsError) parts.push("interests");
			if (socialsError) parts.push("socials");
			if (avatarError) parts.push("profile picture");

			let msg = "Profile created, but failed to add ";
			if (parts.length === 1) msg += parts[0];
			else if (parts.length === 2) msg += parts.join(" and ");
			else msg += parts.slice(0, -1).join(", ") + " and " + parts.at(-1);

			msg += " — please try adding them later from your profile page.";
			error.set(msg);
			profileFormState.set("partial");
		} else {
			profileFormState.set("success");
		}

		// Step 6: Fetch profile
		try {
			submissionProgress.set("Done. Getting your profile");
			const fetchedProfile = await getProfile();
			profile.set(fetchedProfile);
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
	socials.set([]);
	avatarFile.set(null);
	avatarOriginalUrl.set(null);
	avatarCropState.set(null);
}

export function resetState() {
	error.set(null);
	validationErrors.set([]);
	currentPage.set(0);
	profileFormState.set("idle");
}
