// Version 1.0.4 /* removed cron - frequency is now controlled by initializer (crontab, custom service...) */ 
/**
 * Refactored segmentation (full snapshots a are too heavy for Ethereum Lodestar)
 */
const { fetchValidatorsSnapshot, RecognizeChain, getFinalityCheckpoint } = require('/srv/stakersspace_utils/libs/beacon-api.js');
const loadFromArgumentsUtil = require('/srv/stakersspace_utils/libs/load-from-process-arguments.js');
const { ensureDir, SaveJson } = require('/srv/stakersspace_utils/libs/filesystem-api.js');

/* run on localhost through console
 * node validators_balance_collector.js --beaconBaseUrl http://localhost:9596 --output.keepInFile false
*/
class Config {
    constructor(){
        this.chain = null;
        this.beaconBaseUrl = 'http://localhost:9596';
        this.states_track = ['active_exiting', 'active_ongoing', 'exited_unslashed', 'pending_initialized', 'pending_queued', 'withdrawal_done', 'withdrawal_possible'];
        this.requestDelayMs = 5000;
        this.output = {
            keepInFile: true,
            filesSegmentation: true,
            storageDirectory: "/tmp/validator_state_balances"
        }
    }
}

class BalanceCache {
    constructor(){
        this.epoch = null,
        this.data = {}
    }
    SetEpoch(epoch){ this.epoch = epoch; }
    ValidatorState(outputFilesSegmentation, pubId, status, balance){
        if(outputFilesSegmentation){
            this.data[pubId] = balance;
        } else {
            if(!this.data[status]) this.data[status] = {};
            this.data[status][pubId] = balance;
        }
    }
    ClearData(){
        this.data = {};
    }
}

/** Util Processor */
class MonitorValidators {
    constructor(){
        this.setupSignalHandlers();

        this.config = new Config();
        loadFromArgumentsUtil(this.config);
        
        (function normalizeStates(cfg) {
            const VALID = new Set([
                'active_exiting','active_ongoing','exited_unslashed',
                'pending_initialized','pending_queued','withdrawal_done','withdrawal_possible'
            ]);

            let states = cfg.states_track;

            if (states === null) {
                states = [null];
            } else if (typeof states === 'string') {
                const s = states.trim();
                if (s.toLowerCase() === 'null' || s === '') {
                    states = [null];
                } else if (s.startsWith('[') && s.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(s);
                        states = Array.isArray(parsed) ? parsed : [null];
                    } catch {
                        console.warn("⚠️  Failed to parse --states_track JSON; falling back to aggregated.");
                        states = [null];
                    }
                } else {
                    states = s.split(',').map(x => x.trim()).filter(Boolean);
                }
            } else if (!Array.isArray(states) || states.length === 0) {
                states = [null];
            }

            const out = [];
            const seen = new Set();
            for (let st of states) {
                if (st === null || String(st).toLowerCase() === 'null') {
                    if (!seen.has('aggregated')) { seen.add('aggregated'); out.push(null); }
                    continue;
                }
                st = String(st).toLowerCase();
                if (!VALID.has(st)) {
                    console.warn(`⚠️  Unknown state ignored: '${st}'`);
                    continue;
                }
                if (!seen.has(st)) { seen.add(st); out.push(st); }
            }

            if (out.length === 0) {
                console.warn('⚠️  No valid states provided; falling back to aggregated snapshot.');
                out.push(null);
            }

            cfg.states_track = out;
            console.log('├─ States to fetch:', out.map(s => s ?? 'aggregated').join(', '));
        })(this.config);

        if (!Array.isArray(this.config.states_track) || this.config.states_track.length === 0) {
            if (this.config.output.filesSegmentation) {
                this.config.output.filesSegmentation = false;
                console.warn("Files segmentation deactivated: no states to track defined – tracking all states with output in a single file");
            }
            // aggregated fetch
            this.config.states_track = [null];
        }

        this.balanceCache = new BalanceCache();
    }

    setupSignalHandlers() {
        process.on('SIGTERM', this.cleanUpAndExit.bind(this));
        process.on('SIGINT', this.cleanUpAndExit.bind(this));
    }

    async Process(){
        let filesUpdated = [];
        let catchedErrs = [];
        let validatorsCount = {};

        try {
            const epoch = Number((await getFinalityCheckpoint({ beaconBaseUrl: this.config.beaconBaseUrl }))?.data?.current_justified?.epoch);
            if (!Number.isFinite(epoch)) throw new Error('No epoch data');
            this.balanceCache.SetEpoch(epoch);

            for (const state of this.config.states_track) {
                if(this.config.output.filesSegmentation) this.balanceCache.ClearData();
                
                try {
                    // process snapshot
                    const snapshotData = await fetchValidatorsSnapshot({
                        beaconBaseUrl: this.config.beaconBaseUrl,
                        statuses: state,
                        verboseLog: true,
                    });

                    const arr = Array.isArray(snapshotData?.data) ? snapshotData.data : [];
                    const vc = arr.length;
                    for (let i = 0; i < vc; i++) {
                        const obj = arr[i];
                        const balance = (this.config.chain === "gnosis") ? (Number(obj.balance) / 32000000000) : (Number(obj.balance) / 1000000000);
                        this.balanceCache.ValidatorState(
                            this.config.output.filesSegmentation,
                            Number(obj.index),
                            obj.status,
                            balance
                        );
                    }
                    validatorsCount[(state ?? 'aggregated')] = vc;

                    if(this.config.output.keepInFile && this.config.output.filesSegmentation){
                        await SaveJson({
                            outPath: this.config.output.storageDirectory,
                            filename: `${this.config.chain}_${(state ?? 'aggregated')}.json`,
                            json: this.balanceCache,
                            atomic: true,
                            space: 0
                        }); // :contentReference[oaicite:13]{index=13}
                        console.log(`${this.config.output.storageDirectory}/${this.config.chain}_${(state ?? 'aggregated')}.json updated`);
                        
                        filesUpdated.push(`${this.config.chain}_${(state ?? 'aggregated')}.json`);
                    }
                    
                } catch (err) {
                    console.error(`Failed to fetch state '${state}':`, err);
                    catchedErrs.push(err);
                }

                // Rate-limit (delay between 2 requests)
                const delay = Number(this.config.requestDelayMs) || 0;
                if (delay > 0) await new Promise(r => setTimeout(r, delay));
            }

            if(this.config.output.keepInFile){
                await ensureDir(this.config.output.storageDirectory);
                if (!this.config.output.filesSegmentation) {
                    await SaveJson({
                        outPath: this.config.output.storageDirectory,
                        filename: `${this.config.chain}_states.json`,
                        json: this.balanceCache,
                        atomic: true,
                        space: 0
                    }); // :contentReference[oaicite:14]{index=14}
                    console.log(`${this.config.output.storageDirectory}/${this.config.chain}_states.json updated`);

                    filesUpdated.push(`${this.config.chain}_states.json`);
                }
            } else {
                console.log(this.balanceCache);
            }
        } catch (err) {
            console.error('Process failed:', err);
            catchedErrs.push(err);
        } finally {
            const base = {
                chain: this.config.chain,
                epoch: this.balanceCache?.epoch ?? null,
                statesProcessed: this.config.states_track.map(s => s ?? 'aggregated'),
                filesUpdated: filesUpdated.slice(),
                validatorsCount
            };
            const ok = (catchedErrs.length === 0);
            const out = ok ? { type: 'complete', ...base } : { type: 'error', ...base, errors: catchedErrs.map(e => String(e?.message || e)) };
            if (typeof process.send === 'function') process.send(out);
            await new Promise(res => process.stdout.write(`@@${ok?'COMPLETE':'ERROR'}@@ ` + JSON.stringify(out) + '\n', res));
            process.exit(ok ? 0 : 1);
        }
    }

    cleanUpAndExit() {
        process.exit(0);
    }
}

/** Run Util */
(async () => {
    const app = new MonitorValidators();
    try {
        app.config.chain = await RecognizeChain({ beaconBaseUrl: app.config.beaconBaseUrl });
        console.log("├─ Config loaded from arguments:", app.config);
        await app.Process();
    } catch (e) {
        console.error("Startup failed:", e);
    }
})();