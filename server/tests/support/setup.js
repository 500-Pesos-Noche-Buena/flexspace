const path = require('node:path');
require('module-alias').addAlias('@', path.resolve(__dirname, '../../app'));
const loaded = require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test'), override: true, quiet: true });
if (loaded.error) throw new Error('Missing server/.env.test. Configure it before running tests.');
process.env.NODE_ENV = 'test';
process.env.TZ = 'Asia/Manila';
// Never give tests production service credentials. External service tests use stubs.
for (const key of ['SMTP_PASS', 'VERCEL_API_TOKEN', 'GEMINI_API_KEY', 'CLOUDINARY_API_SECRET', 'GOOGLE_CLIENT_SECRET', 'PAYBRIDGE_MASTER_KEY', 'TURNSTILE_SECRET_KEY']) {
    process.env[key] = 'test-only';
}
process.env.JWT_SECRET = 'local-backend-test-signing-secret';
process.env.INTERNAL_API_KEY = 'test-internal-key';
process.env.SESSION_SECRET = 'test-session-secret';
