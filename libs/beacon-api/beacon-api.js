const VERSION = '1.0.1'; // filter_status, validation
const { getJson } = require('./http-request');

const VALIDATOR_STATES = new Set(['active_exiting','active_ongoing','exited_unslashed','pending_initialized','pending_queued','withdrawal_done','withdrawal_possible']);
//const SNAPSHOT_STATES = new Set(['finalized', 'head', epoch_number ...]);

/**
 * @typedef {Object} BeaconValidator
 * @property {string} index
 * @property {string} status
 * @property {Object} validator
 * @property {string} validator.pubkey
 * @property {string} validator.withdrawal_credentials
 * @property {string} validator.effective_balance
 * @property {boolean} validator.slashed
 * @property {string} validator.activation_eligibility_epoch
 * @property {string} validator.activation_epoch
 * @property {string} validator.exit_epoch
 * @property {string} validator.withdrawable_epoch
 */

/**
 * @typedef {Object} ValidatorsResponse
 * @property {boolean} execution_optimistic
 * @property {boolean} finalized
 * @property {BeaconValidator[]} data
 */

/**
 * Fetches validators for a given state (head/finalized/epoch/root) from the beacon node.
 *
 * Builds `GET /eth/v1/beacon/states/{state}/validators` and supports `id` and `status` filters.
 *
 * @param {Object} options
 * @param {string} [options.beaconBaseUrl="http://localhost:5052"] - Beacon REST base URL.
 * @param {string|number} [options.state="finalized"] - "head" | "finalized" | epoch number | block root.
 * @param {string|string[]} [options.pubIdsList=null] - Filter: indices or pubkeys (CSV or array).
 * @param {string|string[]} [options.status_filter=null] - Filter: validator statuses (CSV or array).
 * @param {number} [options.timeoutMs=20000] - Socket inactivity timeout in ms.
 * @param {boolean} [options.verboseLog=false] - Enable verbose logging.
 * @returns {Promise<ValidatorsResponse>} Raw beacon response with `data` array of validators.
 * @throws {Error} If the REST call fails, times out, or returns invalid JSON.
 *
 * @example
 * const res = await fetchValidatorsSnapshot({ beaconBaseUrl: 'http://localhost:5052', state: 'finalized',
 *   statuses: ['active_ongoing','active_exiting'] });
 * console.log(res.data.length);
 */
async function fetchValidatorsSnapshot(
	{
		beaconBaseUrl = "http://localhost:9596",
		state = "finalized",           // "finalized" | "head" | epoch | root
		pubIdsList = null,             // array<number|string> or "1000,1001"
		status_filter = null,               // "active_ongoing" or "active_ongoing,active_exiting" or arr ["active_ongoing", "active_exiting"]
		timeoutMs = 20000,
		verboseLog = false
	}) {
	// validate state
	//if(!SNAPSHOT_STATES.has(state)) throw new Error(`Invalid state: ${state} | Allowed: head, finalized, <epoch>, <root>`);

	function validateStatusFilter(input) {
		let inputArr = null;
		if (typeof input === 'string'){ 
			inputArr = input.split(',').map(x => x.trim()).filter(Boolean); 
		} else if(Array.isArray(input)){ 
			inputArr = input; 
		}
		if(!inputArr) throw new Error('status_filter must be string | string[] | null');
		for (const st of inputArr) { 
			if (!VALIDATOR_STATES.has(st)) throw new Error(`Invalid status_filter: "${st}". Allowed: ${[...VALIDATOR_STATES].join(', ')}`); 
		}
	}
	if(status_filter !== null) validateStatusFilter(status_filter);

	if(verboseLog) console.log(`Fetching validators snapshot for ${state} state on ${beaconBaseUrl} | statuses filter: ${status_filter}`);
	
	// base URL parsing + canonicalization
	const base = beaconBaseUrl.replace(/\/$/, "");
	let path = `/eth/v1/beacon/states/${state}/validators`;

	const qs = [];
	const idsCsv = toCsvParam(pubIdsList);   		// handles ["1000","1001"] or "1000,1001" or "1000"
	const stCsv  = toCsvParam(status_filter);     // handles ["active_ongoing"] or "active_ongoing,active_exiting"
	if (idsCsv) qs.push(`id=${idsCsv}`);
	if (stCsv)  qs.push(`status=${stCsv}`);
	if (qs.length) path += `?${qs.join("&")}`;

	const u = new URL(base);
	if(!u.protocol || !u.hostname || !u.port) throw new Error(`Invalid beaconBase URL: ${beaconBaseUrl} | must include protocol, hostname and port, e.g. http://localhost:9596`);

	const fullUrl = new URL(path, base).toString();
	const json = await getJson(fullUrl, { timeout: timeoutMs });

	if (verboseLog) {
		const count = Array.isArray(json?.data) ? json.data.length : 0;
		console.log(`[fetchValidatorsSnapshot] ${fullUrl} | filter: ${status_filter} → ${count} validators`);
	}
	return json; // { execution_optimistic, finalized, data: [...] }

	function toCsvParam(values) {
		if (values == null) return null;

		// If it's already an array, use it; if it's a string, split by comma.
		const arr = Array.isArray(values)
			? values
			: String(values).split(','); // allow single or CSV string

		// Clean + encode each item; keep commas literal when joining.
		const cleaned = arr
			.map(v => String(v).trim())
			.filter(Boolean)
			.map(v => encodeURIComponent(v));

		return cleaned.length ? cleaned.join(',') : null;
	}
}

async function getGenesisTime(beaconBaseUrl, timeoutMs = 20000) {
    const url = `${beaconBaseUrl.replace(/\/$/, '')}/eth/v1/beacon/genesis`;
    const j = await getJson(url, { timeout: timeoutMs });
    return Number(j?.data?.genesis_time);
}

async function getSpec(beaconBaseUrl, timeoutMs = 20000) {
	const base = beaconBaseUrl.replace(/\/$/, "");
	const url  = new URL('/eth/v1/config/spec', base).toString();
	return await getJson(url, { timeout: timeoutMs });
}

async function getSecondsPerSlot(beaconBaseUrl, timeoutMs = 20000) {
	const j = await getSpec(beaconBaseUrl, timeoutMs);
	const v = Number(j?.data?.SECONDS_PER_SLOT ?? j?.data?.seconds_per_slot ?? 12);
	return Number.isFinite(v) && v > 0 ? v : 12;
}

/**
 * Detects the network (Ethereum, Gnosis, or unknown) by reading
 * `/eth/v1/config/spec` and matching `DEPOSIT_CONTRACT_ADDRESS`.
 * 
 * @param {Object} options
 * @param {string} options.beaconBaseUrl - Beacon REST base URL (e.g. "http://localhost:5052").
 * @param {number} [options.timeoutMs=20000] - Socket inactivity timeout in milliseconds.
 * @returns {Promise<"ethereum"|"gnosis"|"unknown">} Resolved chain identifier.
 * @throws {Error} If the REST call fails or returns invalid JSON.
 * 
 * @example
 * const chain = await RecognizeChain({ beaconBaseUrl: 'http://localhost:5052' });
 * // "ethereum" | "gnosis" | "unknown"
 */
async function RecognizeChain({ beaconBaseUrl, timeoutMs = 20000 }){
	const spec = await getSpec(beaconBaseUrl, timeoutMs);
	const addr = String(spec?.data?.DEPOSIT_CONTRACT_ADDRESS || '').toLowerCase();
    switch(addr){
        case "0x00000000219ab540356cbb839cbe05303d7705fa": return 'ethereum';
        case "0x0b98057ea310f4d31f2a452b414647007d1645d9": return 'gnosis';
        default: 
            console.warn("Chain not recognized | DEPOSIT_CONTRACT_ADDRESS:", addr);
            return 'unknown';
    }
}

async function getFinalityCheckpoint({ beaconBaseUrl, timeoutMs = 20000 }){
	const base = beaconBaseUrl.replace(/\/$/, "");
	const url  = new URL('/eth/v1/beacon/states/head/finality_checkpoints', base).toString();
	return await getJson(url, { timeout: timeoutMs });
}

module.exports = { 
	VERSION,
    RecognizeChain,
	VALIDATOR_STATES,
    fetchValidatorsSnapshot,
	getGenesisTime,
	getSpec,
	getSecondsPerSlot,
	getFinalityCheckpoint
};