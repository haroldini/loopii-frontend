
import { initProfileStore } from '$lib/stores/profile.js';
import { ping } from '$lib/api/utils.js';

export function load() {
    initProfileStore();
    return {};
}
