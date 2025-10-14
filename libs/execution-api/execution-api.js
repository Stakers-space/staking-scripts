'use strict';
const VERSION = 1.1;

const requireLib = function(relOrAbsPath, fallback_HomeDirPath) { const fs = require('fs'), os = require('os'), path = require('path');
    const p = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.resolve(__dirname, relOrAbsPath);
    if (fs.existsSync(p)) return require(p);
    const fallback_AbsPath = path.join(os.homedir(), fallback_HomeDirPath);
    if(fs.existsSync(fallback_AbsPath)) return require(fallback_AbsPath);
    throw new Error(`Module not found at ${p} neither ${fallback_HomeDirPath}`);
}

const { getJson } = requireLib('./http-request.js', 'staking-scripts/libs/http-request/http-request.js');

// --- helpers ---
function ensure0x(s) { return s.startsWith('0x') ? s : `0x${s}`;}
function strip0x(s) { return s.startsWith('0x') ? s.slice(2) : s;}
function pad64(hexNo0x) { return hexNo0x.padStart(64, '0'); }
function isAddress(addr) { return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr); }
/** Convert wei (BigInt) to decimal string with 18 decimals */
function formatWeiToEthString(weiBigInt, decimals = 18) {
    const neg = weiBigInt < 0n ? '-' : '';
    const v = weiBigInt < 0n ? -weiBigInt : weiBigInt;
    const base = 10n ** BigInt(decimals);
    const intPart = (v / base).toString();
    const frac = (v % base).toString().padStart(decimals, '0').replace(/0+$/, '');
    return neg + (frac ? `${intPart}.${frac}` : intPart);
}
/**
 * Low-level EL JSON-RPC eth_call wrapper for read-only contract calls.
 */
async function ethCall({ elBaseUrl = 'http://localhost:8545', to, data, timeoutMs = 20000, blockTag = 'latest' }) {
    const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, blockTag]
    };

    const postData = JSON.stringify(payload);

    const res = await getJson(elBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length },
        timeout: timeoutMs,
        body: postData
    });
    if (res?.error) {
        throw new Error(`eth_call error: ${res.error?.message || JSON.stringify(res.error)}`);
    }
    return res?.result; // hex string like 0x1a2b...
}

async function getUnclaimedGNORewardsByWallet(executionCLientApiUrl, wallet, timeoutMs = 20000){
    const GNO_UNCLAIMED_CONTRACT = '0x0B98057eA310F4d31F2a452B414647007d1645d9';
    const FN_WITHDRAWABLE_SELECTOR = '0xbe7ab51b'; // withdrawableAmount(address) or equivalent

    if (!isAddress(wallet)) throw new Error(`Invalid wallet address: ${wallet}`);
    // Build calldata: selector + 32B padded address
    const addrNo0x = strip0x(wallet).toLowerCase();
    const data = FN_WITHDRAWABLE_SELECTOR + pad64(addrNo0x);
    const resultHex = await ethCall({
        elBaseUrl: executionCLientApiUrl,
        to: GNO_UNCLAIMED_CONTRACT,
        data,
        timeoutMs
    });
    return BigInt(resultHex || '0x0');
}

async function getAssetbalance(executionCLientApiUrl, wallet, asset_contract, timeoutMs = 20000){
    if (!isAddress(wallet)) throw new Error(`Invalid wallet address: ${wallet}`);
    const addrNo0x = strip0x(wallet).toLowerCase();
    const data = `0x70a08231000000000000000000000000${addrNo0x}`;
    const resultHex = await ethCall({
        elBaseUrl: executionCLientApiUrl,
        to: asset_contract,
        data,
        timeoutMs
    });
    return BigInt(resultHex || '0x0');
}

// get latest block number (hex -> number)
async function getLatestBlockNumber(elBase, timeout = 20000) {
    const j = await getJson(elBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
    });
    return parseInt(j.result, 16);
}

// get block by number with withdrawals
async function getBlock(elBase, number, timeout = 20000) {
  const hex = '0x' + number.toString(16);
  const j = await getJson(elBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: [hex, false] })
  });
  return j.result; // may be null (reorg, pruned)
}

module.exports = {
    VERSION,
    getLatestBlockNumber,
    getBlock,
    getUnclaimedGNORewardsByWallet,
    getAssetbalance
}