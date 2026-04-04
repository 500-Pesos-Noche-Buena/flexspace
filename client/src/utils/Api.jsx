const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_VERSION = import.meta.env.VITE_API_VERSION;

const API_PREFIX = `/api/${API_VERSION}`;
const FULL_BASE_URL = `${API_BASE_URL}${API_PREFIX}`;

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_SECRET;

// Ensure this key matches what you use in your Login function!
const getToken = () => localStorage.getItem('authToken');

async function apiRequest(method, endpoint, data = null) {
    const url = `${FULL_BASE_URL}${endpoint}`;
    const token = getToken();

    const config = {
        method: method,
        headers: {
            'Accept': 'application/json',
            'x-app-fingerprint': INTERNAL_SECRET 
        },
    };

    // Attach Bearer Token if available
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data instanceof FormData) {
        config.body = data;
    } else if (data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const responseText = await response.text();
        const responseData = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            if (response.status === 401 && endpoint !== '/auth/login') {
                // Clear stale session
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }
            throw new Error(responseData.message || `Error: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error.message);
        throw error;
    }
}

export const apiGet = (endpoint) => apiRequest('GET', endpoint);
export const apiPost = (endpoint, data) => apiRequest('POST', endpoint, data);
export const apiPut = (endpoint, data) => apiRequest('PUT', endpoint, data);
export const apiPatch = (endpoint, data) => apiRequest('PATCH', endpoint, data);
export const apiDelete = (endpoint) => apiRequest('DELETE', endpoint);