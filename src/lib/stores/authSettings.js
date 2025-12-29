
import { writable, derived, get } from "svelte/store";
import { expectedPhrase } from "$lib/stores/auth.js";


///// --- Form state ---
export const mode = writable("password"); // "password" | "email" | "delete" | "reset"
export const currentPassword = writable("");
export const newPassword = writable("");
export const confirmNewPassword = writable("");
export const newEmail = writable("");
export const confirmNewEmail = writable("");
export const confirmPhrase = writable("");


///// --- UI state ---
export const isSubmitting = writable(false);


///// --- Errors / Status ---
export const validationErrors = writable([]);
export const error = writable("");
export const status = writable("idle"); 
// "idle", "updating", "updated", "emailPending", "failed"


///// --- Validation logic for email and password fields ---
function validateForm($mode, $currentPassword, $newPassword, $confirmNewPassword, $newEmail, $confirmNewEmail, $confirmPhrase) {
    const errors = [];

    // Current password required for password and delete modes
    if ($mode == "password" || $mode === "delete") {
        if (!$currentPassword) {
            errors.push({ message: "Current password is required", display: false });
        }
    }

    // If changing password, require and validate the new password
    if ($mode === "password") {
        // Password required and must match
        if (!$newPassword) errors.push({ message: "New password is required", display: false });
        if (!$confirmNewPassword) {
            errors.push({ message: "Confirm password is required", display: false });
        } else if ($newPassword !== $confirmNewPassword) {
            errors.push({ message: "Passwords do not match", display: true });
        }
        // Password complexity requirements
        if ($newPassword) {
            const reqs = [];
            if ($newPassword.length < 8) reqs.push("at least 8 characters");
            if (!/[a-z]/.test($newPassword)) reqs.push("a lowercase letter");
            if (!/[A-Z]/.test($newPassword)) reqs.push("an uppercase letter");
            if (!/[0-9]/.test($newPassword)) reqs.push("a number");
            if (reqs.length > 0) {
                const last = reqs.pop();
                const message = reqs.length ? reqs.join(", ") + " and " + last : last;
                errors.push({ message: "Password must contain " + message, display: true });
            }
        }

    // If changing email, require and validate the new email
    } else if ($mode === "email") {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const e1 = ($newEmail || "").trim();
        const e2 = ($confirmNewEmail || "").trim();

        if (!e1) errors.push({ message: "New email is required", display: true });
        if (e1 && !re.test(e1)) errors.push({ message: "Email is not valid", display: true });
        if (!e2) errors.push({ message: "Confirm email is required", display: false });
        else if (e1 !== e2) errors.push({ message: "Emails do not match", display: true });

    
    // If deleting account, require the dangerous confirm phrase
    } else if ($mode === "delete") {
        if (($confirmPhrase || "").trim().toUpperCase() !== get(expectedPhrase).toUpperCase()) {
            errors.push({ message: "Incorrect confirmation phrase", display: true });
        }
    }
    validationErrors.set(errors);
    return errors.length === 0;
}


///// --- Derived store to check if ready to submit ---
export const readyToSubmit = derived(
    [mode, currentPassword, newPassword, confirmNewPassword, newEmail, confirmNewEmail, confirmPhrase],
    ([$mode, $cp, $np, $cnp, $ne, $cne, $phrase], set) => {
        set(validateForm($mode, $cp, $np, $cnp, $ne, $cne, $phrase));
    },
    false
);


///// Swap between password and email modes
export function setMode(next) {
    mode.set(next);
    resetState();
}

export function resetSensitive() {
    currentPassword.set("");
    newPassword.set("");
    confirmNewPassword.set("");
    newEmail.set("");
    confirmNewEmail.set("");
    confirmPhrase.set("");
}

export function resetValidation() {
    validationErrors.set([]);
}

export function resetTransient() {
    error.set("");
    status.set("idle");
    isSubmitting.set(false);
}

export function resetState() {
    resetSensitive();
    resetValidation();
    resetTransient();
}
