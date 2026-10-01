import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('AdSense review safeguards', () => {
    it('publishes the authorized seller record as plain text', () => {
        expect(read('public/ads.txt').trim()).toBe('google.com, pub-5613688387404299, DIRECT, f08c47fec0942fa0');
    });

    it('does not load AdSense globally on utility, authentication, or dashboard screens', () => {
        expect(read('index.html')).not.toContain('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
        expect(read('src/pages/Landing/Index.jsx')).not.toContain('<AdSense');
    });

    it('keeps protected and behavioral routes out of the crawler inventory', () => {
        const robots = read('public/robots.txt');
        for (const route of ['/admin/', '/space/', '/user/', '/login', '/register', '/payment/', '/review/']) {
            expect(robots).toContain(`Disallow: ${route}`);
        }
        expect(robots).toContain('Allow: /ads.txt');
    });

    it('lists substantial public and policy pages in the sitemap', () => {
        const sitemap = read('public/sitemap.xml');
        for (const route of ['workspace-guide', 'blogs', 'faq', 'privacy', 'terms']) {
            expect(sitemap).toContain(`/${route}`);
        }
    });
});
