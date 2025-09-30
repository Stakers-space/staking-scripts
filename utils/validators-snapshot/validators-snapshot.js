'use strict';

/**
 * Validator Snapshot Util | V 1.0.1 | 2025-09-30
 * 
 * Fetches validator data snapshot from beacon node REST API.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs/promises');

function httpRequest(options, body = null) {
	const lib = (options.protocol && options.protocol === 'https:' ? https : http);
	
	return new Promise((resolve, reject) => {
		const req = lib.request(options, (res) => {
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
			req.setTimeout(options.timeout, () => {
				req.destroy(new Error(`Request timeout after ${options.timeout} ms`));
			});
		}
		
		req.on('error', reject);

		if (body != null) req.write(body);
		req.end();
	});
}

async function fetchSnapshot(
	{
		beaconBaseUrl = "http://localhost:9596",
		state = "finalized",           // "finalized" | "head" | epoch | root
		pubIdsList = null,                // array<number|string> or "1000,1001"
		statuses = null,               // array<string> or "active_ongoing,active_exiting"
		timeoutMs = 20000,
		sleepMs = 0,
		verboseLog = false
	}) {

	if(verboseLog) console.log(`Fetching validators snapshot for ${state} state on ${beaconBaseUrl} | statuses filter: ${statuses}`);
	
	// base URL parsing + canonicalization
	const base = beaconBaseUrl.replace(/\/$/, "");
	let path = `/eth/v1/beacon/states/${state}/validators`;

	const qs = [];
	if (pubIdsList && (Array.isArray(pubIdsList) ? pubIdsList.length : true)) {
		const ids = Array.isArray(pubIdsList) ? pubIdsList.join(",") : String(pubIdsList);
		qs.push(`id=${encodeURIComponent(ids)}`);
	}
	if (statuses && (Array.isArray(statuses) ? statuses.length : true)) {
		const st = Array.isArray(statuses) ? statuses.join(",") : String(statuses);
		qs.push(`status=${encodeURIComponent(st)}`);
	}
	if (qs.length) path += `?${qs.join("&")}`;

	const u = new URL(base);
	if(!u.protocol || !u.hostname || !u.port) throw new Error(`Invalid beaconBase URL: ${beaconBaseUrl} | must include protocol, hostname and port, e.g. http://localhost:9596`);

	const raw = await httpRequest({
		protocol: u.protocol,                      			    // 'http:' | 'https:'
		hostname: u.hostname,
		port: u.port,
		path,
		method: 'GET',
		headers: { 'Accept': 'application/json' },
		timeout: timeoutMs,                                    // socket inactivity timeout (ms)
	}, null);

	if (sleepMs > 0) await new Promise(r => setTimeout(r, sleepMs));

	let json;
	try {
		json = JSON.parse(raw);
	} catch (e) {
		throw new Error(`Invalid JSON from ${u.origin}${path}: ${e.message}\nPayload(head): ${raw.slice(0,200)}`);
	}

	if (verboseLog) {
		const count = Array.isArray(json?.data) ? json.data.length : 0;
		console.log(`[fetchSnapshot] ${u.origin}${path} → ${count} validators`);
	}
	return json; // { execution_optimistic, finalized, data: [...] }
}

function pick(obj, fields) {
	if (!fields) return obj;
	const out = {};
	for (const k of fields) out[k] = obj[k];
	return out;
}

function defaultTransform(v /*, ctx */) {
	const idx = Number(v.index);
	const balGwei = Number(v?.validator?.balance || 0);           // CL balance (gwei)
	const effGwei = Number(v?.validator?.effective_balance || 0);
	const pk = v?.validator?.pubkey || null;
	return {
		index: idx,
		pubkey: pk,
		balance: balGwei,
		effective_balance: effGwei,
		status: v.status || '',
		withdrawal_credentials: v?.validator?.withdrawal_credentials || '',
		activation_epoch: Number(v?.validator?.activation_epoch || 0),
		exit_epoch: Number(v?.validator?.exit_epoch || 0),
		withdrawable_epoch: Number(v?.validator?.withdrawable_epoch || 0),
	};
}

async function writeOut(rows, { path, format = 'jsonl', atomic = true }, verbose = false) {
	if (!Array.isArray(rows)) throw new Error('writeOut: rows must be an array');
	let payload = '';
	if (format === 'jsonl') {
		payload = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
	} else if (format === 'json') {
		payload = JSON.stringify(rows, null, 2) + '\n';
	} else if (format === 'csv') {
		const headers = Object.keys(rows[0] || {});
		const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => r[h] ?? '').join(',')));
		payload = lines.join('\n') + '\n';
	} else {
		throw new Error(`writeOut: unsupported format '${format}'`);
	}

	if (!atomic) {
		await fs.writeFile(path, payload);
		if (verbose) console.log(`[processSnapshot] wrote ${rows.length} rows → ${path}`);
		return;
	}
	const tmp = `${path}.tmp.${Date.now()}`;
	await fs.writeFile(tmp, payload);
	await fs.rename(tmp, path);
	if (verbose) console.log(`[processSnapshot] wrote ${rows.length} rows → ${path} (atomic)`);
}

async function processSnapshot({
	beaconBaseUrl = "http://localhost:9596",          
	state = "finalized",
	pubIdsList = null,                                
	statuses = ["active_ongoing","active_exiting"],   // default: active
	transform = defaultTransform,                     
	onRecord = null,                                  // (rec, raw) => void|Promise
	onBatch = null,                                   // (rows, rawJson) => void|Promise
	toFile = null,                                    // { path, format: "jsonl"|"json"|"csv", atomic?: true }
	includeFields = ["index","balance","effective_balance"],
	timeoutMs = 20000,
	sleepMs = 0,
	verboseLog = false,                               
}) {
	const raw = await fetchSnapshot({
		beaconBaseUrl,
		state,
		pubIdsList,
		statuses,
		timeoutMs,
		sleepMs,
		verboseLog
	});

	const arr = raw?.data || [];
	const out = [];
	for (const obj of arr) {
		const rec = transform(obj, { chain: 'ethereum_or_gnosis' });
		const slim = includeFields ? pick(rec, includeFields) : rec;
		if (onRecord) await onRecord(slim, obj);
		out.push(slim);
	}

	if (onBatch) await onBatch(out, raw);
	if (toFile) await writeOut(out, toFile, verboseLog);

	return { meta: { count: out.length, state, beaconBaseUrl }, rows: out };
}

module.exports = {
	fetchSnapshot,
	processSnapshot
};