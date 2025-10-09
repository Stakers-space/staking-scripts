
/**
 * Refactored segmentation (full snapshots a are too heavy for Ethereum Lodestar)
 */
const VERSION = 1.1;
const requireLib = function(relOrAbsPath, fallback_HomeDirPath) { const fs = require('fs'), os = require('os'), path = require('path');
    const p = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.resolve(__dirname, relOrAbsPath);
    if (fs.existsSync(p)) return require(p);
    const fallback_AbsPath = path.join(os.homedir(), fallback_HomeDirPath);
    if(fs.existsSync(fallback_AbsPath)) return require(fallback_AbsPath);
    throw new Error(`Module not found at ${p} neither ${fallback_HomeDirPath}`);
}

const { fetchValidatorsSnapshot, RecognizeChain, getFinalityCheckpoint } = requireLib('/srv/stakersspace_utils/libs/beacon-api.js','staking-scripts/libs/beacon-api/beacon-api.js');
const loadFromArgumentsUtil = requireLib('/srv/stakersspace_utils/libs/load-from-process-arguments.js', 'staking-scripts/libs/load-from-process-arguments/load-from-process-arguments.js');
const { ensureDir, SaveJson } = requireLib('/srv/stakersspace_utils/libs/filesystem-api.js', 'staking-scripts/libs/filesystem-api/filesystem-api.js');

/* run on localhost through console
 * node validators_balance_collector.js --beaconBaseUrl http://localhost:9596 --output.keepInFile false
*/
class Config {
    constructor(){
        this.chain = null;
        this.beaconBaseUrl = 'http://localhost:9596';
        this.states_track = ['active_exiting', 'active_ongoing', 'exited_unslashed', 'pending_initialized', 'pending_queued', 'withdrawal_done', 'withdrawal_possible'];
        this.requestDelayMs = 2000;
        this.output = {
            keepInFile: true,
            storageDirectory: "/tmp/validator_state_balances_v2"
        }
    }
}

class DataFactory {
    constructor(){
        this.timestamp = null;
        this.epoch = null;
        this.status = null;
        this.execution_optimistic = false;
        this.validators = [];
    }
    SetEpoch(epoch){ this.epoch = epoch; }
    SetTimestamp() { this.timestamp = Date.now(); }
    SetStatus(status) {this.status = status };
    AddValidator(v, includeBeaconStatus, balanceDivisor = 1, stateSnap = null) {
        const vObj = {
            index: Number(v.index),
            pubkey: v.validator.pubkey,
            balance:  (Number(v.balance) / balanceDivisor),
            eff_balance: (Number(v.validator.effective_balance) / balanceDivisor),
            wc: v.validator.withdrawal_credentials,
            slashed: Boolean(v.validator.slashed),
            e: {
                activation_eligibility: v.validator.activation_eligibility_epoch,
                activation: v.validator.activation_epoch,
                exit: v.validator.exit_epoch,
                withdrawable: v.validator.withdrawable_epoch
            }
        }
        if (includeBeaconStatus) vObj.status = v.status;
        this.validators.push(vObj);

        if(stateSnap){
            if(!stateSnap[v.status]) stateSnap[v.status] = { validators: 0, balance: 0, eff_balance: 0 }
            stateSnap[v.status].validators += 1;
            stateSnap[v.status].balance += vObj.balance;
            stateSnap[v.status].eff_balance += vObj.eff_balance;
        }
    };
}

/** Util Processor */
class ProcessSnapshot {
    constructor(){
        this.setupSignalHandlers();

        this.config = new Config();
        
        (function normalizeStates(cfg) {
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
                if(st !== null) st = String(st).toLowerCase();
                if (!seen.has(st)) { seen.add(st); out.push(st); }
            }

            if (out.length === 0) {
                console.warn('⚠️  No valid states provided; falling back to aggregated snapshot.');
                out.push(null);
            }

            cfg.states_track = out;
            console.log('├─ States to fetch:', out.map(s => s ?? 'aggregated').join(', '));
        })(this.config);
    }

    setupSignalHandlers() {
        process.on('SIGTERM', this.cleanUpAndExit.bind(this));
        process.on('SIGINT', this.cleanUpAndExit.bind(this));
    }

    async Process(){
        let filesUpdated = [];
        let catchedErrs = [];
        let epoch = 0;
        this.state_snap = {};

        const balanceDivisor =  (this.config.chain === "gnosis") ? 32000000000 : 1000000000;

        try {
            epoch = Number((await getFinalityCheckpoint({ beaconBaseUrl: this.config.beaconBaseUrl }))?.data?.current_justified?.epoch);
            if (!Number.isFinite(epoch)) throw new Error('No epoch data');
            
            if(typeof this.config.states_track === "string") this.config.states_track = this.config.states_track.split(',').map(x => x.trim()).filter(Boolean); 

            for (const state of this.config.states_track) { 
                this.dataFactory = new DataFactory();
                this.dataFactory.SetEpoch(epoch);
                this.dataFactory.SetTimestamp();
                this.dataFactory.SetStatus(state);

                try {
                    const snapshotData = await fetchValidatorsSnapshot({
                        beaconBaseUrl: this.config.beaconBaseUrl,
                        status_filter: state,
                        verboseLog: true,
                    });

                    const arr = Array.isArray(snapshotData?.data) ? snapshotData.data : [];
                    for (const val of arr) { this.dataFactory.AddValidator(val, (state === null), balanceDivisor, this.state_snap); }

                    if(this.config.output.keepInFile){
                        await ensureDir(this.config.output.storageDirectory);
                        await SaveJson({
                            outPath: this.config.output.storageDirectory,
                            filename: `${this.config.chain}_${(state ?? 'aggregated')}.json`,
                            json: this.dataFactory,
                            atomic: true,
                            space: 0
                        }); // :contentReference[oaicite:13]{index=13}
                        console.log(`${this.config.output.storageDirectory}/${this.config.chain}_${(state ?? 'aggregated')}.json updated`);
                        
                        filesUpdated.push(`${this.config.chain}_${(state ?? 'aggregated')}.json`);
                    } else {
                        console.log(this.dataFactory);
                    }
                } catch (err) {
                    console.error(`Failed to fetch state '${state}':`, err);
                    catchedErrs.push(err);
                }

                // Rate-limit (delay between 2 requests)
                const delay = Number(this.config.requestDelayMs) || 0;
                if (delay > 0) await new Promise(r => setTimeout(r, delay));
            }
        } catch (err) {
            console.error('Process failed:', err);
            catchedErrs.push(err);
        } finally {
            const base = {
                chain: this.config.chain,
                epoch,
                statesProcessed: this.config.states_track.map(s => s ?? 'aggregated'),
                filesUpdated: filesUpdated.slice(),
                state_snap: this.state_snap
            };
            const ok = (catchedErrs.length === 0);
            const out = ok ? { type: 'complete', ...base } : { type: 'error', ...base, errors: catchedErrs.map(e => String(e?.message || e)) };
            return out;
        }
    }

    cleanUpAndExit() {
        process.exit(0);
    }
}

async function runGenerateValidatorsSnapshot(args = {}) {
    const app = new ProcessSnapshot();

    if (args.beaconBaseUrl) app.config.beaconBaseUrl = args.beaconBaseUrl;
    if (Array.isArray(args.states_track) || typeof args.states_track === 'string' || args.states_track === null) {
        app.config.states_track = args.states_track;
    }
    if (typeof args.requestDelayMs === 'number') app.config.requestDelayMs = args.requestDelayMs;
    if (args.output && typeof args.output === 'object') {
        app.config.output = { ...app.config.output, ...args.output };
    }

    if (!app.config.chain) app.config.chain = await RecognizeChain({ beaconBaseUrl: app.config.beaconBaseUrl });
    
    return await app.Process();
}

// --- CLI mode ---
if (require.main === module) {
    (async () => {
        try {
            const app = new ProcessSnapshot();
            loadFromArgumentsUtil(app.config);
            app.config.chain = await RecognizeChain({ beaconBaseUrl: app.config.beaconBaseUrl });
            console.log("├─ Config loaded from arguments:", app.config);

            const out = await app.Process();
            if (typeof process.send === 'function') process.send(out);
            const tag = out.type === 'complete' ? 'COMPLETE' : 'ERROR';
            await new Promise(res => process.stdout.write(`@@${tag}@@ ` + JSON.stringify(out) + '\n', res));
            process.exit(out.type === 'complete' ? 0 : 1);
        } catch (e) {
            const errOut = { type: 'error', errors: [String(e?.message || e)] };
            if (typeof process.send === 'function') process.send(errOut);
            await new Promise(res => process.stdout.write('@@ERROR@@ ' + JSON.stringify(errOut) + '\n', res));
            process.exit(1);
        }
    })();
} else {
    module.exports = { VERSION, runGenerateValidatorsSnapshot };
}