/**
 * Application Configuration
 * Loads backend URL from environment or uses defaults
 */

// Get backend URL from environment or use defaults
function getBackendUrl() {
    // For development environments
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }

    // For GitHub Pages deployment - use Lambda URL from environment or fallback
    // In development with .env.local, this will be loaded via build process
    // For GitHub Pages, use the Lambda URL below
    return 'https://kg7kg65ok2hvfox6l4gtniqhsi0ckmox.lambda-url.ap-south-1.on.aws';
}

// Export config
const CONFIG = {
    BACKEND_BASE: getBackendUrl(),
    ZOHO_WIDGET_API_KEY: '1003.b03980822c145cb80d00b97288514519.783c4164ef793ebfbe77bf1098160aad'
};

// Make globally available
window.CONFIG = CONFIG;
