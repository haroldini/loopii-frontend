
import request from "$lib/utils/request.js";


// Create a profile report
export function createProfileReport(data) {
    return request(`/report`, {
        method: "POST",
        data,
    });
}
