require('../support/isolatedDependencies');
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { request, invoke } = require('../support/http');
const models = require('../../app/api/v1/models');
const { District } = models;
for (const model of Object.values(models)) if (typeof model.create === 'function') mock.method(model, 'create', async () => { throw unavailable; });
const root = path.resolve(__dirname, '../../app/api/v1/controllers');
const unavailable = new Error('TEST_DATABASE_UNAVAILABLE');
// Reject real database operations: verify handlers propagate failure or return a
// documented validation/fallback response instead of claiming a successful write.
mock.method(mongoose.Query.prototype, 'exec', async () => { throw unavailable; });
mock.method(mongoose.Aggregate.prototype, 'exec', async () => { throw unavailable; });
mock.method(mongoose.Model.prototype, 'save', async () => { throw unavailable; });
mock.method(mongoose.Model, 'insertMany', async () => { throw unavailable; });
mock.method(mongoose.Model, 'bulkWrite', async () => { throw unavailable; });
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
// These operations have meaningful success paths without a working database.
const localSuccess = new Set(['authController.js:logout','authController.js:googleCallback','space/paymentController.js:handlePaymentWebhook',
    'admin/queueController.js:getEmailCounts','admin/queueController.js:getCloudinaryCounts',
    'admin/queueController.js:getFailedJobs','admin/queueController.js:retryAllFailed','admin/queueController.js:cleanCompleted']);
for (const file of files(root)) {
    const label = path.relative(root, file);
    let controller = require(file);
    if (typeof controller === 'function') controller = new controller(District, 'District');
    const names = new Set([...Object.getOwnPropertyNames(controller), ...Object.getOwnPropertyNames(Object.getPrototypeOf(controller))]);
    for (const name of names) {
        if (name === 'constructor' || name === 'model' || typeof controller[name] !== 'function') continue;
        if (!/\(req,\s*res/.test(controller[name].toString().split('\n')[0])) continue;
        const key = `${label}:${name}`;
        test(`${key} — validation or dependency failure contract`, async () => {
            const result = await invoke(controller, name, request());
            assert.equal(result.thrown, undefined, result.thrown?.stack);
            if (key === 'space/bookingController.js:handleQRRedirect') { assert.equal(result.status, 302); assert.match(result.body, /error=server_error/); return; }
            if (['landingController.js:verifyPayment','space/paymentController.js:checkFeePaymentStatus'].includes(key)) { assert.equal(result.body.data.is_paid, false); return; }
            if (localSuccess.has(key)) {
                assert.ok(result.sent && result.status < 400, JSON.stringify(result));
                return;
            }
            assert.ok(result.error || (result.sent && result.status >= 400), `Must report failure, got ${JSON.stringify(result)}`);
            if (result.error) assert.ok(result.error === unavailable || result.error.statusCode >= 400 || result.error.message === 'TEST_EXTERNAL_UNAVAILABLE' || result.error.name === 'ValidationError', result.error.stack);
        });
    }
}
