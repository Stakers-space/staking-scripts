// Version 1.0.12
const pubKeysList = require("./public_keys_testlist.json");
const beaconChainPort = 9596;

// script variables and resources
const pubKeys_instances = Object.keys(pubKeysList);

const http = require('http');
var app = null;


class InstanceReportDataModel {
    constructor(){
        this.c = 0; // number of checked calidators
        this.o = []; // list of offline indexes
    }
}

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
            const epochNumber = resp["data"]["current_justified"].epoch;
            console.log(`├─ epoch: ${epochNumber}`);
            // Process Check
            app.ProcessCheck(0,0, epochNumber, function(err){
                if(err) {
                   console.error(err); 
                   return;
                }
                const now = new Date().getTime();
                const totalProcessingTime = now - app.startTime;
                //console.log("Aggregated result:", app.aggregatedStates);

                // generate post object
                var postObj = {};

                for (const [instance, report] of Object.entries(app.aggregatedStates)) {
                    const offlineValidators = report.o.length,
                          onlineValidators = report.c - offlineValidators;
                    console.log(`├─ ${instance} | online ${onlineValidators}/${report.c} | offline (${offlineValidators}): ${report.o}`);
                    postObj[instance] = report.o;
                }

                console.log("├─ Posting aggregated data", postObj);
                app.isRunning = false;
                console.log(`└── ${now} MonitorValidators | completed in ${totalProcessingTime}`);
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
             try { resp = JSON.parse(resp).data; } catch(e){ err = e; }
             if(err) {
                return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
            }

            // processResponse aggregation
            //console.log(resp);
            // iterate over val indices
            const valIndexesL = resp.length;
            for(var i=0;i<valIndexesL;i++){
                app.aggregatedStates[instanceIdentificator].c++;
                if(!resp[i].is_live) app.aggregatedStates[instanceIdentificator].o.push(resp[i].index);
            }
            
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

    Exit(){
        clearInterval(cronInterval);
    }
}

// each 60 seconds = 1 epoch
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