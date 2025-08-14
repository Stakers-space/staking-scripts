// Version 1.0.1
/**
 * Added segmentation support
 */

const getValidatorsSnapshotUtil = require('/srv/stakersspace_utils/get-validators-snapshot.js');
//const getValidatorsSnapshotUtil = require('../../utils/get-validators-snapshot/get-validators-snapshot.js');
/* run on localhost through console
 * node validators_balance_collector.js --beaconChain.port 9596
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
        this.frequencySeconds = 3000;
        this.lastState = {
            keepInFile: true,
            storageDirectory: "/tmp/validator_state_balances",
            fileSegmentation: true
        }
    }

    LoadConfigFromArguments(){
        const args = process.argv.slice(2); // Cut first 2 arguments (node & script)        

        // Helper function to set any nested properties
        function setNestedProperty(obj, path, value) {
            const keys = path.split('.');
            let cur = obj;

            // auto type
            if (value === "true") value = true;
            else if (value === "false") value = false;
            else if (value === "null") value = null;
            else if (!Number.isNaN(Number(value)) && value.trim() !== "") value = Number(value);

            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in cur)) {
                    console.warn(`⚠️  Warning: '${k}' in path '${path}' does not exist in config – skipping.`);
                    return;
                }
                if (typeof cur[k] !== "object" || cur[k] === null) {
                    console.warn(`⚠️  Warning: '${k}' in path '${path}' is not an object – skipping.`);
                    return;
                }
                cur = cur[k];
            }
            const last = keys[keys.length - 1];
            if (!(last in cur)) {
                console.warn(`⚠️  Warning: '${last}' in path '${path}' does not exist in config – skipping.`);
                return;
            }
            cur[last] = value;
        }

        for (let i = 0; i < args.length; i++) {
            const token = args[i];
            if (!token.startsWith("--")) continue;

            let key, rawValue;

            if (token.includes("=")) { // `--key=value` format
                const [k, ...rest] = token.slice(2).split("=");
                key = k;
                rawValue = rest.join("=");
            } else { // `--key value` format
                key = token.slice(2);
                rawValue = args[i + 1];
                if (rawValue === undefined || rawValue.startsWith("--")) continue;
                i++; // value consumed, move next
            }

            setNestedProperty(this, key, rawValue);
            console.log(`├─ ${key} set to: ${rawValue} (from --${key})`);
        }

        console.log("└─ Validators state checker | Configuration loaded"/*, this*/);
    }
}

class BalanceCache {
    constructor(){
        this.epoch = null,
        this.data = {}
    }
    SetEpoch(epoch){
        this.epoch = epoch;
    }
    ValidatorState(segment, pubId, status, balance){
        if(segment){
            if(!this.data[status]) this.data[status] = {};
            this.data[status][pubId] = balance;
        } else {
            this.data[pubId] = [status, balance];
        }
    }
    Clear(){
        this.epoch = null;
        this.data = {};
    }
}

/** Util Processor */
class MonitorValidators {
    constructor(){
        this.setupSignalHandlers();

        this.config = new Config();
        this.config.LoadConfigFromArguments();
        this.isRunning = false;
        this.balanceCache = new BalanceCache();
    }

    setupSignalHandlers() {
        // Volání signal handlerů uvnitř metody
        process.on('SIGTERM', this.cleanUpAndExit.bind(this));
        process.on('SIGINT', this.cleanUpAndExit.bind(this));
    }

    ConfigurateCronWorker(){ 
        this.cron = setInterval(this.Process.bind(this), this.config.frequencySeconds * 1000); // update each 50 minutes
    }

    async Process(){
        if(this.isRunning) return console.log("Skipping (Previous instance is still active)");

        this.isRunning = true;
        try {
            const [epochRes, snapshotRes] = await Promise.allSettled([
                this.ProcessFinalityCheckpoint(),
                getValidatorsSnapshotUtil(this.config.beaconChain.port)
            ]);

            if (epochRes.status === 'rejected') throw epochRes.reason;
            if (snapshotRes.status === 'rejected') throw snapshotRes.reason;

            const epochData = epochRes.value;
            const snapshotData = snapshotRes.value;
            if (!epochData) throw new Error('No epoch data');

            this.balanceCache.Clear();
            this.balanceCache.SetEpoch(epochData.epoch);
            
            for (const obj of snapshotData.data) {
                const balance = (this.config.chain === "gnosis") ? (Number(obj.validator.effective_balance) / 32000000000) : (Number(obj.validator.effective_balance) / 1000000000);
                this.balanceCache.ValidatorState(
                    this.config.lastState.fileSegmentation,
                    Number(obj.index),
                    obj.status,
                    balance
                );
            }

            if(this.config.lastState.keepInFile){
                await fs.promises.mkdir(path.dirname(this.config.lastState.storageDirectory), { recursive: true });
                
                if(this.config.lastState.fileSegmentation){
                     // save separated files
                    for (const [state, validators] of Object.entries(this.balanceCache.data)) {
                        await fs.promises.writeFile(
                            `${this.config.lastState.storageDirectory}/${this.config.chain}_${state}.json`,
                            JSON.stringify({epoch:this.balanceCache.epoch,data:validators}, null, 0)
                        );
                        console.log(`${this.config.lastState.storageDirectory}/${this.config.chain}_${state}.json file has been updated`);
                    }
                } else {
                    await fs.promises.writeFile(
                        `${this.config.lastState.storageDirectory}/${this.config.chain}_states.json`,
                        JSON.stringify(this.balanceCache, null, 0)
                    );
                    console.log(`${this.config.lastState.storageDirectory}/${this.config.chain}_states.json file has been updated`);
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
                default: console.log("Chain not recognized | DEPOSIT_CONTRACT_ADDRESS:", resp.data["DEPOSIT_CONTRACT_ADDRESS"]);
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
app.RecognizeChain(function(err){
    if(err) return console.error(err);
    console.log("├─ Config loaded from arguments:", app.config);
    app.ConfigurateCronWorker();
    app.Process();
});