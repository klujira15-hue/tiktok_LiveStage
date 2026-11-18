'use strict';
const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
process.env.LIVESTAGE_USERDATA ||= path.join(projectRoot, '.local', 'user-data');
fs.mkdirSync(process.env.LIVESTAGE_USERDATA, { recursive: true });
// Block legacy provider requests in Node and all Electron renderer sessions.
const blocked = value => { try { return /(^|\.)tubhool\.com$/i.test(new URL(String(value?.url || value)).hostname); } catch { return false; } };
const realFetch = global.fetch;
global.fetch = (url, options) => blocked(url) ? Promise.reject(new Error('External provider disabled in Local edition')) : realFetch(url, options);
const {app} = require('electron');
app.on('session-created', session => session.webRequest.onBeforeRequest({urls:['*://tubhool.com/*','*://*.tubhool.com/*']}, (_details, callback) => callback({cancel:true})));
require(path.join(projectRoot, 'src', 'desktop', 'main.js'));
