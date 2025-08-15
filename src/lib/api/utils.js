
import { API_URL } from '$lib/utils/env.js';


// Fetch the next profile
export async function ping() {
  try {
    const response = await fetch(`${API_URL}/utils/ping`);
    if (!response.ok) throw new Error('Ping failed');
    return await response.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}