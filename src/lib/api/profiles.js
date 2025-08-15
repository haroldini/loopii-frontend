
import { API_URL } from '$lib/utils/env.js';


// Fetch the next profile
export async function getNextProfile() {
  try {
    const response = await fetch(`${API_URL}/profiles/get-next-profile`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}


// Send a tap decision
export async function tapProfile(profileId) {
  try {
    const response = await fetch(`${API_URL}/profiles/tap-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    });
    if (!response.ok) throw new Error('Failed to tap profile');
    return await response.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}
