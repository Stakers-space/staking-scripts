// Version 1.0.8
const pubKeysList = require("./public_keys_testlist.json");
const beaconChainPort = 9596;

// script variables and resources
const pubKeys_instances = Object.keys(pubKeysList);
console.log("pubKeys_instances:", pubKeys_instances);

const http = require('http');
var app = null;

class MonitorValidators {
    constructor(){
        this.indexesBanch = 100;
        this.isRunning = false;
        this.aggregatedStates = null;
        app = this;
    }

    CronWorker(){
        //this.cron = setInterval(function(){
            if(!this.isRunning) this.PromptManagerScript();
        //}, 60000);
    }

    PromptManagerScript(){
        this.isRunning = true;
        this.aggregatedStates = {};
        this.startTime = new Date().getTime();
        console.log(`${this.startTime} Starting MonitorValidators iteration`);
        this.GetLatestBlockNumber(function(err,resp){            
            // parse data
            try { resp = JSON.parse(resp); } catch(e){ err = e; }
            if(err) {
                console.log(err);
                return;
            }
            
            console.log(resp);
            console.log(resp["data"][0]);
            const blockNumber = resp["data"][0].header.message.slot; // replace to block
            console.log(`├─ latest block: ${blockNumber}`);
            // Process Check
            app.ProcessCheck(0,0, blockNumber, function(err){
                if(err) {
                   console.error(err); 
                   return;
                }
                const now = new Date().getTime();
                const totalProcessingTime = now - app.startTime;
                console.log(`${now} MonitorValidators iteration completed in ${totalProcessingTime}`);

                console.log("Posting aggregated data");
                app.isRunning = false;
            });
        });
    }

    ProcessCheck(instanceIndex, pubKeyStartIndex, blockNumber, cb){
        const instanceData = pubKeysList[pubKeys_instances[instanceIndex]];
        const instancePubKeys = instanceData.v;

        const indexesNumToRequest = (pubKeyStartIndex + this.indexesBanch <= instanceData.c) ? ((this.indexesBanch <= instanceData.c) ? this.indexesBanch : instanceData.c) : (instanceData.c - pubKeyStartIndex);
        const endIndex = pubKeyStartIndex + indexesNumToRequest;
        const validatorIndexes = instancePubKeys.slice(pubKeyStartIndex, endIndex);

        // Get data from beacon api
        this.GetValidatorLivenessState(validatorIndexes, blockNumber, function(err,resp){
             // parse data
             try { resp = JSON.parse(resp); } catch(e){ err = e; }
             if(err) {
                return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
            }

            // processResponse aggregation
            console.log(resp);
            // app.aggregatedStates

            pubKeyStartIndex += app.indexesBanch;
            //console.log(`pubKeyStartIndex increased to ${pubKeyStartIndex} | endIndex === instanceData.c || ${endIndex} === ${instanceData.c} =>`, (endIndex === instanceData.c));
            if(endIndex === instanceData.c) {
                 instanceIndex++
                 pubKeyStartIndex = 0;
                 console.log(`instanceIndex increased to ${instanceIndex} | pubKeyStartIndex reseted to ${pubKeyStartIndex}`);
            }
            //console.log(`compare | instanceIndex === pubKeys_instances.length || ${instanceIndex} === ${pubKeys_instances.length} =>`, (instanceIndex === pubKeys_instances.length));
            if(instanceIndex === pubKeys_instances.length) {
                 return cb();
            } else {
                app.ProcessCheck(instanceIndex, pubKeyStartIndex, blockNumber, cb);
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

    GetLatestBlockNumber(cb){
        const options = {
            hostname: 'localhost',
            port: beaconChainPort,
            path: `/eth/v1/beacon/headers`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        this.HttpRequest(options, null, cb);
    }

    GetValidatorLivenessState(validatorIndexes, blockNumber, cb) {
        const body = JSON.stringify(validatorIndexes);
        const options = {
            hostname: 'localhost',
            port: beaconChainPort,
            path: `/eth/v1/validator/liveness/${blockNumber}`, // block 1042840
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };
        this.HttpRequest(options, body, cb);
    }

    Exit(){
        clearInterval(cronInterval);
    }
}

// each 60 seconds = 1 block
new MonitorValidators().CronWorker();

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