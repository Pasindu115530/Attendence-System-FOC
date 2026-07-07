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
// export const BASE_URL = 'http://10.33.111.230:5000';    // ✅ Local Development (LAN IP)
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
export async function post(endpoint, body = {}, retries = 2) {
  console.log(`[API] POST => ${endpoint} (retries left: ${retries})`);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(id);

      let json;
      try {
        json = await response.json();
      } catch (e) {
        json = null;
      }

      if (!response.ok) {
        const errMsg = json && json.message ? json.message : (json && json.error ? json.error : `Server returned HTTP ${response.status}`);
        console.error(`[API ERROR] POST ${endpoint} => ${errMsg}`);
        return { status: 'error', message: errMsg };
      }

    if (json.status === 'error' || json.status === 'failed') {
      console.error(`[API BACKEND ERROR] POST ${endpoint} =>`, json.message || json);
    } else {
      console.log(`[API SUCCESS] POST ${endpoint} =>`, json);
    }

      if (json.status === 'success' && !json.hasOwnProperty('data')) {
        return { status: 'success', data: json };
      }
      return json;
    } catch (error) {
      console.error(`[API NETWORK ERROR] POST ${endpoint} attempt ${attempt + 1} error:`, error);
      if (attempt === retries) {
        return { status: 'error', message: 'Network request failed or timed out after multiple attempts' };
      }
      // Wait before retrying (e.g., 1s, 2s)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
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
export async function upload(endpoint, formData, retries = 1) {
  console.log(`[API] UPLOAD => ${endpoint} (retries left: ${retries})`);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000); // 30 second timeout for uploads

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
        // Do NOT set Content-Type manually — fetch sets it with boundary for multipart
      });
      clearTimeout(id);

      let json;
      try {
        json = await response.json();
      } catch (e) {
        json = null;
      }

      if (!response.ok) {
        const errMsg = json && json.message ? json.message : (json && json.error ? json.error : `Server returned HTTP ${response.status}`);
        console.error(`[API ERROR] UPLOAD ${endpoint} => ${errMsg}`);
        return { status: 'error', message: errMsg };
      }

    if (json.status === 'error' || json.status === 'failed') {
      console.error(`[API BACKEND ERROR] UPLOAD ${endpoint} =>`, json.message || json);
    } else {
      console.log(`[API SUCCESS] UPLOAD ${endpoint} =>`, json);
    }

      if (json.status === 'success' && !json.hasOwnProperty('data')) {
        return { status: 'success', data: json };
      }
      return json;
    } catch (error) {
      console.error(`[API NETWORK ERROR] UPLOAD ${endpoint} attempt ${attempt + 1} error:`, error);
      if (attempt === retries) {
        return { status: 'error', message: 'File upload failed or timed out' };
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

