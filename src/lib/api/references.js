
import request from "$lib/utils/request.js";

// Get the full list of countries
export function getCountries() {
    return request("/references/countries", {
        method: "GET"
    });
}

// Get the full list of interests
export function getInterests() {
    return request("/references/interests", {
        method: "GET"
    });
}

// Get the full list of platforms
export function getPlatforms() {
    return request("/references/platforms", {
        method: "GET"
    });
}
