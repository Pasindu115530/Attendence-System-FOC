// lib/api.js — Central API configuration for the Admin frontend

export const BASE_URL = 'https://attendence.pasinduudana.me';



/**
 * apiPost(endpoint, data)
 * Makes a JSON POST request to the Flask backend.
 */
export async function apiPost(endpoint, data = {}) {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }
    const json = await response.json();
    if (json.status === 'success' && !json.hasOwnProperty('data')) {
      return { status: 'success', data: json };
    }
    return json;
  } catch (err) {
    console.error(`apiPost [${endpoint}]:`, err);
    return { status: 'error', message: 'Network error' };
  }
}

/**
 * apiMultipart(endpoint, formData)
 * Makes a multipart POST request (for file/image uploads).
 */
export async function apiMultipart(endpoint, formData) {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }
    const json = await response.json();
    if (json.status === 'success' && !json.hasOwnProperty('data')) {
      return { status: 'success', data: json };
    }
    return json;
  } catch (err) {
    console.error(`apiMultipart [${endpoint}]:`, err);
    return { status: 'error', message: 'Network error' };
  }
}

/**
 * apiDelete(endpoint)
 * Makes a DELETE request.
 */
export async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }
    const json = await response.json();
    if (json.status === 'success' && !json.hasOwnProperty('data')) {
      return { status: 'success', data: json };
    }
    return json;
  } catch (err) {
    console.error(`apiDelete [${endpoint}]:`, err);
    return { status: 'error', message: 'Network error' };
  }
}
