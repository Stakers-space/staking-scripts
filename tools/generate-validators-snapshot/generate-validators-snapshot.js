const VERSION = 1.3; // withdrawal wallets count
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
        this.withdrawal_credentials = new Set();
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
            epoch: {
                activation_eligibility: v.validator.activation_eligibility_epoch,
                activation: v.validator.activation_epoch,
                exit: v.validator.exit_epoch,
                withdrawable: v.validator.withdrawable_epoch
            }
        }
        if (includeBeaconStatus) vObj.status = v.status;
        this.validators.push(vObj);
        this.withdrawal_credentials.add(vObj.wc);

        if(stateSnap){
            if(!stateSnap[v.status]) stateSnap[v.status] = { validators: 0, balance: 0, eff_balance: 0 }
            stateSnap[v.status].validators += 1;
            stateSnap[v.status].balance += vObj.balance;
            //stateSnap[v.status].eff_balance += vObj.eff_balance;
        }
    };
    GetUniqueWithdrawalCredentialsCount(){
        return this.withdrawal_credentials ? this.withdrawal_credentials.size : 0;
    }
    DeleteCredentialsKey(){
        delete this.withdrawal_credentials;
    }
}

/** Util Processor */
class ProcessSnapshot {
    constructor(){
        this.setupSignalHandlers();

        this.config = new Config();
    }

    normalizeStates() {
        let states = this.config.states_track;
        if (states === null) {
            states = [null];
        } else if (typeof states === 'string') {
            if (states.toLowerCase() === 'null' || states === '') {
                states = [null];
            } else {
                states = states.split(',').map(x => x.trim()).filter(Boolean); 
            }
            
            const out = [];
            const seen = new Set();
            for (let st of states) {
                if (st !== null) st = String(st).toLowerCase();
                if (!seen.has(st)) { seen.add(st); out.push(st); }
            }
            if (out.length === 0) out.push(null);
            this.config.states_track = out;
        }
    }

    setupSignalHandlers() {
        process.on('SIGTERM', this.cleanUpAndExit.bind(this));
        process.on('SIGINT', this.cleanUpAndExit.bind(this));
    }

    async Process(){
        this.normalizeStates();
        
        console.log("├─{ Generate Validators Snapshot with config }:", this.config);

        let filesUpdated = [];
        let catchedErrs = [];
        let epoch = 0;
        this.state_snap = {};

        const balanceDivisor =  (this.config.chain === "gnosis") ? 32000000000 : 1000000000;

        try {
            epoch = Number((await getFinalityCheckpoint({ beaconBaseUrl: this.config.beaconBaseUrl }))?.data?.current_justified?.epoch);
            if (!Number.isFinite(epoch)) throw new Error('No epoch data');
            
            for (const state of this.config.states_track) { 
                
                const stateStr = state ?? 'aggregated';
                
                this.dataFactory = new DataFactory(); // new dataFactory for each state? - is ok, as each state is saved separately
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
                    for (const val of arr) { 
                        this.dataFactory.AddValidator(val, (state === null), balanceDivisor, this.state_snap);
                    }

                    if(this.state_snap[stateStr]) this.state_snap[stateStr].wallets = this.dataFactory.GetUniqueWithdrawalCredentialsCount();
                    this.dataFactory.DeleteCredentialsKey();

                    if(this.config.output.keepInFile){
                        await ensureDir(this.config.output.storageDirectory);
                        await SaveJson({
                            outPath: this.config.output.storageDirectory,
                            filename: `${this.config.chain}_${stateStr}.json`,
                            json: this.dataFactory,
                            atomic: true,
                            space: 0
                        }); // :contentReference[oaicite:13]{index=13}
                        console.log(`${this.config.output.storageDirectory}/${this.config.chain}_${stateStr}.json updated`);
                        
                        filesUpdated.push(`${this.config.chain}_${stateStr}.json`);
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
    if (Array.isArray(args.states_track) || typeof args.states_track === 'string') app.config.states_track = args.states_track;
    
    if (typeof args.requestDelayMs === 'number') app.config.requestDelayMs = args.requestDelayMs;
    if (args.output && typeof args.output === 'object') {
        app.config.output = { ...app.config.output, ...args.output };
    }

    app.config.chain = await RecognizeChain({ beaconBaseUrl: app.config.beaconBaseUrl });
    
    return await app.Process();
}

// --- CLI mode ---
if (require.main === module) {
    (async () => {
        try {
            const app = new ProcessSnapshot();
            loadFromArgumentsUtil(app.config);
            app.config.chain = await RecognizeChain({ beaconBaseUrl: app.config.beaconBaseUrl });

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