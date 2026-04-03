const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_VERSION = import.meta.env.VITE_API_VERSION;

const API_PREFIX = `/api/${API_VERSION}`;
const FULL_BASE_URL = `${API_BASE_URL}${API_PREFIX}`;

const getToken = () => {
    return localStorage.getItem('authToken');
};

async function apiRequest(method, endpoint, data = null) {
    const url = `${FULL_BASE_URL}${endpoint}`;
    const token = getToken();

    try {
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        
        const responseData = await response.json().catch(() => ({}));

        // Handle Session Expiry / Unauthorized Access
        if (response.status === 401) {
            // 1. Clear local storage to ensure the token is actually gone
            localStorage.removeItem('authToken');
            localStorage.removeItem('user'); // Also clear user data if stored

            // 2. Force the browser to the login page
            // This breaks any "memory state" and forces a fresh start
            window.location.href = '/login';

            const msg = responseData.message || 'Unauthorized access. Please log in.';
            throw new Error(msg);
        }

        if (!response.ok) {
            throw new Error(responseData.message || `Error: ${response.status}`);
        }

        return responseData;

    } catch (error) {
        console.error(`API ${method} Request Failed:`, error.message);
        throw error;
    }
}

export const apiGet = (endpoint) => apiRequest('GET', endpoint);
export const apiPost = (endpoint, data) => apiRequest('POST', endpoint, data);
export const apiPut = (endpoint, data) => apiRequest('PUT', endpoint, data);
export const apiPatch = (endpoint, data) => apiRequest('PATCH', endpoint, data);
export const apiDelete = (endpoint) => apiRequest('DELETE', endpoint);