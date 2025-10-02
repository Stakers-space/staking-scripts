#!/usr/bin/env node
'use strict';

/**
 * calculate-rewards.js — snapshot-only daily rewards tool (single file, zero deps)
 *
 * Subcommands:
 *   1) snapshot
 *      node calculate-rewards.js snapshot \
 *        --beacon=http://localhost:5052 \
 *        --state=finalized \
 *        --statuses=active_ongoing \
 *        --preset=diag \
 *        --out=/var/data/snap_$(date -u +%F).jsonl \
 *        --format=jsonl \
 *        --timeoutMs=20000 \
 *        --verbose
 *
 *   2) calc-from-snapshots
 *      node calculate-rewards.js calc-from-snapshots \
 *        --snapDir=/var/data \
 *        --date=2025-09-26 \
 *        --indices=1000 \
 *        --beacon=http://localhost:5052 \
 *        --with-withdrawals=true \
 *        --timeoutMs=20000 \
 *        --verbose
 *
 * How the daily total is computed:
 *   total_wei = ΔCL_balance_wei + withdrawals_wei + el_income_wei
 *   - ΔCL_balance_wei is derived from snapshot balances (gwei) * 1e9
 *   - withdrawals_wei can be computed from beacon blocks in the 24h window (optional flag)
 *   - el_income_wei is left as an optional field you can enrich into snapshots if you want
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const loadFromArgs = require("/srv/stakersspace_utils/load-from-process-arguments.js");
const { RecognizeChain, fetchValidatorsSnapshot, getGenesisTime, getSecondsPerSlot } = require("/srv/stakersspace_utils/libs/beacon-api.js");
const { SaveJsonl, ReadJsonl } = require("/srv/stakersspace_utils/libs/filesystem-api.js");
const { getJson } = require('/srv/stakersspace_utils/libs/http-request');

function _toArrayMaybeCSV(x) {
    if (x == null) return null;
    if (Array.isArray(x)) return x;
    const s = String(x).trim();
    if (!s) return null;
    return s.includes(',') ? s.split(',').map(v => v.trim()).filter(Boolean) : [s];
}

class Config {
    constructor() {
        this.beaconBaseUrl = "http://localhost:5052";
        this.chain = "ethereum"; // placeholder
        this.pubIdsList = null,
        this.fileStorageDir = "/tmp/validators-balance-snapshots";
        this.httpTimeoutMs = 30000;
        this.sleepMs = 10;
        this.statuses = ["active_ongoing","active_exiting"];
        this.verboseLog = true;
        this.format = "jsonl";
        this.snapshot_state = "finalized";                                 // "finalized" | "head" | epoch | root   
        this.calc = {
            year: 2025,
            month: 8,
            day: null
        };
    }
}

class RewardsCalculator {
    constructor(){
        this.config = new Config();
        loadFromArgs(this.config);
        this.config.pubIdsList = _toArrayMaybeCSV(this.config.pubIdsList);
        this.config.statuses = _toArrayMaybeCSV(this.config.statuses);
    }

    /**
     * --------------- Process Snapshot Util ---------------
    */
    async processSnapshot(argv = []) {
        const [chain, snapshot] = await Promise.all([
            RecognizeChain({ beaconBaseUrl: this.config.beaconBaseUrl, timeoutMs: this.config.httpTimeoutMs }),
            fetchValidatorsSnapshot({
                beaconBaseUrl: this.config.beaconBaseUrl,
                state: this.config.snapshot_state,
                pubIdsList: this.config.pubIdsList,
                statuses: this.config.statuses,
                timeoutMs: Number(this.config.httpTimeoutMs),
                verboseLog: Boolean(this.config.verboseLog),
            })
        ]);
        this.config.chain = chain;

        console.log(`${this.config.chain} validators snapshot |`, Array.isArray(snapshot?.data) ? snapshot.data.length : 0);

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const envelopeLine = JSON.stringify({
            date: dateStr,
            chain: this.config.chain // "ethereum" | "gnosis" | ...
        });

        // Build validator rows (one JSON per line)
        const lines = [envelopeLine];
        for (const val of snapshot.data || []) {
            lines.push(JSON.stringify({
                i: Number(val.index),                               // index          
                b: Number(val.balance),                             // balance (gwei)
                eb: Number(val.validator?.effective_balance || 0)   // effective_balance (gwei)
                //ur: null // unclaimed_reward
            }));
        }

        // save file
        const finalPath = await SaveJsonl({
            outPath: this.config.fileStorageDir,
            filename: `${this.config.chain}_${dateStr}.jsonl`,
            lines,
            atomic: true,
        });

        console.log(`Saved snapshot → ${finalPath}`);
    }

    /**
    * --------------- Calculate Reward from Snapshots Util ---------------
    */
    async calculateFromSnapshots(){
        // recognize chain
        this.config.chain = await RecognizeChain({ beaconBaseUrl: this.config.beaconBaseUrl, timeoutMs: this.config.httpTimeoutMs });
        
        /** Get calculation range */
        const days  = this._getDayRangeFromConfig();

        // prepare index filter
        const idxSet = (this.config.pubIdsList && Array.isArray(this.config.pubIdsList) && this.config.pubIdsList.length) ? new Set(this.config.pubIdsList.map(x => String(x))) : null;
        const filterByIdx = (rows) => {
            if (!idxSet) return rows;
            return rows.filter(r => idxSet.has(String(r.i ?? r.index)));
        };

        const daily = [];
        let firstDay = null, lastDay = null;

        for (let i = 0; i < days.length; i++) {
            const day = days[i];
            const currDate = new Date(day + 'T00:00:00Z');
            const prevDate = new Date(currDate); prevDate.setUTCDate(prevDate.getUTCDate() - 1);

            const fPrev = this._findSnapshotFile(this.config.fileStorageDir, this.config.chain, this._ymd(prevDate));
            const fCurr = this._findSnapshotFile(this.config.fileStorageDir, this.config.chain, day);

            if (!fPrev || !fCurr) {
                if (this.config.verboseLog) {
                    console.warn(`[calc] skipping ${day}: snapshot missing (prev=${!!fPrev}, curr=${!!fCurr})`);
                }
                continue;
            }

            const prevSnap = ReadJsonl(fPrev); // ToDo: should keep in cache, if was in last iteration
            const currSnap = ReadJsonl(fCurr);

            const prevRows = filterByIdx(prevSnap.rows);
            const currRows = filterByIdx(currSnap.rows);

            // base: CL delta only
            const resBase = this.computeDailyFromSnapshots(prevRows, currRows);

            // [WITHDRAWALS] — extra scan over the day window
            let wdWei = 0n;
            const scanIndices = currRows.map(r => Number(r.i ?? r.index)).filter(Number.isFinite);
            const startTs = Date.UTC(currDate.getUTCFullYear(), currDate.getUTCMonth(), currDate.getUTCDate(), 0, 0, 0) / 1000;
            const endTs   = Date.UTC(currDate.getUTCFullYear(), currDate.getUTCMonth(), currDate.getUTCDate(), 23, 59, 59) / 1000 + 1;
            if (this.config.verboseLog) console.log("[fetchWithdrawalsBetween]", currDate, "scanIndices:", scanIndices, "time range:",startTs,"→",endTs);
            try {
                wdWei = await fetchWithdrawalsBetween({
                    startTs,
                    endTs,
                    indices: scanIndices
                });
            } catch (e) {
                if (this.config.verboseLog) console.warn(`[calc] withdrawals failed for ${day}: ${e.message}`);
            }

            const totalWei = resBase.totalWei + wdWei;

            daily.push({
                date: day,
                cl_delta_wei: res.clDeltaWei.toString(),
                withdrawals_wei: res.withdrawalsWei.toString(),
                el_income_wei: res.elIncomeWei.toString(),
                total_wei: totalWei.toString(),
                total_eth: (Number(totalWei) / 1e18).toFixed(12),
            });

            if (!firstDay) firstDay = day;
            lastDay = day;
        }

        // jsonStorage (aggregate container)
        const jsonStorage = {
            meta: {
                chain: this.config.chain,
                from: firstDay,
                to: lastDay,
                indices: idxSet ? Array.from(idxSet) : null,
                count_days: daily.length,
            },
            days: daily
        };

        JSON.stringify(jsonStorage, null, 2);

        // ToDO: save to CSV
    }

    computeDailyFromSnapshots(prevRows, currRows) {
        const mapByIndex = (rows) => {
            const m = new Map();
            for (const r of rows) {
            const idx = Number(r.i ?? r.index);
            if (Number.isFinite(idx)) m.set(idx, r);
            }
            return m;
        };
        const prev = mapByIndex(prevRows);
        const curr = mapByIndex(currRows);

        let clDeltaWei = 0n, withdrawalsWei = 0n, elIncomeWei = 0n;
        for (const [idx, now] of curr.entries()) {
            const nowGwei = BigInt(now.b ?? now.balance ?? now.balance_gwei ?? 0);
            const wasGwei = BigInt(prev.get(idx)?.b ?? prev.get(idx)?.balance ?? prev.get(idx)?.balance_gwei ?? 0);
            clDeltaWei += (nowGwei - wasGwei) * 1_000_000_000n;
        }
        return { clDeltaWei, withdrawalsWei, elIncomeWei, totalWei: clDeltaWei + withdrawalsWei + elIncomeWei };
    }

    // Sum withdrawals (wei) for specific validator indices within [startTs, endTs)
    async fetchWithdrawalsBetween({
        startTs,
        endTs,
        indices,                 // array<number|string>
    }) {
        if (!indices || !indices.length) return 0n;

        const [genesis, secPerSlot] = await Promise.all([
            getGenesisTime(this.config.beaconBaseUrl, Number(this.config.httpTimeoutMs)),
            getSecondsPerSlot(this.config.beaconBaseUrl, Number(this.config.httpTimeoutMs)),
        ]);

        const slotForTs = (ts) => ts <= genesis ? 0 : Math.floor((ts - genesis) / secPerSlot);
        const startSlot = slotForTs(startTs);
        const endSlot   = slotForTs(endTs);

        const base = this.config.beaconBaseUrl.replace(/\/$/, '');
        const wanted = new Set(indices.map((x) => Number(x)).filter(Number.isFinite));

        let sumWei = 0n;

        // small concurrency limiter
        const limit = 4;
        let next = startSlot;
        async function worker() {
            while (true) {
                const slot = next++;
                if (slot >= endSlot) return;
                const url = `${base}/eth/v2/beacon/blocks/${slot}`;
                try {
                    const j = await getJson(url, {timeout: Number(this.config.httpTimeoutMs) });
                    const w = j?.data?.message?.body?.execution_payload?.withdrawals
                        || j?.data?.execution_payload?.withdrawals
                        || [];
                    for (const wi of w) {
                        const vidx = Number(wi.validator_index ?? wi.validatorIndex ?? wi.index);
                        if (!wanted.has(vidx)) continue;
                        const amtGwei = BigInt(wi.amount || 0);
                        sumWei += amtGwei * 1_000_000_000n;
                    }
                } catch (e) {
                    // tolerate missing/historical-regeneration errors
                    if (this.config.verboseLog) console.warn(`[withdrawals] slot ${slot}: ${e.message}`);
                }
            }
        }
        await Promise.all(new Array(Math.min(limit, Math.max(0, endSlot - startSlot))).fill(0).map(() => worker()));

        if (this.config.verboseLog) console.log(`[withdrawals] ${startSlot}..${endSlot} for ${wanted.size} indices → ${sumWei} wei`);
        return sumWei;
    }

    /** Return array of UTC day strings for either a single day or the whole month from this.config.calc */
    _getDayRangeFromConfig() {
        const { calc } = this.config;
        if (calc?.day) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(calc.day)) throw new Error(`Invalid day '${calc.day}' (expected YYYY-MM-DD)`);
            return [calc.day];
        }
        if (!calc?.year || !calc?.month) throw new Error(`Provide either calc.day=YYYY-MM-DD or calc.year+calc.month`);
        const Y = Number(calc.year), M = Number(calc.month);
        if (!Number.isFinite(Y) || !Number.isFinite(M) || M < 1 || M > 12) throw new Error(`Invalid year/month '${calc.year}-${calc.month}'`);

        const first = new Date(Date.UTC(Y, M - 1, 1));
        const next  = new Date(Date.UTC(Y, M, 1));
        const days = [];
        for (let d = new Date(first); d < next; d.setUTCDate(d.getUTCDate() + 1)) {
            days.push(this._ymd(d));
        }
        return days;
    }

    /** Find snapshot path with pattern <chain>_<YYYY-MM-DD>.jsonl in dir */
    _findSnapshotFile(dir, chain, dayStr) {
        const fname = `${chain}_${dayStr}.jsonl`;
        const p = require('path').join(dir, fname);
        return require('fs').existsSync(p) ? p : null;
    }

    /** "YYYY-MM-DD" (UTC) */
    _ymd(dt) {
        return new Date(dt).toISOString().slice(0,10);
    }
}

// ------------------------- Entrypoint -------------------------
(async () => {
    const tool = new RewardsCalculator();
    const argv = process.argv.slice(2);
    if (argv[0] === "snapshot") {
        try {
            await tool.processSnapshot();
            process.exit(0);
        } catch (err) {
            console.error(err?.message || err);
            process.exit(1);
        }
    } else if (argv[0] === "calc-from-snapshots") {
        try {
            await tool.calculateFromSnapshots();
            process.exit(0);
        } catch (err) {
            console.error(err?.message || err);
            process.exit(1);
        }
    }
})();