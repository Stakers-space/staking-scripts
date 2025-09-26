#!/usr/bin/env node
/**
* Daily Ethereum/Gnosis validator consensus rewards for a given month. | version: 0.0.1
*
 * CLI (--arguments; default values in Config):
 *   --beacon            Beacon API base URL (default: "http://localhost:5052")
 *   --validatorIndex    Integer validator index ("pubId") (default: 1000)
 *   --year              Year (default: 2025)
 *   --month             Month 1–12 (default: 8)
 *   --chain             "ethereum" | "gnosis"
 *   --outputCsv         Output CSV path (default: print to stdout)
 *   --httpTimeoutMs     Timeout for HTTP requests in ms (default: 10000)
 *   --sleepMs           Deleay between requests in ms (default: 100)
 *
 * Output:
 *   CSV: date, cl_attestations_wei, cl_proposer_wei, cl_total_wei, cl_total_eth
 *
 * Notes:
 *   - Day = UTC Day.
 *   - Currently Only CL (attestations + proposer). TODO: sync-committee & execution-layer rewards.
 */

import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const loadFromArgs = require("./load-from-process-arguments.js");
import fetch from "node-fetch";

class Config {
    constructor() {
        this.beacon = "http://localhost:5052";
        this.validatorIndex = 1000;
        this.year = 2025;
        this.month = 8;
        this.chain = "ethereum"; // placeholder
        this.outputCsv = null;
        this.httpTimeoutMs = 20000;
        this.sleepMs = 0;

        this.slotSetup = {
            SLOT_SECONDS: 12,
            SLOTS_PER_EPOCH: 32,
        };
    }
}

class RewardsCalculator {
    constructor(){
        this.config = new Config();
        loadFromArgumentsUtil(this.config);

        if(this.chain === "ethereum"){
            this.slotSetup = {
                SLOT_SECONDS: 12,
                SLOTS_PER_EPOCH: 32
            };
        } else if(this.chain === "gnosis"){
            this.slotSetup = {
                SLOT_SECONDS: 5,
                SLOTS_PER_EPOCH: 16
            };
        } // else use custom values from config

        console.log("Loaded config:", config);
    }

    // Consensus Layer
    // POST /eth/v1/beacon/rewards/attestations/{epoch}
    // GET /eth/v1/beacon/rewards/blocks/{block_id}
    // POST /eth/v1/beacon/rewards/sync_committee/{block_id}


    async beaconGet(path, params = undefined) {
        const { beacon, httpTimeoutMs, sleepMs } = this.config;
        let url = beacon.replace(/\/$/, "") + path;
        if (params) {
            const usp = new URLSearchParams(params);
            url += "?" + usp.toString();
        }
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), httpTimeoutMs);
        try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const data = await res.json();
            if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
            return data;
        } finally {
            clearTimeout(t);
        }
    }

    async beaconPost(path, body) {
        const { beacon, httpTimeoutMs, sleepMs } = this.config;
        let url = beacon.replace(/\/$/, "") + path;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), httpTimeoutMs);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const data = await res.json();
            if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
            return data;
        } finally {
            clearTimeout(t);
        }
    }

    // ----------- Beacon endpoints -----------
    async getGenesisTime() {
        const j = await this.beaconGet("/eth/v1/beacon/genesis");
        return parseInt(j.data.genesis_time, 10);
    }

    async getAttestationRewards(epoch, indices) {
        console.log(`Fetching attestation rewards for epoch ${epoch} / indices ${indices} ...`);
        const j = await this.beaconPost(
            `/eth/v1/beacon/rewards/attestations/${epoch}`,
            { indices: indices.map((i) => i.toString()) }
        );
        const out = {};
        for (const item of j.data || []) {
            const idx = parseInt(item.validator_index ?? item.index, 10);
            const att = item.attestation_rewards || item;
            const src = parseInt(att.source ?? 0, 10);
            const tgt = parseInt(att.target ?? 0, 10);
            const head = parseInt(att.head ?? 0, 10);
            out[idx] = (out[idx] || 0) + src + tgt + head;
        }
        return out; // { validatorIndex: rewardGwei }
    }

    async getProposerDutySlot(epoch, validatorIndex) {
        console.log(`Fetching proposer duty for epoch ${epoch} / validatorIndex ${validatorIndex} ...`);
        const j = await this.beaconGet(`/eth/v1/validator/duties/proposer/${epoch}`);
        for (const duty of j.data || []) {
            if (parseInt(duty.validator_index, 10) === validatorIndex) {
                return parseInt(duty.slot, 10);
            }
        }
        return -1;
    }

    async getBlockRewards(blockId) {
        console.log(`Fetching block rewards for slot ${blockId} ...`);
        const j = await this.beaconGet(`/eth/v1/beacon/rewards/blocks/${blockId}`);
        let total = 0;
        for (const comp of j.data || []) {
            total += parseInt(comp.reward || 0, 10);
        }
        return total; // gwei
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

    // ----------- Aggergation day/month -----------
    async aggregateDaily() {
        const { validatorIndex, year, month } = this.config;

        const genesis = await this.getGenesisTime();
        const results = [];

        for (const day of this.daysInMonth(year, month)) {
            const start = Date.UTC( day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0 ) / 1000;
            const   end = Date.UTC( day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59 ) / 1000 + 1;

            const eStart = this.epochForTimestamp(genesis, start);
            const eEnd = this.epochForTimestamp(genesis, end);

            console.log(`\nCalculating rewards for ${day.toISOString().slice(0, 10)} (${start} - ${end}) | epochs ${eStart}–${eEnd - 1}) ...`);

            let clAttGwei = 0;
            let clPropGwei = 0;

            // 1) Attestations
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

            // 2) Proposer rewards (if pubId is proposer in the epoch)
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

            const clTotalGwei = clAttGwei + clPropGwei;

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
                cl_proposer_wei: clPropWei.toString(),
                cl_total_wei: clTotalWei.toString(),
                cl_total_eth: clTotalEth,
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

        const header = [ "date", "cl_attestations_wei", "cl_proposer_wei", "cl_total_wei", "cl_total_eth", ];
        const csvLines = [header.join(",")];
        for (const r of rows) {
            csvLines.push( `${r.date},${r.cl_attestations_wei},${r.cl_proposer_wei},${r.cl_total_wei},${r.cl_total_eth}` );
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
    const calc = new RewardsCalculator(config);
    try {
        await calc.run();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();