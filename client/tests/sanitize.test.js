import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/utils/sanitize';

describe('Client sanitizeHtml Security Tests', () => {
    it('strips script tags and inner content', () => {
        const input = '<p>Safe</p><script>alert("xss")</script>';
        expect(sanitizeHtml(input)).toBe('<p>Safe</p>');
    });

    it('strips inline event handlers', () => {
        const input = '<img src="valid.png" onerror="alert(1)" onload="evil()">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).toContain('<img src="valid.png">');
    });

    it('strips javascript: and data: pseudo-protocols', () => {
        const input = '<a href="javascript:alert(1)">Click</a><img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('data:');
    });

    it('strips dangerous embedded elements (iframe, embed, object)', () => {
        const input = '<iframe src="http://evil.com"></iframe><embed src="evil.swf"><object data="evil"></object>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    it('handles non-string or null gracefully', () => {
        expect(sanitizeHtml(null)).toBe('');
        expect(sanitizeHtml(undefined)).toBe('');
        expect(sanitizeHtml(123)).toBe('');
    });
});
