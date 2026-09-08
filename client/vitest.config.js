import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const reportDir=process.env.FLEXSPACE_COVERAGE_DIR || './coverage';
export default defineConfig({
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: {
        environment: 'jsdom', setupFiles: ['./tests/setup.js'], include: ['tests/**/*.test.{js,jsx}'],
        silent: 'passed-only', restoreMocks: true, clearMocks: true, maxWorkers: 2,
        environmentOptions: { jsdom: { url: 'http://localhost:5173/login' } },
        coverage: { provider: 'v8', include: ['src/**/*.{js,jsx}'], reporter: ['text-summary','html','json-summary'], reportsDirectory: reportDir },
        reporters: ['default','json'], outputFile: { json: `${reportDir}/test-results.json` }
    }
});
