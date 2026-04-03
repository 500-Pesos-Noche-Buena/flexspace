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

        // ✅ FIX: Only redirect if it's NOT the login page
        if (response.status === 401 && endpoint !== '/auth/login') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return; 
        }

        // If it IS the login page and 401, or any other error
        if (!response.ok) {
            // Throw the message from the backend (e.g., "Invalid Credentials")
            throw new Error(responseData.message || `Error: ${response.status}`);
        }

        return responseData;

    } catch (error) {
        console.error(`API ${method} Request Failed:`, error.message);
        throw error; // This goes to your handleSubmit catch block
    }
}

export const apiGet = (endpoint) => apiRequest('GET', endpoint);
export const apiPost = (endpoint, data) => apiRequest('POST', endpoint, data);
export const apiPut = (endpoint, data) => apiRequest('PUT', endpoint, data);
export const apiPatch = (endpoint, data) => apiRequest('PATCH', endpoint, data);
export const apiDelete = (endpoint) => apiRequest('DELETE', endpoint);