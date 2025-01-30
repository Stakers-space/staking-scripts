// Version 1.0.47

/* run on localhost through console
 * node validators_state_checker.js --port 9596 --epochsoffline_trigger 4 --pubkeys ./public_keys_testlist.json --pubkeys_dynamic false --post true --encryption true --token_api 1234567890 --server_id 0
*/
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const fs = require("fs");
const path = require("path");
var app = null;

class Config {
    constructor(){
        this.chain = null;
        //this.account_id = null;
        this.server_id = null;
        this.api_token = null;
        this.pubKeysListPath = "./public_keys_testlist.json"; // service parameter, same as accout id and api_token
        this.pubKeysList_dynamic = false; // reload file data for each epoch?
        this.beaconChainPort = 9596;
        this.trigger_numberOfPeriodesOffline = 4;
        this.indexesBanch = 200;
        this.postData = {
            enabled: false,
            server:{
                hostname: 'stakers.space',
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

    LoadConfigFromArguments(){
        const args = process.argv.slice(2); // Cut first 2 arguments (node & script)
        // --port 9596 --epochsoffline_trigger 4 --pubkeys ./public_keys_testlist.json --pubkeys_dynamic false --post true --encryption true --token_api 1234567890 --server_id 1
        const params = [
            /* account_id */
            {"--port": "beaconChainPort"},
            {"--epochsoffline_trigger": "trigger_numberOfPeriodesOffline"},
            {"--pubkeys": "pubKeysListPath"},
            {"--pubkeys_dynamic": "pubKeysList_dynamic"},
            {"--post": "postData.enabled"},
            {"--encryption": "postData.encryption.active"},
            {"--token_api": "api_token"},
            {"--server_id": "server_id"}
        ];

        for (const param of params) {
            for (const [key, value] of Object.entries(param)) {
                const paramIndex = args.indexOf(key);
                if (paramIndex !== -1 && paramIndex + 1 < args.length) {
                    const paramValue = args[paramIndex + 1];
                    setNestedProperty(this, value, paramValue);
                    console.log(`├─ ${value} set to: ${paramValue} from attached param`);
                }
            }
        }

        // Helper function to set nested properties
        function setNestedProperty(obj, path, value) {
            const keys = path.split('.');
            let current = obj;

            if (value === "true") value = true;
            else if (value === "false") value = false;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in current)) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        }
    }
}

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
        this.ids_list = [];
        for (const instanceId of Object.keys(pubKeysListContent)) {
            this.ids_list.push(instanceId);
        }
    }
    ResetStates(){
        for (const instanceId of this.ids_list) {
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
            if (app.config.detailedLog) console.log(`validator ${pubId} status reported as offline for ${this[pubId].d++} periodes now`);
        } else {
            if (app.config.detailedLog) console.log(`validator ${pubId} status reported as offline`);
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
            if (app.config.detailedLog) console.log(`validator ${pubId} status reported back as online`);
        }
    }
}

class PostObjectDataModel {
    constructor(epochNumber){
        this.e = epochNumber; // epoch
        this.i = {};
    }
    AddInstance(instanceId, instanceValidators, offlineValidators, exitedValidators, pendingValidators){
        this.i[instanceId] = {
            v:instanceValidators,
            o:offlineValidators
        }
        if(exitedValidators > 0) this.i[instanceId].e = exitedValidators;
        if(pendingValidators > 0) this.i[instanceId].p = pendingValidators;
    }
}

class MonitorValidators {
    constructor(){
        this.setupSignalHandlers();

        this.config = new Config();
        this.config.LoadConfigFromArguments();
        this.config.SetPubKeyList();

        this.isRunning = false;

        this.offlineTracker_periodesCache = new StateCache();
        this._lastEpochChecked = 0;

        this.instances = new InstanceDataModel();
        this.instances.GeneratePubkeysArr(this.config.pubKeysList);
    }

    setupSignalHandlers() {
        // Volání signal handlerů uvnitř metody
        process.on('SIGTERM', this.cleanUpAndExit.bind(this));
        process.on('SIGINT', this.cleanUpAndExit.bind(this));
    }

    CronWorker(){ 
        let cronInterval = 45000;
        switch(app.config.chain){
            case "gnosis": cronInterval = 45000; break;
            case "ethereum": cronInterval = 300000; break;
            default: console.log("CronWorker interval not defined for chain:", app.config.chain);
        }
        app.cron = setInterval(app.Process, cronInterval); 
    }

    Process(){
        if(app.instances.ids_list.length === 0) return console.log(app.config.chain, "| No instances to process");
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
        if(app.config.pubKeysList_dynamic) {
            app.config.pubKeysList = app.LoadPubKeysListSync();
            app.instances.GeneratePubkeysArr(app.config.pubKeysList);
        }
        
        // define aggregation file
        app.instances.ResetStates();

        // Process Check
        app.ProcessCheck(0,0, epochNumber, function(err){
            if(err) return console.error("ProcessCheck err:",err); ;
            
            const now = new Date().getTime();
            const totalProcessingTime = now - app.startTime;

            // generate post object
            var postObj = new PostObjectDataModel(epochNumber);

            let promises = [];
            
            let online = 0, total = 0,
                offline = [], exited = [], pending = [], withdrawal = [];
            
            for (const [instanceId, report] of Object.entries(app.instances.aggregatedStates)) {
                total += report.c; // total nuber of keys
                
                let promise = new Promise((resolve, reject) => {
                    // check only pubids detected as offline (report.o)

                    let oIds = [];
                    for(const offObj of report.o){ oIds.push(offObj.i) }

                    app.GetValidatorsState(oIds, function(err, data) {
                        if (err) return reject({"iid": instanceId, "message": err});
                        if(data.code === 500) {
                            console.error({"iid": instanceId, "message 500": data.message});
                            return resolve();
                        }

                        // validator status list: https://hackmd.io/ofFJ5gOmQpu1jjHilHbdQQ
                        //console.log("|  ├─ Instance", instanceId, "| offline ids snapshot:", report.o, "→", data);
                        
                        let i_offline = [], i_exited = [], i_pending = [], i_withdrawal = [], i_unknown = [];

                        for(const valObj of data.data){
                            switch(valObj.status){
                                case "active_ongoing": // must be attesting
                                case "active_exiting": // still active, but filed a voluntary request
                                case "active_slashed": // still active, but have a slashed status
                                    i_offline.push(valObj.index);
                                    offline.push(valObj.index);
                                    break;
                                case "exited_unslashed":
                                case "exited_slashed":
                                    i_exited.push(valObj.index);
                                    exited.push(valObj.index);
                                    break;
                                case "pending_initialized":
                                case "pending_queued":
                                    i_pending.push(valObj.index);
                                    pending.push(valObj.index);
                                    break;
                                case "withdrawal_possible":
                                case "withdrawal_done":
                                    i_withdrawal.push(valObj.index);
                                    withdrawal.push(valObj.index);
                                    break;
                                default:
                                    i_unknown.push(valObj.index);
                            }
                        };
                        
                        // Add instance into report
                        const instancePendingCount = i_pending.length,
                              instanceExitedCount = i_exited.length;
                        if(i_offline.length > 0) postObj.AddInstance(instanceId, report.c, i_offline, instanceExitedCount, instancePendingCount);
                        
                        const onlineValidators = report.c - i_offline.length - instanceExitedCount - instancePendingCount - i_withdrawal.length - i_unknown.length;
                        console.log(`|  ├─ ${instanceId} | Online ${onlineValidators}/${report.c} || P: ${instancePendingCount} | E: ${instanceExitedCount} | W: ${i_withdrawal.length} | U: ${i_unknown.length} || Offline (${i_offline.length})`, i_offline);               
                        online += onlineValidators;
                        resolve();
                    });
                });
                promises.push(promise);
            }

            Promise.all(promises)
            .then(() => {
                console.log(`|  └─ Sumarization: online ${online}/${total} | offline (${offline.length}): ${offline.toString()}`);

                if (app.config.detailedLog) console.log('├─ OfflineTracker_periodesCache:', app.offlineTracker_periodesCache);
                
                console.log("├─", postObj);

                if(!app.config.postData.enabled) return;
                
                postObj = JSON.stringify(postObj);

                if(app.config.postData.encryption.active) {
                    postObj = app.ExtraEncryption(postObj);
                    console.log("├─ Data encrypted to", postObj);
                }

                app.HttpsRequest({
                    hostname: app.config.postData.server.hostname,
                    path: `${app.config.postData.server.path}?n=${app.config.chain}&t=${app.config.api_token}`+(app.config.server_id ? `&s=${app.config.server_id}` : ''),
                    port: app.config.postData.server.port,
                    method: 'POST',
                    headers: {
                        'Content-Type': (app.config.postData.encryption.active) ? 'text/plain' : 'application/json',
                        'Content-Length': postObj.length
                    }
                }, postObj, function(err, res){
                    if(err) console.log(err);
                    console.log(`└── ${now} MonitorValidators | completed in ${totalProcessingTime}ms`, res);
                    app.isRunning = false;
                });
            })
            .catch((err) => {
                console.error("Error:", err);
            });
            
        });
    }

    ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb){
        const instanceIdentificator = app.instances.ids_list[instanceIndex];
        const instanceData = app.config.pubKeysList[instanceIdentificator]; // from file
        const instancePubKeys = instanceData.v;

        const indexesNumToRequest = (pubKeyStartIndex + app.config.indexesBanch <= instanceData.c) ? ((app.config.indexesBanch <= instanceData.c) ? app.config.indexesBanch : instanceData.c) : (instanceData.c - pubKeyStartIndex);
        const endIndex = pubKeyStartIndex + indexesNumToRequest;
        const validatorIndexes = instancePubKeys.slice(pubKeyStartIndex, endIndex);

        if(app.config.detailedLog) console.log("ProcessCheck", instanceIndex, pubKeyStartIndex, validatorIndexes);

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
                    if(app.offlineTracker_periodesCache.OfflineValidator(validatorPubId,epochNumber) >= app.config.trigger_numberOfPeriodesOffline) {
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

            pubKeyStartIndex += app.config.indexesBanch;
            //if(app.config.detailedLog) console.log(`pubKeyStartIndex increased to ${pubKeyStartIndex} | endIndex === instanceData.c || ${endIndex} === ${instanceData.c} =>`, (endIndex === instanceData.c));
            if(endIndex === instanceData.c) {
                 instanceIndex++
                 pubKeyStartIndex = 0;
                 //console.log(`instanceIndex increased to ${instanceIndex} | pubKeyStartIndex reseted to ${pubKeyStartIndex}`);
            }

            if(instanceIndex === app.instances.ids_list.length) return cb();
            app.ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb);
        });
    }

    RecognizeChain(cb){
        const options = {
            hostname: 'localhost',
            port: app.config.beaconChainPort,
            path: `/eth/v1/config/spec`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        this.HttpRequest(options, null, function(err,resp){
            if(err) return cb(err);
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
            port: app.config.beaconChainPort,
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
            port: app.config.beaconChainPort,
            path: `/eth/v1/validator/liveness/${epochNumber}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };
        this.HttpRequest(options, body, cb);
    }

    GetValidatorsState(pubIdsArr, cb){
        if(pubIdsArr.length === 0) return cb(null, {"data":[]});

        const body = JSON.stringify({ ids: pubIdsArr/*pubIdsArr.map(String)*/} );
        
        const options = {
            hostname: 'localhost',
            port: app.config.beaconChainPort,
            path: `/eth/v1/beacon/states/head/validators`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };

        //console.log("GetValidatorsState | postBody:", options, body);

        this.HttpRequest(options, body, function(err,data){
            //console.log(err, data);
            if(err) return cb(err, null);
            try {
                return cb(null, JSON.parse(data));
            } catch(e){
                return cb(e, null);
            }
        });
    };

    ExtraEncryption(strData){
        var cipher = crypto.createCipheriv('aes-256-cbc', app.config.postData.encryption.key, app.config.postData.encryption.iv),
        crypted = cipher.update(strData, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    }

    DataDecryption(encData){
        var decipher = crypto.createDecipheriv('aes-256-cbc', app.config.postData.encryption.key, app.config.postData.encryption.iv),
        decrypted = decipher.update(encData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    LoadPubKeysListSync() {
        const filePath = path.join(__dirname, app.config.pubKeysListPath);
        try {
            const data = fs.readFileSync(filePath, "utf8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error reading file:", error);
            return null;
        }
    }

    cleanUpAndExit() {
        console.log("exiting");
        try {
            clearInterval(app.cron);

        } catch(e){ console.log(e); }
        // exit services
        process.exit(0);
    }
}

// each 60 seconds = 1 epoch
app = new MonitorValidators();
app.RecognizeChain(function(err){
    if(err) return console.error(err);
    console.log("└─ Config loaded from arguments:", app.config);
    app.CronWorker();
    app.Process();
});

//console.log(JSON.parse(new MonitorValidators().DataDecryption(new MonitorValidators().ExtraEncryption(JSON.stringify({"i1":[1,2,3,4,5],"i6":[7,8,9,10]})))));