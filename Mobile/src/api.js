/**
 * api.js — Central API configuration for the Mobile app
 *
 * Change BASE_URL to match your environment:
 *   Android Emulator  → http://10.0.2.2:5000
 *   iOS Simulator     → http://localhost:5000
 *   Physical Device   → http://<YOUR_LAN_IP>:5000  e.g. http://192.168.1.10:5000
 *   Production        → https://your-deployed-backend.com
 */

// ── Environment switcher ─────────────────────────────────────────────────────
// Comment/uncomment the line matching your current environment:

// export const BASE_URL = 'http://10.0.2.2:5000';       // Android Emulator
// export const BASE_URL = 'http://localhost:5000';        // iOS Simulator
// export const BASE_URL = 'http://192.168.1.10:5000';    // Physical Device (LAN)
export const BASE_URL = 'https://attendence.pasinduudana.me'; // ✅ Production
// export const BASE_URL = 'http://10.0.2.2:5000';       // Android Emulator (Local Dev)
// export const BASE_URL = 'http://localhost:5000';        // iOS Simulator (Local Dev)


/**
 * post(endpoint, body)
 * Makes a JSON POST request to BASE_URL + endpoint.
 * Returns the parsed JSON response.
 *
 * @param {string} endpoint  - e.g. '/login', '/get_dashboard'
 * @param {object} body      - JSON payload
 * @returns {Promise<object>}
 */
export async function post(endpoint, body = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { status: 'error', message: `Server returned HTTP ${response.status}` };
    }
    const json = await response.json();
    if (json.status === 'success' && !json.hasOwnProperty('data')) {
      return { status: 'success', data: json };
    }
    return json;
  } catch (error) {
    console.error(`POST ${endpoint} error:`, error);
    return { status: 'error', message: 'Network request failed' };
  }
}

/**
 * upload(endpoint, formData)
 * Makes a multipart/form-data POST request (for file uploads).
 * Returns the parsed JSON response.
 *
 * @param {string}   endpoint  - e.g. '/upload_medical'
 * @param {FormData} formData  - FormData object with file and fields
 * @returns {Promise<object>}
 */
export async function upload(endpoint, formData) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type manually — fetch sets it with boundary for multipart
    });
    if (!response.ok) {
      return { status: 'error', message: `Server returned HTTP ${response.status}` };
    }
    const json = await response.json();
    if (json.status === 'success' && !json.hasOwnProperty('data')) {
      return { status: 'success', data: json };
    }
    return json;
  } catch (error) {
    console.error(`UPLOAD ${endpoint} error:`, error);
    return { status: 'error', message: 'File upload failed' };
  }
}

