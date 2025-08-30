
import { writable, derived, get } from 'svelte/store';
import { createProfile } from '$lib/api/profile';
import { profile } from '$lib/stores/profile';

///// --- Form state ---
export const name = writable('');
export const dob = writable('');
export const gender = writable('');
export const country = writable('');


///// --- UI state ---
export const isSubmitting = writable(false);
export const error = writable('');
export const success = writable(false);
export const done = writable(false);


///// --- Derived store to check if profile creation is ready to submit ---
export const readyToSubmit = derived(
    [name, dob, gender, country],
    ([$name, $dob, $gender, $country]) =>
        Boolean($name && $dob && $gender && $country)
);


// Submit function
export async function submitProfile() {
	isSubmitting.set(true);
	error.set('');
	success.set(false);
	done.set(false);

	try {
		const $name = get(name);
		const $dob = get(dob);
		const $gender = get(gender);
		const $country = get(country);

        if (!get(readyToSubmit)) {
            error.set('All fields are required');
            return;
        }

		// Call endpoint to create profile
		const res = await createProfile({
			name: $name,
			dob: $dob,
			gender: $gender,
			country: $country,
		});

		// Check for unexpected responses
		if (!res.success) {
			if (res.data) {
				error.set('You already have a profile. Click below to continue');
			} else {
				error.set('Failed to create profile. Click below to retry');
			}
			success.set(false);
			return;
		}

		profile.set(res.data); // update global profile store
		success.set(true);
	} catch (err) {
		error.set('Failed to create profile. Click below to retry');
	} finally {
		isSubmitting.set(false);
		done.set(true);
	}
}
