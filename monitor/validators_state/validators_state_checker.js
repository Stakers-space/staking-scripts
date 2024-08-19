// Version 1.0.24

class Config {
    constructor(){
        this.pubKeysList = require("./public_keys_testlist.json");
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
    }
}
const config = new Config();

const crypto = require('crypto');
const http = require('http');
const https = require('https');
// script variables and resources
const pubKeys_instances = Object.keys(config.pubKeysList);
var app = null;

class InstanceReportDataModel {
    constructor(){
        this.c = 0; // number of checked validators
        this.o = []; // array of offline indexes of type StateCache extended for pubId
    }
}

class StateCache {
    constructor(){}
    OfflineValidator(pubId, epoch){
        if(this[pubId]){
            this[pubId].d++;
        } else {
            this[pubId] = {
                i: pubId,
                e: epoch,
                d: 1
            }
        }
        return this[pubId].d;
    }
    OnlineValidator(pubId){
        if(this[pubId]) delete this[pubId];
    }
}

class PostObjectDataModel {
    constructor(epochNumber){
        this.acc = 0;
        this.epoch = epochNumber;
    }
    AddInstance(instanceName, instanceValidators, offlineValidators){
        this[instanceName] = {
            v:instanceValidators,
            o:offlineValidators
        }
    }
}

class MonitorValidators {
    constructor(){
        this.isRunning = false;
        this.aggregatedStates = null;
        this.offlineTracker_periodesCache = new StateCache();
        this._lastEpochChecked = 0;
    }

    CronWorker(){
        this.cron = setInterval(function(){
            if(!app.isRunning) {
                // Get Current Epoch
                app.GetFinalityCheckpoint(function(err,resp){
                    try { resp = JSON.parse(resp); } catch(e){ err = e; }
                    if(err) {
                        console.log("GetFinalityCheckpoint err:", err);
                        return null;
                    }
                    const epoch = Number(resp["data"]["current_justified"].epoch);
                    if(epoch && epoch !== app._lastEpochChecked) app.PromptManagerScript(currentEpoch);
                }); 
            }
        }, 45000);
    }

    PromptManagerScript(epochNumber){
        this.isRunning = true;
        this.startTime = new Date().getTime();
        console.log(`${this.startTime} Monitorig state for epoch ${epochNumber}`);

        // define aggregation file
        this.aggregatedStates = {};
        for (const instanceIndex in pubKeys_instances) {
            this.aggregatedStates[pubKeys_instances[instanceIndex]] = new InstanceReportDataModel();
        }

        // Process Check
        app.ProcessCheck(0,0, epochNumber, function(err){
            if(err) {
               console.error("ProcessCheck err:",err); 
               return;
            }
            const now = new Date().getTime();
            const totalProcessingTime = now - app.startTime;
            //console.log("Aggregated result:", app.aggregatedStates);

            // generate post object
            var postObj = new PostObjectDataModel(epochNumber);
            let online = 0,
                total = 0,
                offline = [];

            for (const [instance, report] of Object.entries(app.aggregatedStates)) {
                const offlineValidators = report.o.length,
                      onlineValidators = report.c - offlineValidators;

                // Add instance into report
                if(offlineValidators > 0) postObj.AddInstance(instance, report.c, report.o);

                console.log(`├─ ${instance} | online ${onlineValidators}/${report.c} | offline (${offlineValidators}): ${report.o}`);
                // aggregation
                total += report.c;
                online += onlineValidators;
                if(report.o.length > 0) offline.push(...report.o);
            }

            console.log(`├─ Sumarization: online ${online}/${total} | offline (${offline.length}): ${offline.toString()}`);
            console.log('├─ OfflineTracker_periodesCache:', app.offlineTracker_periodesCache);
            console.log("├─ Posting aggregated data", postObj);
            // removeinstances with no detection
                
            postObj = JSON.stringify(postObj);
            if(config.postData.encryption.active) postObj = app.ExtraEncryption(postObj);

            console.log(`${now} Posting data |`, postObj);
            app.HttpsRequest({
                hostname: config.postData.server.hostname,
                path: config.postData.server.path,
                port: config.postData.server.port,
                method: 'POST',
                headers: {
                    'Content-Type': (config.postData.encryption.active) ? 'text/plain' : 'application/json',
                    'Content-Length': postObj.length
                }
            }, postObj, function(err, res){
                if(err) console.log(err);
                console.log(`└── ${now} MonitorValidators | completed in ${totalProcessingTime}`, res);
                app.isRunning = false;
            });
        });
    }

    ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb){
        const instanceIdentificator = pubKeys_instances[instanceIndex];
        const instanceData = config.pubKeysList[instanceIdentificator];
        const instancePubKeys = instanceData.v;

        const indexesNumToRequest = (pubKeyStartIndex + config.indexesBanch <= instanceData.c) ? ((config.indexesBanch <= instanceData.c) ? config.indexesBanch : instanceData.c) : (instanceData.c - pubKeyStartIndex);
        const endIndex = pubKeyStartIndex + indexesNumToRequest;
        const validatorIndexes = instancePubKeys.slice(pubKeyStartIndex, endIndex);

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
                app.aggregatedStates[instanceIdentificator].c++;
                const validatorPubId = resp[i].index;
                if(!resp[i].is_live) {
                    if(app.offlineTracker_periodesCache.OfflineValidator(validatorPubId,epochNumber) >= config.trigger_numberOfPeriodesOffline) {
                        /**
                         * Increase the number of offline periodes in the row
                         * If higher than defined threshold, push vali index on the list of offline validators
                        */ 
                        app.aggregatedStates[instanceIdentificator].o.push(app.offlineTracker_periodesCache[validatorPubId]);
                    }
                } else {
                    app.offlineTracker_periodesCache.OnlineValidator(validatorPubId);
                }
            }

            pubKeyStartIndex += config.indexesBanch;
            //console.log(`pubKeyStartIndex increased to ${pubKeyStartIndex} | endIndex === instanceData.c || ${endIndex} === ${instanceData.c} =>`, (endIndex === instanceData.c));
            if(endIndex === instanceData.c) {
                 instanceIndex++
                 pubKeyStartIndex = 0;
                 //console.log(`instanceIndex increased to ${instanceIndex} | pubKeyStartIndex reseted to ${pubKeyStartIndex}`);
            }
            //console.log(`compare | instanceIndex === pubKeys_instances.length || ${instanceIndex} === ${pubKeys_instances.length} =>`, (instanceIndex === pubKeys_instances.length));
            if(instanceIndex === pubKeys_instances.length) {
                 return cb();
            } else {
                app.ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb);
            }
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

    Exit(){
        clearInterval(cronInterval);
    }
}

// each 60 seconds = 1 epoch
app = new MonitorValidators();
app.CronWorker();
//console.log(JSON.parse(new MonitorValidators().DataDecryption(new MonitorValidators().ExtraEncryption(JSON.stringify({"i1":[1,2,3,4,5],"i6":[7,8,9,10]})))));

function cleanUpAndExit() {
    console.log("exiting");
    // exit services
    process.exit(0);
}
process.on('SIGTERM', cleanUpAndExit);
process.on('SIGINT', cleanUpAndExit);