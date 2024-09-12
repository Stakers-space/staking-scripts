// Version 1.0.40t (For testing)

/* run on localhost through console
 * node validators_state_checker.js --port 9596 --epochsoffline_trigger 4 --pubkeys ./public_keys_testlist.json
*/

class Config {
    constructor(){
        this.account_id = null;
        this.api_token = null;
        this.pubKeysListPath = "./public_keys_testlist.json"; // service parameter, same as accout id and api_token
        this.pubKeysList_dynamic = false; // reload file data for each epoch?
        this.beaconChainPort = 9596;
        this.trigger_numberOfPeriodesOffline = 4;
        this.indexesBanch = 200;
        this.postData = {
            server:{
                hostname: 'stakersspace.azurewebsites.net',
                path: '/api/validator-state',
                port: 443
            },
            encryption: {
                active: true,
                key: "(Bh6HN.Oj{r?OO~pE;ot1rKjcS_Ic9yp", // 32-long string
                iv: "ZQMiwj5c9qc<er,l" // 16-long string
            }
        };
        this.detailedLog = false;
    }
    SetPubKeyList(){
        this.pubKeysList = require(this.pubKeysListPath);
    }
}
const config = new Config();
config.SetPubKeyList();

const crypto = require('crypto');
const http = require('http');
const https = require('https');
const fs = require("fs");
const path = require("path");

var app = null;

class InstanceDataModel {
    constructor(){
        this.ids_list = [];
        this.aggregatedStates = {};
    }

    IncreaseggregatedState(instanceId){
        this.aggregatedStates[instanceId].c++;
    }
    AddOfflineValidator(instanceId, stateCacheValue){
        this.aggregatedStates[instanceId].o.push(stateCacheValue);
    }
    GeneratePubkeysArr(pubKeysListContent){
        for (const [instanceId, instanceData] of Object.entries(pubKeysListContent)) {
            this.ids_list.push(instanceId);
        }
    }
    ResetStates(){
        for (const instanceId of Object.keys(this)) {
            this.aggregatedStates[instanceId] = {
                c: 0, // number of checked validators
                o: [] // array of offline indexes of type StateCache extended for pubId
            };
        }
    }
}

class StateCache {
    constructor(){}
    OfflineValidator(pubId, epoch){
        if(this[pubId]){
            this[pubId].d++;
            if (config.detailedLog) console.log(`validator ${pubId} status reported as offline for ${this[pubId].d++} periodes now`);
        } else {
            if (config.detailedLog) console.log(`validator ${pubId} status reported as offline`);
            this[pubId] = {
                i: pubId,
                e: epoch,
                d: 1
            }
        }
        return this[pubId].d;
    }
    OnlineValidator(pubId){
        if(this[pubId]) {
            delete this[pubId];
            if (config.detailedLog) console.log(`validator ${pubId} status reported back as online`);
        }
    }
}

class PostObjectDataModel {
    constructor(epochNumber){
        this.t = config.api_token;
        this.e = epochNumber; // epoch
        this.i = {};
    }
    AddInstance(instanceId, instanceValidators, offlineValidators){
        this.i[instanceId] = {
            v:instanceValidators,
            o:offlineValidators
        }
    }
}

class MonitorValidators {
    constructor(){
        this.isRunning = false;

        this.offlineTracker_periodesCache = new StateCache();
        this._lastEpochChecked = 0;

        // use pubkeys and port from attribute, if attached
        const args = process.argv.slice(2); // Cut first 2 arguments (node & script)

        const accountIdArgIndex = args.indexOf('--account_id');
        if (accountIdArgIndex !== -1 && accountIdArgIndex + 1 < args.length) {
            config.account_id = args[accountIdArgIndex + 1];
            console.log(`├─ AccountId: ${config.account_id} from attached param`);
        }
        const tokenApiArgIndex = args.indexOf('--token_api');
        if (tokenApiArgIndex !== -1 && tokenApiArgIndex + 1 < args.length) {
            config.api_token = args[tokenApiArgIndex + 1];
            console.log(`├─ ApiToken: ${config.api_token} from attached param`);
        }
        const pubkeysArgIndex = args.indexOf('--pubkeys');
        if (pubkeysArgIndex !== -1 && pubkeysArgIndex + 1 < args.length) {
            const pubkeysPath = args[pubkeysArgIndex + 1];
            config.pubKeysListPath = pubkeysPath;
            config.pubKeysList = require(config.pubKeysListPath);
            console.log(`├─ Pubkeys file set to: ${pubkeysPath} from attached param`);
        }
        const beaconChainPort_param = args.indexOf('--port');
        if (beaconChainPort_param !== -1 && beaconChainPort_param + 1 < args.length) {
            const beaconchainPort = args[beaconChainPort_param + 1];
            config.beaconChainPort = beaconchainPort;
            console.log(`├─ BeaconChain port set to: ${beaconchainPort} from attached param`);
        }
        const epochs_param = args.indexOf('--epochsoffline_trigger');
        if (epochs_param !== -1 && epochs_param + 1 < args.length) {
            const epochsOfflineTrigger = args[epochs_param + 1];
            config.trigger_numberOfPeriodesOffline = epochsOfflineTrigger;
            console.log(`├─ Trigger_numberOfPeriodesOffline set to: ${epochsOfflineTrigger} from attached param`);
        }
        const pubkeys_dynamic_param = args.indexOf('--pubkeys_dynamic');
        if (pubkeys_dynamic_param !== -1 && pubkeys_dynamic_param + 1 < args.length) {
            const pubkeys_dynamic = args[pubkeys_dynamic_param + 1];
            config.pubKeysList_dynamic = (pubkeys_dynamic === "true") ? true : false;
            console.log(`└─ PubKeysList_dynamic set to: ${config.pubKeysList_dynamic.toString()} from attached param`);
        }

        this.instances = new InstanceDataModel();
        this.instances.GeneratePubkeysArr(config.pubKeysList);
    }

    CronWorker(){ this.cron = setInterval(app.Process, 45000); }

    Process(){
        if(!app.isRunning){
            app.GetFinalityCheckpoint(function(err,resp){
                if(err) {
                    console.log("GetFinalityCheckpoint err:", err);
                    return null;
                }
                try { 
                    resp = JSON.parse(resp); 
                } catch(e){ 
                    console.log("GetFinalityCheckpoint parsing err:", e);
                    return null;
                }
                const epoch = Number(resp["data"]["current_justified"].epoch);
                if(epoch && epoch !== app._lastEpochChecked) {
                    app.PromptManagerScript(epoch);
                    app._lastEpochChecked = epoch;
                }
            }); 
        }
    }

    PromptManagerScript(epochNumber){
        app.isRunning = true;
        app.startTime = new Date().getTime();
        console.log(`${this.startTime} Monitorig validators state for epoch ${epochNumber}`);

        // reload pubkeys file
        if(config.pubKeysList_dynamic) {
            config.pubKeysList = app.LoadPubKeysListSync();
            app.instances.GeneratePubkeysArr(config.pubKeysList);
        }
        
        // define aggregation file
        app.instances.ResetStates();

        // Process Check
        app.ProcessCheck(0,0, epochNumber, function(err){
            if(err) {
               console.error("ProcessCheck err:",err); 
               return;
            }
            const now = new Date().getTime();
            const totalProcessingTime = now - app.startTime;

            // generate post object
            var postObj = new PostObjectDataModel(epochNumber);
            
            let online = 0,
                total = 0,
                offline = [];
            
            for (const [instanceId, report] of Object.entries(app.instances.aggregatedStates)) {
                
                const offlineValidators = report.o.length,
                      onlineValidators = report.c - offlineValidators;
    
                // Add instance into report
                if(offlineValidators > 0) postObj.AddInstance(instanceId, report.c, report.o);
                console.log(`|  ├─ ${instanceId} | online ${onlineValidators}/${report.c} | offline (${offlineValidators}): ${report.o}`);
                // account aggregation
                total += report.c;
                online += onlineValidators;
                if(report.o.length > 0) offline.push(...report.o);
            }
            console.log(`|  └─ Sumarization: online ${online}/${total} | offline (${offline.length}): ${offline.toString()}`);

            if (config.detailedLog) console.log('├─ OfflineTracker_periodesCache:', app.offlineTracker_periodesCache);
            
            console.log("├─", postObj);

            postObj = JSON.stringify(postObj);
            if(config.postData.encryption.active) {
                postObj = app.ExtraEncryption(postObj);
                console.log("├─ Data encrypted to", postObj);
            }

            app.HttpsRequest({
                hostname: config.postData.server.hostname,
                path: config.postData.server.path/* + "?a="+config.account_id*/,
                port: config.postData.server.port,
                method: 'POST',
                headers: {
                    'Content-Type': (config.postData.encryption.active) ? 'text/plain' : 'application/json',
                    'Content-Length': postObj.length
                }
            }, postObj, function(err, res){
                if(err) console.log(err);
                console.log(`└── ${now} MonitorValidators | completed in ${totalProcessingTime}ms`, res);
                app.isRunning = false;
            });
        });
    }

    ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb){
        const instanceIdentificator = app.instances.ids_list[instanceIndex];
        const instanceData = config.pubKeysList[instanceIdentificator]; // from file
        const instancePubKeys = instanceData.v;

        const indexesNumToRequest = (pubKeyStartIndex + config.indexesBanch <= instanceData.c) ? ((config.indexesBanch <= instanceData.c) ? config.indexesBanch : instanceData.c) : (instanceData.c - pubKeyStartIndex);
        const endIndex = pubKeyStartIndex + indexesNumToRequest;
        const validatorIndexes = instancePubKeys.slice(pubKeyStartIndex, endIndex);

        if(config.detailedLog) console.log("ProcessCheck", instanceIndex, pubKeyStartIndex, validatorIndexes);

        // Get data from beacon api
        this.GetValidatorLivenessState(validatorIndexes, epochNumber, function(err,resp){
            // parse data
            try { resp = JSON.parse(resp); } catch(e){ err = e; }
             
            if(resp.data) {
               resp = resp.data; 
            } else if(resp.statusCode){
                err = resp;
            }

            if(err) return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
            
            // processResponse aggregation
            // iterate over val indices
            const valIndexesL = resp.length;
            for(var i=0;i<valIndexesL;i++){
                app.instances.IncreaseggregatedState(instanceIdentificator);
                                
                const validatorPubId = resp[i].index;
                if(!resp[i].is_live) {
                    if(app.offlineTracker_periodesCache.OfflineValidator(validatorPubId,epochNumber) >= config.trigger_numberOfPeriodesOffline) {
                        /**
                         * Increase the number of offline periodes in the row
                         * If higher than defined threshold, push val index on the list of offline validators
                        */ 
                        app.instances.AddOfflineValidator(instanceIdentificator, app.offlineTracker_periodesCache[validatorPubId]);
                    }
                } else {
                    app.offlineTracker_periodesCache.OnlineValidator(validatorPubId);
                }
            }

            pubKeyStartIndex += config.indexesBanch;
            //if(config.detailedLog) console.log(`pubKeyStartIndex increased to ${pubKeyStartIndex} | endIndex === instanceData.c || ${endIndex} === ${instanceData.c} =>`, (endIndex === instanceData.c));
            if(endIndex === instanceData.c) {
                 instanceIndex++
                 pubKeyStartIndex = 0;
                 //console.log(`instanceIndex increased to ${instanceIndex} | pubKeyStartIndex reseted to ${pubKeyStartIndex}`);
            }

            if(instanceIndex === app.instances.ids_list.length) return cb();
            app.ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb);
        });
    }

    HttpRequest(options, body, cb){
        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => { return cb(null, response); });     
        }).on('error', (err) => {
            cb(err);
        });
        if(body) req.write(body);
        req.end();
    }

    HttpsRequest(options, body, cb){
        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => { return cb(null, response); });     
        }).on('error', (err) => {
            cb(err);
        });
        if(body) req.write(body);
        req.end();
    }

    GetFinalityCheckpoint(cb){
        const options = {
            hostname: 'localhost',
            port: config.beaconChainPort,
            path: `/eth/v1/beacon/states/head/finality_checkpoints`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        this.HttpRequest(options, null, cb);
    }

    GetValidatorLivenessState(validatorIndexes, epochNumber, cb) {
        const body = JSON.stringify(validatorIndexes);
        const options = {
            hostname: 'localhost',
            port: config.beaconChainPort,
            path: `/eth/v1/validator/liveness/${epochNumber}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };
        this.HttpRequest(options, body, cb);
    }

    ExtraEncryption(strData){
        var cipher = crypto.createCipheriv('aes-256-cbc', config.postData.encryption.key, config.postData.encryption.iv),
        crypted = cipher.update(strData, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    }

    DataDecryption(encData){
        var decipher = crypto.createDecipheriv('aes-256-cbc', config.postData.encryption.key, config.postData.encryption.iv),
        decrypted = decipher.update(encData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    LoadPubKeysListSync() {
        const filePath = path.join(__dirname, config.pubKeysListPath);
        try {
            const data = fs.readFileSync(filePath, "utf8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error reading file:", error);
            return null;
        }
    }

    Exit(){
        clearInterval(cronInterval);
    }
}

// each 60 seconds = 1 epoch
app = new MonitorValidators();
app.CronWorker();
app.Process();
//console.log(JSON.parse(new MonitorValidators().DataDecryption(new MonitorValidators().ExtraEncryption(JSON.stringify({"i1":[1,2,3,4,5],"i6":[7,8,9,10]})))));

function cleanUpAndExit() {
    console.log("exiting");
    // exit services
    process.exit(0);
}
process.on('SIGTERM', cleanUpAndExit);
process.on('SIGINT', cleanUpAndExit);