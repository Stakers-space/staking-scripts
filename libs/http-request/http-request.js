'use strict';
const VERSION = '1.0.0';
const http  = require('http');
const https = require('https');
const { URL } = require('url');

function httpRequest(url, options = {}, body = null) {
    const u   = (url instanceof URL) ? url : new URL(url);
    const lib = (u.protocol === 'https:') ? https : http;
    
    return new Promise((resolve, reject) => {
        const req = lib.request(u, options, (res) => {
            let response = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${response.slice(0, 200)}`));
                }
                resolve(response);
            });
        });

        if (typeof options.timeout === 'number' && Number.isFinite(options.timeout) && options.timeout > 0) {
            req.setTimeout(options.timeout, () => req.destroy(new Error(`HTTP timeout after ${options.timeout} ms`)));
        }
        
        req.on('error', reject);

        if (body != null) req.write(body);
        req.end();
    });
}

// ✅ JSON helper built on top of httpRequest
async function getJson(url, options = {}, body = null) {
    const method  = options.method || 'GET';
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const raw = await httpRequest(url, { ...options, method, headers }, body);
    try {
        return JSON.parse(raw || '{}');
    } catch (e) {
        // show a short head of the payload to help debugging
        throw new Error(`Invalid JSON from ${url}: ${e.message}\nPayload(head): ${raw.slice(0, 200)}`);
    }
}

module.exports = { VERSION, httpRequest, getJson }