'use strict';

/**
 * Validator Snapshot Util | V 1.0.2 | 2025-10-01
 * 
 * Fetches validator data snapshot from beacon node REST API.
 */
const { httpRequest } = require('/srv/stakersspace_utils/libs/http-request');
const fs = require('fs/promises');

async function fetchSnapshot(
	{
		beaconBaseUrl = "http://localhost:9596",
		state = "finalized",           // "finalized" | "head" | epoch | root
		pubIdsList = null,             // array<number|string> or "1000,1001"
		statuses = null,               // array<string> or "active_ongoing,active_exiting"
		timeoutMs = 20000,
		verboseLog = false
	}) {

	if(verboseLog) console.log(`Fetching validators snapshot for ${state} state on ${beaconBaseUrl} | statuses filter: ${statuses}`);
	
	// base URL parsing + canonicalization
	const base = beaconBaseUrl.replace(/\/$/, "");
	let path = `/eth/v1/beacon/states/${state}/validators`;

	const qs = [];
	if (Array.isArray(pubIdsList) && pubIdsList.length) {
		qs.push(`id=${encodeURIComponent(pubIdsList.join(','))}`);
	} else if (typeof pubIdsList === 'string' && pubIdsList.trim()) {
		qs.push(`id=${encodeURIComponent(pubIdsList.trim())}`);
	}
	if (Array.isArray(statuses) && statuses.length) {
		qs.push(`status=${encodeURIComponent(statuses.join(','))}`);
	} else if (typeof statuses === 'string' && statuses.trim()) {
		qs.push(`status=${encodeURIComponent(statuses.trim())}`);
	}
	if (qs.length) path += `?${qs.join("&")}`;

	const u = new URL(base);
	if(!u.protocol || !u.hostname || !u.port) throw new Error(`Invalid beaconBase URL: ${beaconBaseUrl} | must include protocol, hostname and port, e.g. http://localhost:9596`);

	const fullUrl = new URL(path, base).toString();

	const raw = await httpRequest(fullUrl, {
		method: 'GET',
		headers: { 'Accept': 'application/json' },
		timeout: timeoutMs,                                    // socket inactivity timeout (ms)
	}, null);

	let json;
	try {
		json = JSON.parse(raw);
	} catch (e) {
		throw new Error(`Invalid JSON from ${fullUrl}: ${e.message}\nPayload(head): ${raw.slice(0,200)}`);
	}

	if (verboseLog) {
		const count = Array.isArray(json?.data) ? json.data.length : 0;
		console.log(`[fetchSnapshot] ${fullUrl} → ${count} validators`);
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
		i: idx, // validator index
		p: pk, // pubkey
		b: balGwei, // balance
		eb: effGwei, // effective_balance
		s: v.status || '', // status
		w: v?.validator?.withdrawal_credentials || '', // withdrawal_credentials
		ae: Number(v?.validator?.activation_epoch || 0), // activation_epoch
		ee: Number(v?.validator?.exit_epoch || 0), // exit_epoch
		we: Number(v?.validator?.withdrawable_epoch || 0), // withdrawable_epoch
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
	includeFields = ["i","b","eb"],
	timeoutMs = 20000,
	verboseLog = false,                               
}) {
	const raw = await fetchSnapshot({
		beaconBaseUrl,
		state,
		pubIdsList,
		statuses,
		timeoutMs,
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
	processSnapshot,
	defaultTransform
};