const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_VERSION = import.meta.env.VITE_API_VERSION;

const API_PREFIX = `/api/${API_VERSION}`;
const FULL_BASE_URL = `${API_BASE_URL}${API_PREFIX}`;

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_SECRET;

const getToken = () => {
    return localStorage.getItem('authToken');
};

async function apiRequest(method, endpoint, data = null) {
    const url = `${FULL_BASE_URL}${endpoint}`;
    const token = getToken();

    try {
        const isFormData = data instanceof FormData;

        const config = {
            method: method,
            headers: {
                'Accept': 'application/json',
                // --- ADD THE PROTECTION HEADER HERE ---
                'x-app-fingerprint': INTERNAL_SECRET 
            },
        };

        if (!isFormData) {
            config.headers['Content-Type'] = 'application/json';
        }

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (data) {
            config.body = isFormData ? data : JSON.stringify(data);
        }

        const response = await fetch(url, config);
        
        // Handle potential empty responses safely
        const responseText = await response.text();
        const responseData = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            if (response.status === 401 && endpoint !== '/auth/login') {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                // Optional: avoid hard redirect during background polling
                // window.location.href = '/login'; 
                return;
            }

            const error = new Error(responseData.message || `Error: ${response.status}`);
            error.status = response.status;
            error.data = responseData;
            throw error; 
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