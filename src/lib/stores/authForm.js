import { writable, derived } from "svelte/store";


///// --- Form state ---
export const email = writable("");
export const confirmEmail = writable("");
export const password = writable("");
export const confirmPassword = writable("");
export const resetToken = writable("");


///// --- UI state ---
export const subPage = writable("login"); // "login", "signup", "requestReset", "reset
export const emailTouched = writable(false);
export const passwordTouched = writable(false);
export const isSubmitting = writable(false);
export const showForm = writable(true);


///// --- Errors / Messages ---
export const validationErrors = writable([]);
export const error = writable("");
export const authFormStatus = writable(""); 
// "loggingIn", "loginFailed", "loggedIn",
// "signingUp", "signUpFailed, "signedUp",
// "sendingResetRequest", ""resetRequestFailed", "resetEmailSent",
// "resettingPassword", "resetPasswordFailed", "passwordReset


///// --- Validation logic for email and password fields ---
export function validateForm($subPage, $email, $confirmEmail = "", $password = "", $confirmPassword = "") {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Require and validate email for signup, requestReset and login
    if (["signup", "requestReset", "login"].includes($subPage)) {
        if (!$email) errors.push({ field: "email", message: "Email is required", display: false });
        if ($email && !emailRegex.test($email)) errors.push({ field: "email", message: "Email is not valid", display: true });
    }

    // Require and validate confirm email on signup
    if (["signup"].includes($subPage)) {
        if (!$confirmEmail) errors.push({ field: "email", message: "Confirm Email is required", display: false });
        if ($email && $confirmEmail && $email !== $confirmEmail) errors.push({ field: "email", message: "Emails do not match", display: true });
    }
    
    // Require and validate confirm password on signup and reset
    if (["signup", "reset"].includes($subPage)) {
        if (!$confirmPassword) errors.push({ field: "password", message: "Confirm Password is required", display: false });
        if ($password && $confirmPassword && $password !== $confirmPassword)
            errors.push({ field: "password", message: "Passwords do not match", display: true });
    }

    // Require password on login, signup and reset
    if (["signup", "reset", "login"].includes($subPage)) {
        if (!$password) errors.push({ field: "password", message: "Password is required", display: false });
    }
    
    // Validate password on signup and reset
    if (["signup", "reset"].includes($subPage)) {
        if ($password) {
            const reqs = [];
            if ($password.length < 8) reqs.push("at least 8 characters");
            if (!/[a-z]/.test($password)) reqs.push("a lowercase letter");
            if (!/[A-Z]/.test($password)) reqs.push("an uppercase letter");
            if (!/[0-9]/.test($password)) reqs.push("a number");
            if (reqs.length > 0) {
                const last = reqs.pop();
                const message = reqs.length ? reqs.join(", ") + " and " + last : last;
                errors.push({ field: "password", message: "Password must contain " + message, display: true });
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
    subPage.set(mode);
    showForm.set(true);
    confirmEmail.set("");
    confirmPassword.set("");
    emailTouched.set(false);
    passwordTouched.set(false);
    validationErrors.set([]);
    error.set("");
    authFormStatus.set("");

    if (mode !== "reset") {
        resetToken.set("");
    }
}

// Reset all the authForm stores
export function resetAuthForm() {
    toggleMode("login");
    email.set("");
    password.set("");
    resetToken.set("")
}

// Reset all the sensitive stores
export function resetSensitive() {
    email.set("");
    confirmEmail.set("");
    password.set("");
    confirmPassword.set("");
    resetToken.set("");
}

// Toggles the showForm store, used to toggle the fields/submit buttons
export function toggleForm(value) {
    if (typeof value === "boolean") {
        showForm.set(value);
    } else {
        showForm.update(v => !v); // toggle if no argument
    }
}