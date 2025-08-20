// Version 1.0.2
/**
 * Refactored segmentation (full snapshots a are too heavy for Ethereum Lodestar)
 */
const getValidatorsSnapshotUtil = require('/srv/stakersspace_utils/get-validators-snapshot.js');
//const getValidatorsSnapshotUtil = require('../../utils/get-validators-snapshot/get-validators-snapshot.js');
const loadFromArgumentsUtil = require('/srv/stakersspace_utils/load-from-process-arguments.js');
//const getValidatorsSnapshotUtil = require('../../utils/load-from-process-arguments/load-from-process-arguments.js');

/* run on localhost through console
 * node validators_balance_collector.js --beaconChain.port 9596 --output.keepInFile false
*/
const http = require('http');
const fs = require("fs");
var app = null;

class Config {
    constructor(){
        this.chain = null;
        this.beaconChain = {
            port: 9596
        },
        this.states_track = ['active_exiting', 'active_ongoing', 'exited_unslashed', 'pending_initialized', 'pending_queued', 'withdrawal_done', 'withdrawal_possible'];
        this.frequencySeconds = 3000;
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

        this.isRunning = false;
        this.balanceCache = new BalanceCache();
    }

    setupSignalHandlers() {
        process.on('SIGTERM', this.cleanUpAndExit.bind(this));
        process.on('SIGINT', this.cleanUpAndExit.bind(this));
    }

    ConfigurateCronWorker(){ 
        this.cron = setInterval(this.Process.bind(this), this.config.frequencySeconds * 1000); // update each 50 minutes
    }

    async PrepareOutputDirectory(){
        if (!this.config.output.keepInFile) return;
        await fs.promises.mkdir(this.config.output.storageDirectory, { recursive: true });
    }

    async Process(){
        if(this.isRunning) return console.log("Skipping (Previous instance is still active)");
        this.isRunning = true;

        this.balanceCache.ClearData(); // Clear

        try {
            const { epoch } = await this.ProcessFinalityCheckpoint(); // epoch tracking start
            if (epoch == null) throw new Error('No epoch data');
            this.balanceCache.SetEpoch(epoch);

            for (const state of this.config.states_track) {
                if(this.config.output.filesSegmentation) this.balanceCache.ClearData();
                
                try {
                    // process snapshot
                    const snapshotData = await getValidatorsSnapshotUtil( this.config.beaconChain.port, null, state );
                    for (const obj of snapshotData.data) {
                        const balance = (this.config.chain === "gnosis") ? (Number(obj.validator.effective_balance) / 32000000000) : (Number(obj.validator.effective_balance) / 1000000000);
                        this.balanceCache.ValidatorState(
                            this.config.output.filesSegmentation,
                            Number(obj.index),
                            obj.status,
                            balance
                        );
                    }

                    if(this.config.output.keepInFile && this.config.output.filesSegmentation){
                        await fs.promises.writeFile( `${this.config.output.storageDirectory}/${this.config.chain}_${state}.json`, JSON.stringify(this.balanceCache, null, 0) );
                        console.log(`${this.config.output.storageDirectory}/${this.config.chain}_${state}.json file has been updated`);
                    }
                    
                } catch (err) {
                    console.error(`Failed to fetch state '${state}':`, err);
                }

                // Rate-limit (delay between 2 requests)
                const delay = Number(this.config.requestDelayMs) || 0;
                if (delay > 0) await new Promise(r => setTimeout(r, delay));
                
            }

            if(this.config.output.keepInFile){
                if (!this.config.output.filesSegmentation) {
                    await fs.promises.writeFile( `${this.config.output.storageDirectory}/${this.config.chain}_states.json`,JSON.stringify(this.balanceCache, null, 0));
                    console.log(`${this.config.output.storageDirectory}/${this.config.chain}_states.json file has been updated`);
                    }
            } else {
                console.log(this.balanceCache);
            }
        } catch (err) {
            console.error('Process failed:', err);
        } finally {
            this.isRunning = false;
        }
    }

    ProcessFinalityCheckpoint(){
        return new Promise((resolve, reject) => {
            this.GetFinalityCheckpoint((err, resp) => {
                if (err) return reject(err);
                try {
                    const json = JSON.parse(resp);
                    resolve({ epoch: Number(json.data.current_justified.epoch) });
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    RecognizeChain(cb){
        const options = {
            hostname: 'localhost',
            port: app.config.beaconChain.port,
            path: `/eth/v1/config/spec`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        this.HttpRequest(options, null, (err,resp) => {
            if(err) {
                console.error("OnRecognizeChain:", err);
                return cb(err); 
            }
            try {  resp = JSON.parse(resp); } catch(e){ return cb(e); }
            
            let chainName = null;
            switch(resp.data["DEPOSIT_CONTRACT_ADDRESS"].toLowerCase()){
                case "0x00000000219ab540356cbb839cbe05303d7705fa": chainName = "ethereum"; break;
                case "0x0b98057ea310f4d31f2a452b414647007d1645d9": chainName = "gnosis"; break;
                default: 
                    console.log("Chain not recognized | DEPOSIT_CONTRACT_ADDRESS:", resp.data["DEPOSIT_CONTRACT_ADDRESS"]);
                    chainName = "unknown";
            }
            app.config.chain = chainName;
            console.log("├─ Recognized chain:", chainName);
            return cb();
        });
    }

    HttpRequest(options, body, cb){
        const req = http.request(options, (res) => {
            let response = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => { 
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return cb(new Error(`HTTP ${res.statusCode}: ${response.slice(0,200)}`));
                }
                cb(null, response)
            });     
        }).on('error', (err) => {
            cb(err);
        });
        //req.setTimeout(60000, () => req.destroy(new Error('Request timeout')));
        if(body) req.write(body);
        req.end();
    }

    GetFinalityCheckpoint(cb){
        const options = {
            hostname: 'localhost',
            port: app.config.beaconChain.port,
            path: `/eth/v1/beacon/states/head/finality_checkpoints`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        this.HttpRequest(options, null, cb);
    }

    cleanUpAndExit() {
        console.log("exiting");
        try {
            clearInterval(this.cron);
        } catch (e) {
            console.log(e);
        }
        process.exit(0);
    }
}

/** Run Util */
app = new MonitorValidators();
app.RecognizeChain(async(err) => {
    if(err) return console.error(err);
    console.log("├─ Config loaded from arguments:", app.config);
    try {
        await app.PrepareOutputDirectory();
        app.ConfigurateCronWorker();
        await app.Process();
    } catch (e) {
        console.error("Startup failed:", e);
    }
});