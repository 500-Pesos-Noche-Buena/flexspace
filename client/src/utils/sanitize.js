/**
 * HTML Sanitization Helper for Client-Side Rendering
 * Strips script tags, iframes, inline event handlers, and dangerous URL protocols.
 */
export function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    // Strip dangerous tags completely
    let cleaned = html.replace(/<\s*(script|style|iframe|embed|object|form|input|button|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    cleaned = cleaned.replace(/<\s*(script|style|iframe|embed|object|form|input|button|meta|link|base)[^>]*>/gi, '');
    
    // Strip javascript: / vbscript: / data: in href or src
    cleaned = cleaned.replace(/(href|src)\s*=\s*['"]\s*(javascript|vbscript|data):[^'"]*['"]/gi, '');
    
    // Strip on* event handlers
    cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*['"][^'"]*['"]/gi, '');
    cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*[^ >]+/gi, '');
    
    return cleaned;
}
