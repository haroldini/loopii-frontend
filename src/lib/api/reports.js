
import request from "$lib/utils/request.js";


// Create a profile report
export function createProfileReport(data) {
    return request(`/reports`, {
        method: "POST",
        data,
    });
}
