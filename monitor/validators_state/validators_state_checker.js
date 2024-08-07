// Version 1.0.19
const pubKeysList = require("./public_keys_testlist.json");
const beaconChainPort = 9596;
const crypto = require('crypto');

// script variables and resources
const pubKeys_instances = Object.keys(pubKeysList);

const http = require('http');
const https = require('https');
var app = null;


class InstanceReportDataModel {
    constructor(){
        this.c = 0; // number of checked validators
        this.o = []; // array of offline indexes
    }
}

class MonitorValidators {
    constructor(){
        this.postDataUrl = {
            hostname: 'stakersspace.azurewebsites.net',
            path: '/api/validator-state'
        };
        this.trigger_numberOfPeriodesOffline = 4;
        this.dataEncryption = {
            active: true,
            key: "(Bh6HN.Oj{r?OO~pE;ot1rKjcS_Ic9yp", // 32-long string
            iv: "ZQMiwj5c9qc<er,l" // 16-long string
        };
        this.indexesBanch = 200;
        this.isRunning = false;
        this.aggregatedStates = null;
        this.offlineTracker_periodesCache = {};
        
        app = this;
    }

    CronWorker(){
        this.cron = setInterval(function(){
            if(!app.isRunning) app.PromptManagerScript();
        }, 60000);
    }

    PromptManagerScript(){
        this.isRunning = true;
        // define aggregation file
        this.aggregatedStates = {};
        for (const instanceIndex in pubKeys_instances) {
            this.aggregatedStates[pubKeys_instances[instanceIndex]] = new InstanceReportDataModel();
        }

        this.startTime = new Date().getTime();
        console.log(`${this.startTime} Starting MonitorValidators iteration`);
        this.GetFinalityCheckpoint(function(err,resp){            
            // parse data
            if(!err) try { resp = JSON.parse(resp); } catch(e){ err = e; }
            if(err) {
                console.log(err);
                return;
            }
            
            //console.log("Epochs",resp);
            const epochNumber = Number(resp["data"]["current_justified"].epoch);
            console.log(`├─ epoch: ${epochNumber}`);
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
                var postObj = {"epoch": epochNumber};
                let online = 0,
                    total = 0,
                    offline = [];

                for (const [instance, report] of Object.entries(app.aggregatedStates)) {
                    const offlineValidators = report.o.length,
                          onlineValidators = report.c - offlineValidators;
                    postObj[instance] = report.o.toString();
                    
                    console.log(`├─ ${instance} | online ${onlineValidators}/${report.c} | offline (${offlineValidators}): ${report.o}`);
                    // aggregation
                    total += report.c;
                    online += onlineValidators;
                    if(report.o.length > 0) offline.push(...report.o);
                }
                console.log(`├─ Sumarization: online ${online}/${total} | offline (${offline.length}): ${offline.toString()}`);
                console.log('├─ OfflineTracker_periodesCache:', app.offlineTracker_periodesCache);

                //console.log("├─ Posting aggregated data", postObj);
                postObj = JSON.stringify(postObj);
                if(app.dataEncryption.active) postObj = app.ExtraEncryption(postObj);

                console.log(`${now} Posting data |`, postObj);
                app.HttpsRequest({
                    hostname: app.postDataUrl.hostname,
                    path: app.postDataUrl.path,
                    port: app.postDataUrl.port,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': postObj.length
                    }
                }, postObj, function(err, res){
                    if(err) console.log(err);
                    console.log(`└── ${now} MonitorValidators | completed in ${totalProcessingTime}`, res);
                    app.isRunning = false;
                });
            });
        });
    }

    ProcessCheck(instanceIndex, pubKeyStartIndex, epochNumber, cb){
        const instanceIdentificator = pubKeys_instances[instanceIndex];
        const instanceData = pubKeysList[instanceIdentificator];
        const instancePubKeys = instanceData.v;

        const indexesNumToRequest = (pubKeyStartIndex + this.indexesBanch <= instanceData.c) ? ((this.indexesBanch <= instanceData.c) ? this.indexesBanch : instanceData.c) : (instanceData.c - pubKeyStartIndex);
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

            if(err) {
                return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
            }

            // processResponse aggregation
            //console.log(resp);
            // iterate over val indices
            const valIndexesL = resp.length;
            for(var i=0;i<valIndexesL;i++){
                app.aggregatedStates[instanceIdentificator].c++;
                if(!resp[i].is_live) {
                    /**
                     * Increase the number of offline periodes in the row
                     * If higher than defined threshold, push vali index on the list of offline validators
                    */ 
                    if(app.offlineTracker_periodesCache[resp[i].index]) {
                        app.offlineTracker_periodesCache[resp[i].index]++;
                    } else {
                        app.offlineTracker_periodesCache[resp[i].index] = 1;
                    }
                    if(app.offlineTracker_periodesCache[resp[i].index] >= app.trigger_numberOfPeriodesOffline) {
                        app.aggregatedStates[instanceIdentificator].o.push(resp[i].index);
                        //delete app.offlineTracker_periodesCache[resp[i].index]; // keep it increasing
                    }
                } else if(app.offlineTracker_periodesCache[resp[i].index]){
                    // reported as online - remove from the offline indexes cache
                    delete app.offlineTracker_periodesCache[resp[i].index];
                }
            }

            pubKeyStartIndex += app.indexesBanch;
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
            port: beaconChainPort,
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
            port: beaconChainPort,
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
        var cipher = crypto.createCipheriv('aes-256-cbc', this.dataEncryption.key, this.dataEncryption.iv),
        crypted = cipher.update(strData, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    }

    DataDecryption(encData){
        var decipher = crypto.createDecipheriv('aes-256-cbc', this.dataEncryption.key, this.dataEncryption.iv),
        decrypted = decipher.update(encData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    Exit(){
        clearInterval(cronInterval);
    }
}

// each 60 seconds = 1 epoch
new MonitorValidators().CronWorker();
//console.log(JSON.parse(new MonitorValidators().DataDecryption(new MonitorValidators().ExtraEncryption(JSON.stringify({"i1":[1,2,3,4,5],"i6":[7,8,9,10]})))));

// Testing
/*app.ProcessCheck(0,0, 0, function(err){
    if(err) {
       console.error(err); 
       return;
    }
    console.log(`${now} MonitorValidators test iteration completed`);
});*/

function cleanUpAndExit() {
    console.log("exiting");
    // exit services
    process.exit(0);
}
process.on('SIGTERM', cleanUpAndExit);
process.on('SIGINT', cleanUpAndExit);