/**
 * Local Dev Server — wraps api/index.js in a plain Node.js HTTP server.
 * Reads credentials from .env at project root (never committed to git).
 *
 * Usage:  node api/local-server.js
 * Runs:   http://localhost:3001/api
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const handler = require('./index.js');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
    // Parse query string and attach as req.query (mirrors what Vercel provides)
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const query = {};
    url.searchParams.forEach((value, key) => { query[key] = value; });
    req.query = query;

    // Shim res.status() and res.json() to match Vercel's response API
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(data));
    };
    res.end = (function (originalEnd) {
        return function (...args) {
            // Ensure CORS headers are always present for local dev
            if (!res.headersSent) {
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            return originalEnd.apply(res, args);
        };
    })(res.end);

    handler(req, res).catch((err) => {
        console.error('[local-server] Unhandled error:', err);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n✅ Local API server running at http://localhost:${PORT}/api`);
    console.log('   Make sure .env has GOOGLE_APP_SCRIPT_URL and SECRET_AUTH_TOKEN set.\n');
});
