const getBaseUrl = () => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    if (host.includes('vercel.app')) {
        return import.meta.env.VITE_API_URL;
    }

    if (
        host === 'localhost' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(host)
    ) {
        return `${protocol}//${host}:5000`;
    }

    return import.meta.env.VITE_API_URL || `${protocol}//${host}:5000`;
};

const API_BASE_URL = getBaseUrl();
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';
const FULL_BASE_URL = `${API_BASE_URL}/api/${API_VERSION}`;
const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_SECRET;

const getToken = () => localStorage.getItem('authToken');

// Flag to prevent multiple redirects
let isRedirecting = false;

// Global logout callback
let globalLogoutCallback = null;

export const setLogoutCallback = (callback) => {
    globalLogoutCallback = callback;
};

const triggerLogout = () => {
    // Clear storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.clear();

    // Call the AuthContext logout if available
    if (globalLogoutCallback) {
        globalLogoutCallback();
    }

    // Only redirect if not already redirecting
    if (!isRedirecting && !window.location.pathname.includes('/login')) {
        isRedirecting = true;
        window.location.href = '/login';
    }
};

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

        // 🔥 Handle 401 Unauthorized - Token expired
        if (response.status === 401 && endpoint !== '/auth/login') {
            console.log('🔐 Token expired - logging out');
            triggerLogout();
            throw new Error('Session expired. Please login again.');
        }

        const responseText = await response.text();
        const responseData = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(responseData.message || `Error: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error.message);
        throw error;
    }
}

// Reset redirect flag when page loads and on login page
window.addEventListener('load', () => {
    isRedirecting = false;
});

// Also reset when on login page
if (window.location.pathname.includes('/login')) {
    isRedirecting = false;
}

export const downloadFile = async (url, filename) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${FULL_BASE_URL}${url}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);

        return true;
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
};
export const apiGet = (endpoint) => apiRequest('GET', endpoint);
export const apiPost = (endpoint, data) => apiRequest('POST', endpoint, data);
export const apiPut = (endpoint, data) => apiRequest('PUT', endpoint, data);
export const apiPatch = (endpoint, data) => apiRequest('PATCH', endpoint, data);
export const apiDelete = (endpoint) => apiRequest('DELETE', endpoint);