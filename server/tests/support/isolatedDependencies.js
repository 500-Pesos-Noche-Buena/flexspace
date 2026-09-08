// External boundaries are replaced only inside test processes. Application
// controllers and services remain real; no email, upload, AI or payment is sent.
const { EventEmitter } = require('node:events');
const { mock } = require('node:test');
const modules = require('node:module');
const originalLoad = modules._load;
const externalError = new Error('TEST_EXTERNAL_UNAVAILABLE');
class Queue extends EventEmitter {
    constructor() { super(); this.handlers = {}; }
    process(name, fn) { this.handlers[name] = fn; }
    async getJobCounts() { return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }; }
    async getFailed() { return []; }
    async getJobs() { return []; }
    async getJob() { return null; }
    async clean() { return []; }
    async add() { return { id: 'test-job' }; }
    async close() {}
}
const ai = { models: { generateContent: async () => { throw externalError; } } };
modules._load = function(id, parent, main) {
    if (id === 'bull') return Queue;
    if (id === '@google/genai') return { GoogleGenAI: class { constructor() { return ai; } } };
    return originalLoad.call(this, id, parent, main);
};
const nodemailer = require('nodemailer');
mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => { throw externalError; } }));
const axios = require('axios');
for (const method of ['get','post','put','delete','patch']) mock.method(axios, method, async () => { throw externalError; });
mock.method(global, 'fetch', async () => { throw externalError; });
const cloudinary = require('cloudinary').v2;
for (const method of ['upload','destroy','rename','upload_stream']) if (cloudinary.uploader[method]) mock.method(cloudinary.uploader, method, () => { throw externalError; });
module.exports = { Queue, ai, externalError };
