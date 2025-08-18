import { writable, derived } from 'svelte/store';


///// --- Form state ---
export const subPage = writable('login'); // 'login', 'signup', 'requestReset', 'reset
export const email = writable('');
export const confirmEmail = writable('');
export const password = writable('');
export const confirmPassword = writable('');
export const resetToken = writable('');



///// --- Touched fields (for UI feedback) ---
export const emailTouched = writable(false);
export const passwordTouched = writable(false);


///// --- Errors ---
export const validationErrors = writable([]);
export const error = writable('');


///// --- Validation logic for email and password fields ---
export function validateForm($subPage, $email, $confirmEmail = '', $password = '', $confirmPassword = '') {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Require and validate email for signup, requestReset and login
    if (['signup', 'requestReset', 'login'].includes($subPage)) {
        if (!$email) errors.push({ message: 'Email is required', display: false });
        if ($email && !emailRegex.test($email)) errors.push({ message: 'Email is not valid', display: true });
    }

    // Require and validate confirm email on signup
    if (['signup'].includes($subPage)) {
        if (!$confirmEmail) errors.push({ message: 'Confirm Email is required', display: false });
        if ($email && $confirmEmail && $email !== $confirmEmail) errors.push({ message: 'Emails do not match', display: true });
    }
    
    // Require and validate confirm password on signup and reset
    if (['signup', 'reset'].includes($subPage)) {
        if (!$confirmPassword) errors.push({ message: 'Confirm Password is required', display: false });
        if ($password && $confirmPassword && $password !== $confirmPassword)
            errors.push({ message: 'Passwords do not match', display: true });
    }

    // Require password on login, signup and reset
    if (['signup', 'reset', 'login'].includes($subPage)) {
        if (!$password) errors.push({ message: 'Password is required', display: false });
    }
    
    // Validate password on signup and reset
    if (['signup', 'reset'].includes($subPage)) {
        if ($password) {
            const reqs = [];
            if ($password.length < 8) reqs.push('at least 8 characters');
            if (!/[a-z]/.test($password)) reqs.push('a lowercase letter');
            if (!/[A-Z]/.test($password)) reqs.push('an uppercase letter');
            if (!/[0-9]/.test($password)) reqs.push('a number');
            if (reqs.length > 0) {
                const last = reqs.pop();
                const message = reqs.length ? reqs.join(', ') + ' and ' + last : last;
                errors.push({ message: 'Password must contain ' + message, display: true });
            }
        }
    }

    // Compile the errors
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


///// --- Swap between login, requestReset and signup mode ---
export function toggleMode(mode) {
    subPage.set(mode)
    confirmEmail.set('');
    confirmPassword.set('');
    emailTouched.set(false);
    passwordTouched.set(false);
    validationErrors.set([]);
    error.set('');
}
