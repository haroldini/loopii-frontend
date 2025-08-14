
// Exporting environment variables
export const API_URL = import.meta.env.VITE_BACKEND_URL;
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT;


// Function to fetch a message from the backend
export async function fetchMessage() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed fetch');
    const data = await response.json();
    return data.message;
}

