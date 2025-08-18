import { writable, derived } from 'svelte/store';


///// --- Form state ---
export const subPage = writable('login'); // 'login', 'signup', 'reset'
export const email = writable('');
export const confirmEmail = writable('');
export const password = writable('');
export const confirmPassword = writable('');


///// --- Touched fields (for UI feedback) ---
export const emailTouched = writable(false);
export const passwordTouched = writable(false);


///// --- Errors ---
export const validationErrors = writable([]);
export const error = writable('');


///// --- Validation logic for email and password fields ---
export function validateForm($subPage, $email, $confirmEmail, $password, $confirmPassword) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Required fields (hide, but block submit)
    if (!$email) errors.push({ message: 'Email is required', display: false });
    if ($subPage === 'signup' && !$confirmEmail) errors.push({ message: 'Confirm Email is required', display: false });
    if (!$password) errors.push({ message: 'Password is required', display: false });
    if ($subPage === 'signup' && !$confirmPassword) errors.push({ message: 'Confirm Password is required', display: false });

    // Format / complexity errors (display)
    if ($email && !emailRegex.test($email)) errors.push({ message: 'Email is not valid', display: true });
    if ($password && $subPage === 'signup') {
        if ($password.length < 8) errors.push({ message: 'Password must be at least 8 characters', display: true });
        if (!/[a-z]/.test($password)) errors.push({ message: 'Password must contain a lowercase letter', display: true });
        if (!/[A-Z]/.test($password)) errors.push({ message: 'Password must contain an uppercase letter', display: true });
        if (!/[0-9]/.test($password)) errors.push({ message: 'Password must contain a number', display: true });
    }

    // Mismatches (display)
    if ($subPage === 'signup') {
        if ($email && $confirmEmail && $email !== $confirmEmail) errors.push({ message: 'Emails do not match', display: true });
        if ($password && $confirmPassword && $password !== $confirmPassword) errors.push({ message: 'Passwords do not match', display: true });
    }

    validationErrors.set(errors);
    return errors.length === 0;
}


///// --- Derived store to check if ready to submit ---
export const readyToSubmit = derived(
    [subPage, email, confirmEmail, password, confirmPassword],
    ([$subPage, $email, $confirmEmail, $password, $confirmPassword], set) => {
        set(validateForm($subPage, $email, $confirmEmail, $password, $confirmPassword));
    },
    false
);


///// --- Swap between login and signup mode ---
export function toggleMode() {
    subPage.update(s => s === 'login' ? 'signup' : 'login');
    confirmEmail.set('');
    confirmPassword.set('');
    emailTouched.set(false);
    passwordTouched.set(false);
    validationErrors.set([]);
    error.set('');
}
