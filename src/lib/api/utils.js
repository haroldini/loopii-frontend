
import request from "$lib/utils/request.js";

// Ping endpoint
export function ping() {
  return request("/utils/ping");
}
