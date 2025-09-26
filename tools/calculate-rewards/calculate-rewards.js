#!/usr/bin/env node
/**
* Daily Ethereum/Gnosis validator consensus rewards for a given month. | version: 0.0.4
*
 * CLI (--arguments; default values in Config):
 *   --beacon            Beacon API base URL (default: "http://localhost:5052")
 *   --validatorIndex    Integer validator index ("pubId") (default: 1000)
 *   --year              Year (default: 2025)
 *   --month             Month 1–12 (default: 9)
 *   --day               Day 1–31 (default: all days in month)
 *   --chain             "ethereum" | "gnosis"
 *   --outputCsv         Output CSV path (default: print to stdout)
 *   --httpTimeoutMs     Timeout for HTTP requests in ms (default: 60000)
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
        this.httpTimeoutMs = 60000;
        this.sleepMs = 10;

        this.slotSetup = { SLOT_SECONDS: 12, SLOTS_PER_EPOCH: 32, };

        this.calulateSetup = {
            attestation: true,
            proposer: true,
            syncCommittee: false
        }
    }
}

class EpochRewards {
    constructor() {
        this.epochs = Object.create(null); // { [epoch:number]: { attestation, blockProposal, syncCommittee, sum }:gwei }
        this.dates = Object.create(null);  // { [date:string]: { attestation, blockProposal, syncCommittee, sum }:gwei }
    }

    newEpochEntry(defValue = 0) {
        return { attestation: defValue,  blockProposal: defValue, syncCommittee: defValue, sum: defValue };  // Number | null
    }

    attachReward(date, epoch, type, value) {
        if(!this.epochs[date]) this.epochs[date] = {};
        const row = (this.epochs[date][epoch] ||= this.newEpochEntry(0));

        if(type === "sum") {
            return console.error("Restricted type 'sum'");
        } else {
            if (!(type in row)) { console.error("Invalid reward type", type); return; }
        }
        
        row[type] = value;
        this._processSumOperation(row, "sum", value);
    }

    calculateDaySum(date) {
        let daySum = (this.dates[date] ||= this.newEpochEntry(null));
        const dayEpochs = this.epochs[date];
        if(!dayEpochs) return;

        daySum = this.newEpochEntry(0);

        for (const row of Object.values(dayEpochs)) { 
            this._processSumOperation(daySum, "attestation", row.attestation);
            this._processSumOperation(daySum, "blockProposal", row.blockProposal);
            this._processSumOperation(daySum, "syncCommittee", row.syncCommittee);
            this._processSumOperation(daySum, "sum", row.sum);
        }
    }

    _processSumOperation(row, type, value){
        if(row[type] !== null) {
            if(value === null) {
                row[type] = null;
            } else {
                row[type] += value;
            }
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
    httpRequest(url, options = {}, timeoutMs = 0) {
        return new Promise((resolve, reject) => {
            const req = http.request(
                url,
                {
                    method: options.method || "GET",
                    headers: options.headers || {},
                   ...(timeoutMs > 0 ? { timeout: timeoutMs } : {}),
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
    async beaconGet(path, params = undefined, timeoutMs = 0) {
        const { beacon, sleepMs } = this.config;
        let url = beacon.replace(/\/$/, "") + path;
        if (params) {
            const usp = new URLSearchParams(params);
            url += "?" + usp.toString();
        }
        const json = await this.httpRequest(url, {}, timeoutMs);
        if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
        return json;
    }

    async beaconPost(path, body, timeoutMs = 0) {
        const { beacon, sleepMs } = this.config;
        let url = beacon.replace(/\/$/, "") + path;
        const json = await this.httpRequest(
            url,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
            timeoutMs
        );
        if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
        return json;
    }

    async getCanonicalHeaderForSlot(slot) {
        try {
            const j = await this.beaconGet(`/eth/v1/beacon/headers/${slot}`, {}, this.config.httpTimeoutMs );
            // j.data = { root, header: { message: { slot, ... }, ... } }
            return j.data || null;
        } catch (e) {
            // 404 -> slot without block (missed), 500 -> BN does not have data
            return null;
        }
    }

    async isInSyncCommittee(epoch, validatorIndex) {
        // use „finalized“ state for history (more stable than „head“)
        const j = await this.beaconGet( `/eth/v1/beacon/states/finalized/sync_committees?epoch=${epoch}`, {}, this.config.httpTimeoutMs );
        // j.data.validators = [indices...]
        const arr = j.data?.validators || [];
        return arr.some(v => parseInt(v, 10) === validatorIndex);
    }

    // ----------- Beacon endpoints -----------
    async getGenesisTime() {
        const j = await this.beaconGet("/eth/v1/beacon/genesis", {}, this.config.httpTimeoutMs);
        return parseInt(j.data.genesis_time, 10);
    }

    // https://ethereum.github.io/beacon-APIs/#/Rewards/getAttestationsRewards
    async getAttestationRewards(epoch, indices) {
        const body = indices.map(i => i.toString());
        const j = await this.beaconPost( `/eth/v1/beacon/rewards/attestations/${epoch}`, body, this.config.httpTimeoutMs );
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
        //console.log(`Fetching proposer duty for epoch ${epoch} / validatorIndex ${validatorIndex} |`, j);
        for (const duty of j.data || []) {
            if (parseInt(duty.validator_index, 10) === validatorIndex) {
                return parseInt(duty.slot, 10);
            }
        }
        // no proposer duty for validatorIndex
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
        const j = await this.beaconPost( `/eth/v1/beacon/rewards/sync_committee/${slot}`, body, this.config.httpTimeoutMs );
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

        const epochRewards = new EpochRewards();

        const genesis = await this.getGenesisTime();

        for (const day of this.daysToProcess(year, month)) {
            const start = Date.UTC( day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0 ) / 1000;
            const   end = Date.UTC( day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59 ) / 1000 + 1;

            const eStart = this.epochForTimestamp(genesis, start);
            const eEnd = this.epochForTimestamp(genesis, end);


            const date = day.toISOString().slice(0, 10);
            console.log(`\nCalculating rewards for ${date} (epochs ${eStart}–${eEnd - 1}))`);

            for (let e = eStart; e < eEnd; e++) {
                // 1) Attestations
                if(this.config.calulateSetup.attestation){
                    try {
                        const r = await this.getAttestationRewards(e, [validatorIndex]);
                        epochRewards.attachReward(date, e, "attestation", (r[validatorIndex] ?? 0));
                    } catch (err) {
                        epochRewards.attachReward(date, e, "attestation", null);
                        console.error( `WARN: attestation rewards failed for epoch ${e}:`, err?.message || err );
                    }
                } 
            
                // 2) Proposer rewards (if pubId is proposer in the epoch)
                if(this.config.calulateSetup.proposer){
                    try {
                        const slot = await this.getProposerDutySlot(e, validatorIndex);
                        if (slot !== -1) {
                            console.log(`Epoch ${e} | Getting getBlockRewards for proposer slot:`, slot);
                            try {
                                const g = await this.getBlockRewards(String(slot));
                                epochRewards.attachReward(date, e, "blockProposal", g);
                            } catch (err) {
                                epochRewards.attachReward(date, e, "blockProposal", null);
                                console.error( `WARN: block rewards failed for epoch ${e} slot ${slot}:`, inner?.message || inner );
                            }
                        }
                    } catch (err) {
                        epochRewards.attachReward(date, e, "blockProposal", null);
                        console.error( `WARN: getProposerDutySlot failed for epoch ${e}:`, err?.message || err );
                    }
                }

                // 3) Sync committee reward
                if(this.config.calulateSetup.syncCommittee){
                    try {
                        const inSC = await this.isInSyncCommittee(e, validatorIndex);
                        if (inSC) {
                            const { SLOTS_PER_EPOCH } = this.config.slotSetup;
                            const firstSlot = e * SLOTS_PER_EPOCH;
                            const lastSlot  = (e + 1) * SLOTS_PER_EPOCH - 1;
                            let sum = 0, broken = false;

                            for (let slot = firstSlot; slot <= lastSlot; slot++) {
                            try {
                                sum += await this.getSyncCommitteeRewardsForSlot(slot, [validatorIndex]);
                            } catch (err) {
                                broken = true;
                                console.error(`WARN: sync-committee rewards failed for slot ${slot}:`, err?.message || err);
                                break;
                            }
                            }
                            epochRewards.attachReward(date, e, "syncCommittee", broken ? null : sum);
                        } else {
                            epochRewards.attachReward(date, e, "syncCommittee", 0);
                        }
                    } catch (err) {
                        epochRewards.attachReward(date, e, "syncCommittee", null);
                        console.error(`WARN: sync-committee membership failed for epoch ${e}:`, err?.message || err);
                    }
                }
            }

            epochRewards.calculateDaySum(date);
        }

        return epochRewards;
    }

    // ----------- Launching (I/O) -----------
    async run() {
        if (this.config.month < 1 || this.config.month > 12) {
            throw new Error(`Invalid month '${this.config.month}'. Use 1-12.`);
        }
        if (!Number.isInteger(this.config.validatorIndex)) {
            throw new Error(`Invalid validatorIndex '${this.config.validatorIndex}'.`);
        }

        const Rewards = await this.aggregateDaily();

        if(!this.config.outputCsv) {
            console.log("Values in WEI");
            return console.log(Rewards); 
        }

        //const toWei = (v) => v === null ? "unknown" : (BigInt(v) * 1_000_000_000n).toString();

        // if save to csv
        // epochs
        const header = ["epoch","cl_attestations_wei","cl_proposer_wei","cl_sync_wei","sum_wei","date"];
        const csvLines = [header.join(",")];
        for (const [epoch, r] of Object.entries(Rewards.epochs)) {
            csvLines.push(`${epoch},${r.attestation},${r.blockProposal},${r.syncCommittee},${r.sum},${r.date}`);
            // toWei(r.attestation)
        }

        // ToDO: days

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