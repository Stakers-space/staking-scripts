#!/usr/bin/env node
/**
* Daily Ethereum/Gnosis validator consensus rewards for a given month. | version: 0.0.3
*
 * CLI (--arguments; default values in Config):
 *   --beacon            Beacon API base URL (default: "http://localhost:5052")
 *   --validatorIndex    Integer validator index ("pubId") (default: 1000)
 *   --year              Year (default: 2025)
 *   --month             Month 1–12 (default: 9)
 *   --day               Day 1–31 (default: all days in month)
 *   --chain             "ethereum" | "gnosis"
 *   --outputCsv         Output CSV path (default: print to stdout)
 *   --httpTimeoutMs     Timeout for HTTP requests in ms (default: 1000)
 *   --sleepMs           Delay between requests in ms (default: 10)
 *
 * Output:
 *   CSV: date, cl_attestations_wei, cl_proposer_wei, cl_total_wei, cl_total_eth
 *
 * Notes:
 *   - Day = UTC day.
 *   - Currently only CL (attestations + proposer). TODO: sync-committee & execution-layer rewards.
 */
import fs from "fs";
import http from "http";
import loadFromArgumentsUtil from "./load-from-process-arguments.js";

// Consensus Layer
// POST /eth/v1/beacon/rewards/attestations/{epoch}
// GET /eth/v1/beacon/rewards/blocks/{block_id}
// POST /eth/v1/beacon/rewards/sync_committee/{block_id}

class Config {
    constructor() {
        this.beacon = "http://localhost:5052";
        this.validatorIndex = 1000;
        this.year = 2025;
        this.month = 8;
        this.day = null;
        this.chain = "ethereum"; // placeholder
        this.outputCsv = null;
        this.httpTimeoutMs = 1000;
        this.sleepMs = 10;

        this.slotSetup = {
            SLOT_SECONDS: 12,
            SLOTS_PER_EPOCH: 32,
        };

        this.calulateSetup = {
            attestation: true,
            proposer: false,
            syncCommittee: false
        }
    }
}

class RewardsCalculator {
    constructor(){
        this.config = new Config();
        loadFromArgumentsUtil(this.config);

        switch(this.config.chain){
            case "ethereum":
                this.config.slotSetup = { SLOT_SECONDS: 12, SLOTS_PER_EPOCH: 32 };
                break;
            case "gnosis":
                this.config.slotSetup = { SLOT_SECONDS: 5, SLOTS_PER_EPOCH: 16 };
                break;
            default:
                // leave custom values from config.slotSetup
                break;
        }
        console.log("Loaded config:", this.config);
    }

    // ---------- Low-level HTTP (localhost over http) ----------
    httpRequest(url, options = {}, timeoutMs = 20000) {
        return new Promise((resolve, reject) => {
            const req = http.request(
                url,
                {
                    method: options.method || "GET",
                    headers: options.headers || {},
                    timeout: timeoutMs, // fires 'timeout' event
                },
                (res) => {
                    let data = "";
                    res.on("data", (chunk) => (data += chunk));
                    res.on("end", () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data || "{}"));
                        } catch (err) {
                            reject(new Error("Invalid JSON response: " + err.message));
                        }
                        } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                }
            );

            req.on("timeout", () => {
                req.destroy(new Error(`HTTP timeout after ${timeoutMs} ms`));
            });
            req.on("error", reject);

            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    // ---------- Beacon helpers ----------
    async beaconGet(path, params = undefined) {
        const { beacon, httpTimeoutMs, sleepMs } = this.config;
        let url = beacon.replace(/\/$/, "") + path;
        if (params) {
            const usp = new URLSearchParams(params);
            url += "?" + usp.toString();
        }
        const json = await this.httpRequest(url, {}, httpTimeoutMs);
        if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
        return json;
    }

    async beaconPost(path, body) {
        const { beacon, httpTimeoutMs, sleepMs } = this.config;
        let url = beacon.replace(/\/$/, "") + path;
        const json = await this.httpRequest(
            url,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
            httpTimeoutMs
        );
        if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
        return json;
    }

    async getCanonicalHeaderForSlot(slot) {
        try {
            const j = await this.beaconGet(`/eth/v1/beacon/headers/${slot}`);
            // j.data = { root, header: { message: { slot, ... }, ... } }
            return j.data || null;
        } catch (e) {
            // 404 -> slot without block (missed), 500 -> BN does not have data
            return null;
        }
    }

    async isInSyncCommittee(epoch, validatorIndex) {
        // use „finalized“ state for history (more stable than „head“)
        const j = await this.beaconGet( `/eth/v1/beacon/states/finalized/sync_committees?epoch=${epoch}` );
        // j.data.validators = [indices...]
        const arr = j.data?.validators || [];
        return arr.some(v => parseInt(v, 10) === validatorIndex);
    }

    // ----------- Beacon endpoints -----------
    async getGenesisTime() {
        const j = await this.beaconGet("/eth/v1/beacon/genesis");
        return parseInt(j.data.genesis_time, 10);
    }

    // https://ethereum.github.io/beacon-APIs/#/Rewards/getAttestationsRewards
    async getAttestationRewards(epoch, indices) {
        const body = indices.map(i => i.toString());
        const j = await this.beaconPost( `/eth/v1/beacon/rewards/attestations/${epoch}`, body );
        console.log(`Fetching attestation rewards for epoch ${epoch} / body`, JSON.stringify(body), "→", j);

        // Lodestar / spec: j.data = { ideal_rewards: [...], total_rewards: [...] }
        const totals = j?.data?.total_rewards || [];

        const out = {};
        for (const r of totals) {
            const idx = parseInt(r.validator_index ?? r.index, 10);

            // array in Gwei; sum all relevant (incl. penalties)
            const fields = ["head", "target", "source", "inclusion_delay", "inactivity"];
            let sum = 0;
            for (const f of fields) sum += parseInt(r[f] ?? 0, 10);

            out[idx] = (out[idx] || 0) + sum;
        }
        return out; // { [validatorIndex]: gwei }
    }

    async getProposerDutySlot(epoch, validatorIndex) {
        const j = await this.beaconGet(`/eth/v1/validator/duties/proposer/${epoch}`);
        console.log(`Fetching proposer duty for epoch ${epoch} / validatorIndex ${validatorIndex} |`, j);
        for (const duty of j.data || []) {
            if (parseInt(duty.validator_index, 10) === validatorIndex) {
                return parseInt(duty.slot, 10);
            }
        }
        return -1;
    }

    async getBlockRewards(blockId) {
        const j = await this.beaconGet(`/eth/v1/beacon/rewards/blocks/${blockId}`);
        console.log(`Fetching block rewards for slot ${blockId} |`, j);
        const row = (j.data || [])[0]; // { proposer_index, total, ... }
        if (!row) return 0;
       
        const proposer = parseInt(row.proposer_index, 10);
        if (proposer !== this.config.validatorIndex) {
            return 0;
        }
        return parseInt(row.total, 10); // Gwei
    }

    async getSyncCommitteeRewardsForSlot(slot, indices) {
        // does the block exists?
        const header = await this.getCanonicalHeaderForSlot(slot);
        if (!header) return 0;

        const body = indices.map(i => i.toString());
        const j = await this.beaconPost( `/eth/v1/beacon/rewards/sync_committee/${slot}`, body );
        console.log(`Fetching sync committee rewards for slot ${slot} / indices ${indices} |`, j);
        let sumGwei = 0;
        for (const item of j.data || []) {
            if (indices.includes(parseInt(item.validator_index, 10))) {
            sumGwei += parseInt(item.reward || 0, 10);
            }
        }
        return sumGwei; // Gwei
    }

    // ----------- Time helpers -----------
    epochForTimestamp(genesisTimeSec, tsSec) {
        const { SLOT_SECONDS, SLOTS_PER_EPOCH } = this.config.slotSetup;
        const slot = Math.floor((tsSec - genesisTimeSec) / SLOT_SECONDS);
        return slot < 0 ? 0 : Math.floor(slot / SLOTS_PER_EPOCH);
    }

    daysInMonth(year, month) {
        const count = new Date(year, month, 0).getDate();
        return Array.from({ length: count }, (_, i) => new Date(Date.UTC(year, month - 1, i + 1)));
    }

    daysToProcess(year, month) {
        if (this.config.day != null) {
            const d = Number(this.config.day);
            if (!Number.isInteger(d) || d < 1 || d > new Date(year, month, 0).getDate()) {
            throw new Error(`Invalid --day '${this.config.day}' for ${year}-${month}`);
            }
            return [new Date(Date.UTC(year, month - 1, d))];
        }
        return this.daysInMonth(year, month);
    }

    // ----------- Aggergation day/month -----------
    async aggregateDaily() {
        const { validatorIndex, year, month } = this.config;

        const genesis = await this.getGenesisTime();
        const results = [];

        for (const day of this.daysToProcess(year, month)) {
            const start = Date.UTC( day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0 ) / 1000;
            const   end = Date.UTC( day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59 ) / 1000 + 1;

            const eStart = this.epochForTimestamp(genesis, start);
            const eEnd = this.epochForTimestamp(genesis, end);

            console.log(`\nCalculating rewards for ${day.toISOString().slice(0, 10)} (epochs ${eStart}–${eEnd - 1}))`);

            let clAttGwei = 0;
            let clPropGwei = 0;
            let scGwei = 0;

            // 1) Attestations
            if(this.config.calulateSetup.attestation){
                for (let e = eStart; e < eEnd; e++) {
                    try {
                        const r = await this.getAttestationRewards(e, [validatorIndex]);
                        clAttGwei += r[validatorIndex] || 0;
                    } catch (err) {
                        console.error(
                            `WARN: attestation rewards failed for epoch ${e}:`,
                            err?.message || err
                        );
                    }
                }
            }
            
             // 2) Proposer rewards (if pubId is proposer in the epoch)
            if(this.config.calulateSetup.proposer){
                for (let e = eStart; e < eEnd; e++) {
                    try {
                        const slot = await this.getProposerDutySlot(e, validatorIndex);
                        if (slot !== -1) {
                            clPropGwei += await this.getBlockRewards(String(slot));
                        }
                    } catch (err) {
                        console.error(
                            `WARN: proposer/block rewards failed for epoch ${e}:`,
                            err?.message || err
                        );
                    }
                }
            }
            

            // 3) Sync committee reward
            if(this.config.calulateSetup.syncCommittee){
                const maybeEpoch = eStart;
                const inSC = await this.isInSyncCommittee(maybeEpoch, validatorIndex);
                if (inSC) {
                    const { SLOTS_PER_EPOCH } = this.config.slotSetup;
                    const firstSlot = eStart * SLOTS_PER_EPOCH;
                    const lastSlot  = eEnd   * SLOTS_PER_EPOCH - 1;

                    for (let slot = firstSlot; slot <= lastSlot; slot++) {
                        try {
                            scGwei += await this.getSyncCommitteeRewardsForSlot(slot, [validatorIndex]);
                        } catch (err) {
                            console.error(`WARN: sync-committee rewards failed for slot ${slot}:`, err?.message || err);
                        }
                    }
                }
            }
            
            const clTotalGwei = clAttGwei + clPropGwei + scGwei;

            // Wei calculation over BigInt, save to CSV as string
            const GWEI = 1_000_000_000n;
            const clTotalWei = BigInt(clTotalGwei) * GWEI;
            const clAttWei = BigInt(clAttGwei) * GWEI;
            const clPropWei = BigInt(clPropGwei) * GWEI;

            // Human-readeable ETH format (orientation, floating)
            const clTotalEth = Number(clTotalWei) / 1e18;

            results.push({
                date: day.toISOString().slice(0, 10),
                cl_attestations_wei: clAttWei.toString(),
                cl_proposer_wei:     clPropWei.toString(),
                cl_sync_wei:         (BigInt(scGwei) * 1_000_000_000n).toString(),
                cl_total_wei:        clTotalWei.toString(),
                cl_total_eth:        clTotalEth,
            });
        }

        return results;
    }

    // ----------- Luunching (I/O) -----------
    async run() {
        if (this.config.month < 1 || this.config.month > 12) {
            throw new Error(`Invalid month '${this.config.month}'. Use 1-12.`);
        }
        if (!Number.isInteger(this.config.validatorIndex)) {
            throw new Error(`Invalid validatorIndex '${this.config.validatorIndex}'.`);
        }

        const rows = await this.aggregateDaily();

        const header = ["date","cl_attestations_wei","cl_proposer_wei","cl_sync_wei","cl_total_wei","cl_total_eth"];
        const csvLines = [header.join(",")];
        for (const r of rows) {
            csvLines.push(`${r.date},${r.cl_attestations_wei},${r.cl_proposer_wei},${r.cl_sync_wei},${r.cl_total_wei},${r.cl_total_eth}`);
        }
        const csvOut = csvLines.join("\n");

        if (this.config.outputCsv) {
            fs.writeFileSync(this.config.outputCsv, csvOut + "\n");
            console.log(`Wrote ${rows.length} rows to ${this.config.outputCsv}`);
        } else {
            console.log(csvOut);
        }
    }
}

// ------------------------- Entrypoint -------------------------
(async () => {
    const calc = new RewardsCalculator();
    try {
        await calc.run();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();